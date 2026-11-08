/**
 * NGDS Visual Quality Gate v0.1 — engine-agnostic evidence comparability and PNG pixel delta.
 * Pure offline Node.js, no model, browser, GPU, networking, filesystem writes or package dependencies.
 * IMPORTANT: delta != improvement. Caller-supplied provenance is metadata, NOT trusted attestation.
 */
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const signature=Buffer.from('89504e470d0a1a0a','hex');
const MAX_PNG_BYTES=24*1024*1024,MAX_PIXELS=12*1024*1024;
const SHA=/^[0-9a-f]{64}$/i;
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const vec3=x=>Array.isArray(x)&&x.length===3&&x.every(finite);
const blocked=(...reasonCodes)=>({status:'BLOCKED_COMPARABILITY',reasonCodes});
const table=(()=>{const a=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;a[i]=c>>>0;}return a;})();
function crc32(data){let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function paeth(a,b,c){const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;}
export function decodePng8(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<45||bytes.length>MAX_PNG_BYTES||!bytes.subarray(0,8).equals(signature))throw Error('INVALID_PNG');
 let off=8,header=null,parts=[],ended=false;
 while(off+12<=bytes.length){
  const length=bytes.readUInt32BE(off),type=bytes.toString('ascii',off+4,off+8),end=off+12+length;
  if(end>bytes.length||length>MAX_PNG_BYTES)throw Error('CORRUPT_CHUNK');
  const chunk=bytes.subarray(off+4,off+8+length);
  if(crc32(chunk)!==bytes.readUInt32BE(off+8+length))throw Error('CRC_MISMATCH');
  const data=bytes.subarray(off+8,off+8+length);
  if(type==='IHDR'){if(header||length!==13)throw Error('INVALID_IHDR');header={width:data.readUInt32BE(0),height:data.readUInt32BE(4),depth:data[8],color:data[9],compression:data[10],filter:data[11],interlace:data[12]};}
  if(type==='IDAT'){if(!header)throw Error('MISSING_IHDR');parts.push(data);}
  if(type==='IEND'){ended=true;off=end;break;}
  off=end;
 }
 if(!ended||off!==bytes.length||!header||!parts.length)throw Error('INCOMPLETE_PNG');
 const {width,height,depth,color,compression,filter,interlace}=header;
 if(width<1||height<1||width>8192||height>8192||width*height>MAX_PIXELS)throw Error('EXCESSIVE_DIMENSIONS');
 if(depth!==8||![2,6].includes(color)||compression!==0||filter!==0||interlace!==0)throw Error('UNSUPPORTED_PNG_FORMAT');
 const channels=color===6?4:3,stride=width*channels,expected=height*(stride+1);
 let packed;try{packed=inflateSync(Buffer.concat(parts),{maxOutputLength:expected});}catch{throw Error('INVALID_DEFLATE');}
 if(packed.length!==expected)throw Error('WRONG_DECOMPRESSED_SIZE');
 const raw=Buffer.alloc(height*stride);
 let source=0;
 for(let y=0;y<height;y++){
  const filterType=packed[source++],base=y*stride,above=base-stride;
  if(filterType>4)throw Error('UNSUPPORTED_PNG_FILTER');
  for(let x=0;x<stride;x++){
   const v=packed[source++],left=x>=channels?raw[base+x-channels]:0,up=y>0?raw[above+x]:0,ul=x>=channels&&y>0?raw[above+x-channels]:0;
   const predict=filterType===0?0:filterType===1?left:filterType===2?up:filterType===3?Math.floor((left+up)/2):paeth(left,up,ul);
   raw[base+x]=(v+predict)&255;
  }
 }
 const rgba=Buffer.alloc(width*height*4);
 for(let i=0,j=0;j<raw.length;i+=4,j+=channels){
  rgba[i]=raw[j];rgba[i+1]=raw[j+1];rgba[i+2]=raw[j+2];rgba[i+3]=channels===4?raw[j+3]:255;
 }
 return {width,height,rgba};
}
export function validateFrameManifest(meta,png){
 if(!obj(meta)||meta.schema!=='ngds.capture-manifest/1')return ['INVALID_CAPTURE_SCHEMA'];
 const errors=[];
 if(typeof meta.projectId!=='string'||meta.projectId.length<3||meta.projectId.length>100)errors.push('INVALID_PROJECT');
 if(typeof meta.engine!=='string'||meta.engine.length<3)errors.push('INVALID_ENGINE');
 if(!SHA.test(meta.sourceSha256||''))errors.push('INVALID_SOURCE_SHA');
 if(!SHA.test(meta.imageSha256||'')||!Buffer.isBuffer(png)||sha(png)!==meta.imageSha256)errors.push('IMAGE_HASH_MISMATCH');
 if(!Number.isSafeInteger(meta.sceneRevision)||meta.sceneRevision<0)errors.push('INVALID_SCENE_REVISION');
 if(!finite(meta.sceneTime))errors.push('INVALID_SCENE_TIME');
 if(!obj(meta.camera)||!vec3(meta.camera.position)||!vec3(meta.camera.target)||!finite(meta.camera.fov))errors.push('INVALID_CAMERA');
 if(!obj(meta.viewport)||!Number.isInteger(meta.viewport.width)||!Number.isInteger(meta.viewport.height)||meta.viewport.width<1||meta.viewport.height<1)errors.push('INVALID_VIEWPORT');
 if(!obj(meta.renderer)||typeof meta.renderer.backend!=='string'||meta.renderer.backend.length<3)errors.push('INVALID_RENDERER');
 return errors;
}
/** Returns only numerical pixel differences, NEVER an aesthetic PASS/FAIL. */
export function compareVisualEvidence({beforePng,afterPng,before,after,threshold=12,region=[0,0,1,1]}={}){
 const e1=validateFrameManifest(before,beforePng),e2=validateFrameManifest(after,afterPng);
 if(e1.length||e2.length)return blocked(...e1.map(e=>'BEFORE_'+e),...e2.map(e=>'AFTER_'+e));
 const errors=[];
 if(before.projectId!==after.projectId||before.engine!==after.engine)errors.push('PROJECT_OR_ENGINE_MISMATCH');
 if(before.renderer.backend!==after.renderer.backend)errors.push('RENDER_BACKEND_MISMATCH');
 if(Math.abs(before.sceneTime-after.sceneTime)>0.0001)errors.push('SCENE_TIME_MISMATCH');
 if(before.viewport.width!==after.viewport.width||before.viewport.height!==after.viewport.height)errors.push('VIEWPORT_MISMATCH');
 for(const k of ['position','target'])if(before.camera[k].some((x,i)=>Math.abs(x-after.camera[k][i])>.001))errors.push('CAMERA_'+k.toUpperCase()+'_MISMATCH');
 if(Math.abs(before.camera.fov-after.camera.fov)>.001)errors.push('CAMERA_FOV_MISMATCH');
 if(!Number.isInteger(threshold)||threshold<0||threshold>255)errors.push('INVALID_THRESHOLD');
 if(!Array.isArray(region)||region.length!==4||!region.every(finite)||region.some(x=>x<0||x>1)||region[0]>=region[2]||region[1]>=region[3])errors.push('INVALID_REGION');
 if(errors.length)return blocked(...errors);
 let a,b;try{a=decodePng8(beforePng);b=decodePng8(afterPng);}catch(x){return blocked('PNG_DECODE_FAILED_'+(x.message||'UNKNOWN'));}
 if(a.width!==b.width||a.height!==b.height||a.width!==before.viewport.width||a.height!==before.viewport.height)return blocked('RASTER_DIMENSION_MISMATCH');
 const x0=Math.floor(region[0]*a.width),y0=Math.floor(region[1]*a.height),x1=Math.ceil(region[2]*a.width),y1=Math.ceil(region[3]*a.height);
 let count=0,changed=0,total=0,minX=a.width,minY=a.height,maxX=-1,maxY=-1,maxD=0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const p=(y*a.width+x)*4,d0=Math.abs(a.rgba[p]-b.rgba[p]),d1=Math.abs(a.rgba[p+1]-b.rgba[p+1]),d2=Math.abs(a.rgba[p+2]-b.rgba[p+2]);
  const delta=d0+d1+d2;total+=delta/3;count++;
  if(Math.max(d0,d1,d2)>threshold){changed++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  maxD=Math.max(maxD,d0,d1,d2);
 }
 return {schema:'ngds.visual-delta/1',status:'PIXEL_DIFFERENCE_ONLY_REVIEW_REQUIRED',
  projectId:before.projectId,engine:before.engine,beforeSha256:before.imageSha256,afterSha256:after.imageSha256,
  comparedPixels:count,changedPixels:changed,changedRatio:Number((changed/count).toFixed(6)),
  meanAbsoluteRgbDelta:Number((total/count).toFixed(4)),maxChannelDelta:maxD,
  changedBounds:changed?{x0:minX,y0:minY,x1:maxX+1,y1:maxY+1}:null,
  independentlyTrustedCapture:false,
  note:'Pixel deltas do not certify that the visual change improved art, gameplay or performance. Manifest provenance is untrusted until independently authenticated.'};
}
