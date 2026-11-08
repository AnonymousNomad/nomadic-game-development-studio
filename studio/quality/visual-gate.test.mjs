import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {decodePng8,validateFrameManifest,compareVisualEvidence} from './visual-gate.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const sig = Buffer.from('89504e470d0a1a0a','hex');
const crcTable = Array.from({length:256},(_,i)=>{let x=i;for(let k=0;k<8;k++) x=x&1?(0xedb88320^(x>>>1)):(x>>>1);return x>>>0;});
function crc32(buf){let x=0xffffffff;for(const b of buf)x=crcTable[(x^b)&255]^(x>>>8);return (x^0xffffffff)>>>0;}
function chunk(type,contents){const t=Buffer.from(type);const len=Buffer.alloc(4);len.writeUInt32BE(contents.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,contents])));return Buffer.concat([len,t,contents,crc]);}
function png(width,height,pixels,filter=0){
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const stride=width*4,row=Buffer.alloc(height*(stride+1));let off=0;
 for(let y=0;y<height;y++){
  row[off++]=filter;
  for(let i=0;i<stride;i++){
   const v=pixels[y*stride+i];
   const left=i>=4?pixels[y*stride+i-4]:0;
   const up=y>0?pixels[(y-1)*stride+i]:0;
   const upperLeft=y>0&&i>=4?pixels[(y-1)*stride+i-4]:0;
   const paeth=(()=>{const p=left+up-upperLeft;const a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upperLeft);return a<=b&&a<=c?left:b<=c?up:upperLeft;})();
   const predictor=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth;
   row[off++]=(v-predictor+256)&255;
  }
 }
 return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(row)),chunk('IEND',Buffer.alloc(0))]);
}
const paint=(w,h,change=false)=>{const arr=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;arr[i]=80+x*3;arr[i+1]=35+y*4;arr[i+2]=120;arr[i+3]=255;}if(change){const i=(2*w+2)*4;arr[i]=255;arr[i+1]=0;arr[i+2]=0;}return arr;};
const scene=(bytes,overrides={})=>({schema:'ngds.capture-manifest/1',projectId:'ngds-alaska-offshore',engine:'threejs',sourceSha256:'d'.repeat(64),imageSha256:hash(bytes),sceneRevision:1,sceneTime:42.15,camera:{position:[6,8,32],target:[0,3,0],fov:54},viewport:{width:4,height:4},renderer:{backend:'ANGLE_D3D11_NVIDIA_CLIENT_REPORTED'},...overrides});

test('decode truecolor 8 bit PNG for all five filter types',()=>{
 const pix=paint(4,4);
 for(let filter=0;filter<=4;filter++){
  const d=decodePng8(png(4,4,pix,filter));assert.equal(d.width,4);assert.equal(d.height,4);assert.deepEqual(d.rgba,pix);
 }
});
test('identical pixel manifests produce zero changed pixels, not aesthetic approval',()=>{
 const img=png(4,4,paint(4,4));
 const report=compareVisualEvidence({beforePng:img,afterPng:img,before:scene(img),after:scene(img)});
 assert.equal(report.status,'PIXEL_DIFFERENCE_ONLY_REVIEW_REQUIRED');assert.equal(report.changedPixels,0);assert.equal(report.comparedPixels,16);assert.equal(report.independentlyTrustedCapture,false);
});
test('single changed pixel gives exact region and bounded score',()=>{
 const a=png(4,4,paint(4,4)),b=png(4,4,paint(4,4,true));
 const r=compareVisualEvidence({beforePng:a,afterPng:b,before:scene(a),after:scene(b)});
 assert.equal(r.changedPixels,1);assert.deepEqual(r.changedBounds,{x0:2,y0:2,x1:3,y1:3});assert.equal(r.changedRatio,0.0625);
});
test('cropped comparison includes the changed pixel only',()=>{
 const a=png(4,4,paint(4,4)),b=png(4,4,paint(4,4,true));
 const r=compareVisualEvidence({beforePng:a,afterPng:b,before:scene(a),after:scene(b),region:[.5,.5,.75,.75]});
 assert.equal(r.changedPixels,1);assert.equal(r.comparedPixels,1);
});
for(const [field,value,code] of [
 ['sceneTime',44,'SCENE_TIME_MISMATCH'],['sceneRevision',999,null],['projectId','wrong-project','PROJECT_OR_ENGINE_MISMATCH'],
 ['viewport',{width:7,height:4},'VIEWPORT_MISMATCH'],['renderer',{backend:'SWIFTSHADER'},'RENDER_BACKEND_MISMATCH'],
 ['camera',{position:[8,8,32],target:[0,3,0],fov:54},'CAMERA_POSITION_MISMATCH'],
 ['camera',{position:[6,8,32],target:[0,3,0],fov:58},'CAMERA_FOV_MISMATCH']
]){
 test('gate checks '+field,()=>{
  const img=png(4,4,paint(4,4));const r=compareVisualEvidence({beforePng:img,afterPng:img,before:scene(img),after:scene(img,{[field]:value})});
  if(code)assert.equal(r.status,'BLOCKED_COMPARABILITY',code),assert.ok(r.reasonCodes.includes(code),JSON.stringify(r));
  else assert.equal(r.sceneRevision,undefined); // revision increments are expected for a legal edit
 });
}
test('tampered frame digest is explicitly rejected',()=>{
 const a=png(4,4,paint(4,4)),b=png(4,4,paint(4,4,true));
 const r=compareVisualEvidence({beforePng:a,afterPng:b,before:scene(a),after:scene(b,{imageSha256:hash(a)})});
 assert.equal(r.status,'BLOCKED_COMPARABILITY');assert.ok(r.reasonCodes.includes('AFTER_IMAGE_HASH_MISMATCH'));
});
test('CRC corruption cannot be silently decoded',()=>{
 const img=png(4,4,paint(4,4));const bad=Buffer.from(img);bad[40]^=1;
 assert.throws(()=>decodePng8(bad),/CRC_MISMATCH|INVALID_DEFLATE/);
});
test('invalid ROI cannot cause a false pass',()=>{
 const a=png(4,4,paint(4,4)),r=compareVisualEvidence({beforePng:a,afterPng:a,before:scene(a),after:scene(a),region:[0,0,0,1]});
 assert.equal(r.status,'BLOCKED_COMPARABILITY');assert.ok(r.reasonCodes.includes('INVALID_REGION'));
});
test('decode a real separately captured Edge screenshot when explicitly provided', {skip:!process.env.NGDS_QUALITY_TEST_PNG}, async()=>{
 const filename=process.env.NGDS_QUALITY_TEST_PNG;
 const raw=await readFile(filename);
 const a=decodePng8(raw);assert.equal(a.width,1280);assert.equal(a.height,900);
 const m=scene(raw,{viewport:{width:1280,height:900},camera:{position:[0,0,1],target:[0,0,0],fov:54}});
 assert.deepEqual(validateFrameManifest(m,raw),[]);
 const r=compareVisualEvidence({beforePng:raw,afterPng:raw,before:m,after:m});
 assert.equal(r.changedPixels,0);assert.equal(r.comparedPixels,1152000);
});
