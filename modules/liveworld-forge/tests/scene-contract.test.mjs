import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';

const TOKEN = 'TEST_ONLY_NEVER_USE_AS_PRODUCTION_TOKEN_012345';
async function setup(t) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(),'liveworld-test-'));
  const app = createApp({home:tmp,token:TOKEN});
  await app.ready;
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));await fs.rm(tmp,{recursive:true,force:true});});
  const get = async(url)=>{const r=await fetch(base+url);return [r.status,await r.json()];};
  const post = async(command,expectedRevision,opts={})=>{
    const r=await fetch(base+'/api/command',{method:'POST',headers:{'content-type':'application/json',...(opts.token===false?{}:{'x-liveworld-token':TOKEN}),...(opts.origin?{origin:opts.origin}:{})},
      body:JSON.stringify({expectedRevision,command})});
    return [r.status,await r.json()];
  };
  return {app,base,tmp,get,post};
}
test('app starts offline with a genuine imported Scene Forge reference',async t=>{
  const x=await setup(t);const [status,scene]=await x.get('/api/scene');
  assert.equal(status,200);assert.equal(scene.revision,0);
  assert.equal(scene.objects.find(o=>o.id==='cabin').asset,'aframe.glb');
  assert.equal((await x.get('/api/health'))[1].offline,true);
});
test('denies unauthenticated writes, malicious origin, and stale revisions',async t=>{
  const x=await setup(t);
  const cmd={type:'transform',id:'marker',position:[3,1,2]};
  assert.equal((await x.post(cmd,0,{token:false}))[0],401);
  assert.equal((await x.post(cmd,0,{origin:'https://evil.example'}))[0],403);
  assert.equal((await x.post(cmd,1))[1].code,'REVISION_CONFLICT');
  assert.equal((await x.get('/api/scene'))[1].revision,0);
});
test('typed authoring, camera, protected assets, undo and monotonic revisions',async t=>{
  const x=await setup(t);
  const add={type:'add',id:'cody-prop',kind:'sphere',position:[2,1,0],rotation:[0,0,0],scale:[2,2,2],color:'#ffbb00'};
  assert.equal((await x.post(add,0))[1].revision,1);
  assert.equal((await x.post({type:'recolor',id:'cody-prop',color:'#445566'},1))[1].revision,2);
  assert.equal((await x.post({type:'camera',position:[3,4,8],target:[1,2,0]},2))[1].revision,3);
  assert.equal((await x.post({type:'remove',id:'cabin'},3))[1].code,'PROTECTED_REFERENCE');
  assert.equal((await x.post({type:'undo'},3))[1].revision,4);
  const state=(await x.get('/api/scene'))[1];
  assert.deepEqual(state.camera.position,[8,5.5,11]);
  assert.equal(state.objects.find(o=>o.id==='cody-prop').color,'#445566');
  assert.equal(state.revision,4);
});
test('invalid, oversized, traversal-like and fake material edits fail without changing scene',async t=>{
  const x=await setup(t);
  for(const command of [
    {type:'add',id:'../../bad',kind:'box',position:[1,1,1],rotation:[0,0,0],scale:[1,1,1],color:'#ffffff'},
    {type:'add',id:'valid',kind:'box',position:[1,Infinity,1],rotation:[0,0,0],scale:[1,1,1],color:'#ffffff'},
    {type:'add',id:'ok',kind:'box',position:[1,1,1],rotation:[0,0,0],scale:[1,-1,1],color:'#ffffff'},
    {type:'run_shell',command:'rm'},
    {type:'recolor',id:'cabin',color:'#ff0000'}
  ]) {
    const [status]=await x.post(command,0);assert.ok(status>=400);
  }
  assert.equal((await x.get('/api/scene'))[1].revision,0);
});
test('captures distinguish browser-submitted PNG from independently Sightline-verified imagery',async t=>{
  const x=await setup(t);
  // A one by one PNG with correct chunk CRCs. The fixture that was here had
  // an IDAT chunk whose CRC did not match its data, so it was not a sound PNG
  // and the capture endpoint would not store it once it checked the chunks.
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4////fwAJ+wP99djxmgAAAABJRU5ErkJggg==';
  const r=await fetch(x.base+'/api/capture',{method:'POST',headers:{'content-type':'application/json','x-liveworld-token':TOKEN},body:JSON.stringify({revision:0,pngBase64:png})});
  assert.equal(r.status,200);
  const meta=await r.json();assert.equal(meta.revision,0);
  assert.equal(meta.trust,'CLIENT_SUBMITTED_NOT_INDEPENDENTLY_VERIFIED');
  assert.match(meta.sha256,/^[a-f0-9]{64}$/);
  const frame=await fetch(x.base+'/api/capture/latest.png');assert.equal(frame.status,200);
  assert.equal(frame.headers.get('content-type'),'image/png');
});
test('serves vendored, offline Three.js and owned Forge GLB, not arbitrary filesystem',async t=>{
  const x=await setup(t);
  for(const url of ['/vendor/three.min.js','/vendor/glb_loader.js','/assets/aframe.glb','/client.js','/index.html']) {
    const r=await fetch(x.base+url);assert.equal(r.status,200,url);
    assert.ok((await r.arrayBuffer()).byteLength>100,url);
  }
  const r=await fetch(x.base+'/../../Windows/System32/config/SAM');assert.equal(r.status,404);
});
test('scene edits survive restart and token is never exposed by state endpoints',async t=>{
  const x=await setup(t);
  await x.post({type:'transform',id:'marker',position:[5,1,4]},0);
  const saved=JSON.parse(await fs.readFile(path.join(x.tmp,'scene.json'),'utf8'));
  assert.equal(saved.revision,1);assert.deepEqual(saved.objects.find(o=>o.id==='marker').position,[5,1,4]);
  const response=JSON.stringify((await x.get('/api/scene'))[1]);
  assert.equal(response.includes(TOKEN),false);
});
