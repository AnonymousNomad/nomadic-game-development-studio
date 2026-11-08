/** Independent CDP smoke inspection against isolated Edge + localhost boat lab.
 * Run only under HEAVY_GPU Resource Admission; creates screenshots in local scratch.
 * Does not call any model, access STILLWATER, or claim formal signed GPU attestation.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from './server.mjs';
const EDGE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT=process.env.NGDS_BOAT_EVIDENCE||'C:/NomadicLabs/Sightline_Scratch/ngds-alaska-boat-lab';
const sha=x=>createHash('sha256').update(x).digest('hex');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class CDP{
 constructor(ws){this.ws=ws;this.next=0;this.requests=new Map();this.consoleErrors=[];this.jsErrors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.id&&this.requests.has(m.id)){const x=this.requests.get(m.id);this.requests.delete(m.id);clearTimeout(x.timer);m.error?x.reject(Error(m.error.message)):x.resolve(m.result);}
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')this.consoleErrors.push(m.params.args?.map(x=>x.value||x.description||'error').join(' ')||'console.error');
  if(m.method==='Runtime.exceptionThrown')this.jsErrors.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'JS exception');
 };
 }
 call(method,params={},timeout=25000){return new Promise((resolve,reject)=>{const id=++this.next;const timer=setTimeout(()=>{this.requests.delete(id);reject(Error('CDP_TIMEOUT '+method));},timeout);this.requests.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));});}
 async eval(expression){const r=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('JS_EXCEPTION: '+(r.exceptionDetails.exception?.description||r.exceptionDetails.text));return r.result.value;}
 close(){try{this.ws.close();}catch{}}
}
async function main(){
 await fs.mkdir(OUT,{recursive:true});
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'ngds-offshore-edge-'));
 const server=createServer(),start=new Date().toISOString();let browser,cdp;const report={schema:'ngds.boat-gpu-smoke/1',startedAt:start,status:'RUNNING',source:'isolated public boat-lab fixture',frames:[],bugs:[]};
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url='http://127.0.0.1:'+server.address().port+'/';
  browser=spawn(EDGE,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--disable-extensions','--use-gl=angle','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--window-size=1280,900','--remote-debugging-port=0','--user-data-dir='+profile,url],{stdio:['ignore','ignore','pipe']});
  let log='';browser.stderr.on('data',d=>{log+=d.toString();});
  let port=null;for(let i=0;i<100&&!port;i++){await wait(200);try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split(/\r?\n/)[0]);}catch{}}
  if(!port)throw Error('EDGE_CDP_PORT_UNAVAILABLE '+log.slice(-350));
  let target;for(let i=0;i<80&&!target;i++){await wait(200);try{const a=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();target=a.find(t=>t.type==='page'&&t.webSocketDebuggerUrl);}catch{}}
  if(!target)throw Error('NO_EDGE_PAGE_TARGET');
  const ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  cdp=new CDP(ws);await cdp.call('Runtime.enable');await cdp.call('Page.enable');
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await cdp.call('Page.navigate',{url});
  let ready=false;
  for(let i=0;i<110;i++){await wait(150);try{ready=await cdp.eval('!!window.__NGDS_BOAT_LAB__ && document.readyState === "complete"');if(ready)break;}catch{}}
  if(!ready)throw Error('BOAT_LAB_PAGE_NOT_INITIALIZED');
  await wait(1600);
  const state=await cdp.eval('window.__NGDS_BOAT_LAB__.inspect()');
  const reportedError=await cdp.eval('document.getElementById("error").hidden?null:document.getElementById("error").textContent');
  if(reportedError)throw Error('PAGE_ERROR: '+reportedError);
  const err=cdp.consoleErrors.filter(s=>/WebGL|shader|compile|ERROR:|Uncaught|THREE/i.test(s));
  if(err.length)throw Error('SHADER_OR_WEBGL_CONSOLE_ERROR: '+err.slice(-3).join(' :: '));
  if(cdp.jsErrors.length)throw Error('JS_ERROR: '+cdp.jsErrors.slice(-3).join(' :: '));
  if(!/NVIDIA/i.test(state.gpu.renderer)||/SwiftShader|Software/i.test(state.gpu.renderer))throw Error('NATIVE_NVIDIA_NOT_CONFIRMED: '+state.gpu.renderer);
  report.backend=state.gpu;
  // Real source content digest, not a filename hash or model claim.
  const sourceFiles=['app.js','shaders.js','index.html','scene-contract.json','../world-studio/three.min.js'];
  const files=await Promise.all(sourceFiles.map(f=>fs.readFile(new URL(f,import.meta.url))));
  const sourceSha256=sha(Buffer.concat(files.flatMap((b,i)=>[Buffer.from(sourceFiles[i]+'\\0'),b,Buffer.from('\\0')])));
  report.sourceSha256=sourceSha256;
  for(const [label,preset] of [['stern','chase'],['orbit','orbit'],['bridge','bridge']]){
   const lock=await cdp.eval('window.__NGDS_BOAT_LAB__.lockFrame(25,'+JSON.stringify(preset)+')');
   if(!lock||lock.preset!==preset||lock.sceneTime!==25)throw Error('FRAME_LOCK_FAILED '+preset);
   await wait(350);
   const obs=await cdp.eval('window.__NGDS_BOAT_LAB__.inspect()');
   const rect=await cdp.eval('(()=>{const r=document.querySelector("#viewport canvas").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()');
   if(rect.width<500||rect.height<400)throw Error('CANVAS_TOO_SMALL');
   const img=await cdp.call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,clip:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,scale:1}});
   const bytes=Buffer.from(img.data,'base64');
   if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('INVALID_SCREENSHOT');
   const filename='alaska-offshore-'+label+'.png';await fs.writeFile(path.join(OUT,filename),bytes);
   const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
   const capture={schema:'ngds.capture-manifest/1',projectId:'ngds-alaska-offshore',engine:'threejs',
    sourceSha256,imageSha256:sha(bytes),sceneRevision:obs.revision,sceneTime:obs.state.t,
    camera:obs.camera,viewport:{width,height},renderer:{backend:state.gpu.renderer},
    evidenceKind:'ISOLATED_CDP_COMPOSITOR_NOT_SIGNED_ATTESTATION',viewPreset:preset,lockedSceneTime:true};
   const metadataFile='alaska-offshore-'+label+'.capture.json';
   await fs.writeFile(path.join(OUT,metadataFile),JSON.stringify(capture,null,2));
   report.frames.push({label,filename,metadataFile,sha256:sha(bytes),bytes:bytes.length,width,height,sceneRevision:obs.revision,sceneTime:obs.state.t,camera:obs.camera,frameMs:obs.frameMs});
  }
  // UI actually supports safe programmatic control, and source is untouched.
  report.controls={setSea4:await cdp.eval('window.__NGDS_BOAT_LAB__.setSea(4)'),snapshot:await cdp.eval('window.__NGDS_BOAT_LAB__.inspect()')};
  // Real browser MediaRecorder smoke: two seconds of actual canvas motion, saved locally.
  try{
   const v=await cdp.eval(`(async()=>{
    const canvas=document.querySelector('#viewport canvas');
    const opts=['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    const mime=opts.find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime)return {supported:false,reason:'NO_MEDIARECORDER_CODEC'};
    const stream=canvas.captureStream(20),rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});
    const pieces=[];rec.ondataavailable=e=>{if(e.data?.size)pieces.push(e.data);};
    rec.start(250);
    await new Promise(r=>setTimeout(r,2000));
    const stopped=new Promise(r=>rec.onstop=r);
    rec.stop();await stopped;
    stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(pieces,{type:mime});
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
    return {supported:true,mime,dataUrl};
   })()`);
   if(v?.supported&&v.dataUrl){
    const bytes=Buffer.from(v.dataUrl.split(',')[1],'base64');
    const ext=v.mime.startsWith('video/mp4')?'mp4':'webm';const name='alaska-offshore-short-proof.'+ext;
    await fs.writeFile(path.join(OUT,name),bytes);
    report.videoCapture={supported:true,mime:v.mime,sha256:sha(bytes),bytes:bytes.length,name};
   }else report.videoCapture={supported:false,reason:v?.reason||'UNKNOWN'};
  }catch(e){report.videoCapture={supported:false,reason:String(e).slice(0,400)};}
  report.consoleErrors=cdp.consoleErrors;report.jsErrors=cdp.jsErrors;
  if(!report.controls.setSea4)throw Error('SEA_CONTROL_FAILED');
  report.status='PASS_NATIVE_BROWSER_SMOKE_NOT_ART_CERTIFIED';
 }catch(e){report.status='FAILED';report.error=String(e.stack||e);process.exitCode=1;}
 finally{
  report.completedAt=new Date().toISOString();
  await fs.writeFile(path.join(OUT,'smoke-report.json'),JSON.stringify(report,null,2)+'\n');
  try{cdp?.close();}catch{}
  if(browser){try{execFileSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{windowsHide:true,timeout:8000,stdio:'ignore'});}catch{try{browser.kill();}catch{}}}
  await new Promise(r=>server.close(()=>r()));
  try{await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:150});}catch{}
  console.log(JSON.stringify({status:report.status,renderer:report.backend?.renderer,frames:report.frames.map(x=>({name:x.filename,sha256:x.sha256,bytes:x.bytes,width:x.width,height:x.height})),error:report.error||null,output:OUT},null,2));
 }
}
await main();