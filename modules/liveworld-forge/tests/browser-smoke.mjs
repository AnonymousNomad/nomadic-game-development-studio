// Isolated browser acceptance: real Edge WebGL scene, server-side edit, live revision, PNG.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createApp } from '../server.mjs';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
const timeout=async(fn,ms=20000)=>{const limit=Date.now()+ms;let error;while(Date.now()<limit){try{const v=await fn();if(v)return v;}catch(e){error=e;}await delay(200);}throw Error('WAIT_TIMEOUT '+(error?.message||''));};
const EDGE=process.env.LWF_EDGE||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOKEN='TEST_BROWSER_ONLY_0cb120e17ac14f6090b22d3e0a855';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lwf-edge-pilot-'));
const app=createApp({home:path.join(temp,'state'),token:TOKEN});await app.ready;
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+app.server.address().port;
const profile=path.join(temp,'edge-profile');
const evidence=path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:\/)/,'$1')),'evidence');
let edge=null,ws=null,seq=0;const pending=new Map(),events=[];
const close=async()=>{
  try{if(ws?.readyState===WebSocket.OPEN)await call('Browser.close',{},4000);}catch{}
  try{ws?.close();}catch{}
  try{edge?.kill();}catch{}
  await new Promise(r=>app.server.close(r));
  // Keep an evidence copy only on success; temporary Edge profile is always disposable.
  await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:500}).catch(()=>{});
};
function call(method,params={},ms=12000){
  return new Promise((resolve,reject)=>{
    const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT '+method));},ms);
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({id,method,params}));
  });
}
try{
  await fs.mkdir(profile,{recursive:true});
  edge=spawn(EDGE,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--disable-gpu','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1120,760','--remote-debugging-port=0','--user-data-dir='+profile,origin],{stdio:'ignore',windowsHide:true});
  const raw=await timeout(async()=>{const b=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8');return b.trim();},20000);
  const port=Number(raw.split(/\s+/)[0]);
  if(!Number.isInteger(port)||port<1024)throw Error('BAD_CDP_PORT');
  const target=await timeout(async()=>{
    const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    return targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
  },15000);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}
    else if(m.method==='Runtime.exceptionThrown')events.push(m.params.exceptionDetails.text);
  };
  await call('Runtime.enable');await call('Page.enable');
  const evaluate=async expr=>{const r=await call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('PAGE_JS_EXCEPTION: '+r.exceptionDetails.text);return r.result.value;};
  const ready=await timeout(async()=>{const x=await evaluate("({ready:!!(window.__LIVEWORLD__&&window.__LIVEWORLD__.getState()),rev:window.__LIVEWORLD__?.getState()?.revision||0,objects:window.__LIVEWORLD__?.getState()?.objects?.length||0,context:!!window.__LIVEWORLD__?.getCaptureContext()?.renderer})");return x?.ready&&x.context&&x.objects>=4?x:false;},25000);
  assert.equal(ready.rev,0);
  const render=await evaluate("({calls:window.__LIVEWORLD__.getCaptureContext().renderer.info.render.calls,triangles:window.__LIVEWORLD__.getCaptureContext().renderer.info.render.triangles,webgl:!!window.__LIVEWORLD__.getCaptureContext().renderer.getContext()})");
  assert.equal(render.webgl,true);assert.ok(render.triangles>20,'actual rendered triangles');
  // The frame before the edit, so the evidence can be compared with the frame
  // after it. The object goes in front of the cabin and toward the camera. At
  // [2,1,2] it was inside the cabin, so the frame could not change however
  // correct the edit was, and the evidence PNG came out byte-identical to the
  // frame before the edit.
  const beforeUrl=await evaluate("window.__LIVEWORLD__.capturePng()");
  await evaluate("window.__PILOT_BEFORE__=window.__LIVEWORLD__.capturePng()");
  const command={type:'add',id:'agent-pilot-prop',kind:'sphere',position:[4.6,1.2,4.6],rotation:[0,0,0],scale:[1.3,1.3,1.3],color:'#ffbb33'};
  const post=await fetch(origin+'/api/command',{method:'POST',headers:{'content-type':'application/json','x-liveworld-token':TOKEN},body:JSON.stringify({expectedRevision:0,command})});
  assert.equal(post.status,200);assert.equal((await post.json()).revision,1);
  const changed=await timeout(async()=>await evaluate("window.__LIVEWORLD__?.getState()?.objects?.some(x=>x.id==='agent-pilot-prop') && window.__LIVEWORLD__?.getState()?.revision===1"),12000);
  assert.equal(changed,true);
  // The frame has to have changed. The scene graph can be right while the
  // picture is stale, and an evidence capture that shows the frame before the
  // edit is not evidence of the edit.
  const frameChanged=await timeout(async()=>await evaluate("window.__LIVEWORLD__.capturePng()!==window.__PILOT_BEFORE__"),15000).then(()=>true).catch(()=>false);
  assert.equal(frameChanged,true,'the canvas changed after the edit');
  const dataUrl=await evaluate("window.__LIVEWORLD__.capturePng()");
  assert.notEqual(dataUrl,beforeUrl,'the captured frame differs from the frame before the edit');
  assert.ok(dataUrl.startsWith('data:image/png;base64,'),'real canvas PNG');
  const pngBase64=dataUrl.slice('data:image/png;base64,'.length);
  const capture=await fetch(origin+'/api/capture',{method:'POST',headers:{'content-type':'application/json','x-liveworld-token':TOKEN},body:JSON.stringify({revision:1,pngBase64})});
  assert.equal(capture.status,200);const meta=await capture.json();
  assert.ok(meta.width>=500&&meta.height>=300);assert.match(meta.sha256,/^[0-9a-f]{64}$/);
  await fs.mkdir(evidence,{recursive:true});
  await fs.writeFile(path.join(evidence,'scene-before-agent-edit.png'),Buffer.from(beforeUrl.split(',')[1],'base64'));
  await fs.writeFile(path.join(evidence,'scene-after-agent-edit.png'),Buffer.from(pngBase64,'base64'));
  const report={status:'PASS',engine:'real Edge WebGL/SwiftShader',timestamp:new Date().toISOString(),sceneRevision:1,initial:ready,render,liveObjectObserved:changed,capture:meta,runtimeExceptions:events,externalModelsUsed:0,scope:'ISOLATED_PROTOTYPE_NOT_STILLWATER_OR_PRODUCTION'};
  await fs.writeFile(path.join(evidence,'browser-smoke.json'),JSON.stringify(report,null,2)+'\n');
  assert.equal(events.length,0,'browser JS exceptions');
  console.log(JSON.stringify(report,null,2));
}catch(e){console.error('LIVEWORLD_BROWSER_SMOKE_FAILED '+e.stack);process.exitCode=1;}
finally{await close();}
