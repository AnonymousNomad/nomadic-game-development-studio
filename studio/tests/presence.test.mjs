import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../../modules/liveworld-forge/server.mjs';
import {createLiveWorldPresenceTransport} from '../adapters/liveworld-presence.mjs';
import {createWorldPresence,validateCameraGoal,inspectFrame,compareObservations} from '../presence-core.mjs';
const H=crypto.createHash('sha256').update('test-project-at-specific-revision').digest('hex');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fixturePath=path.join(path.dirname(fileURLToPath(import.meta.url)),'../../modules/liveworld-forge/tests/evidence/scene-before-agent-edit.png');
const png=await readFile(fixturePath);
const WH=[png.readUInt32BE(16),png.readUInt32BE(20)];
function cfg(overrides={}){return {projectRevision:H,approvalCheck:()=>false,...overrides};}
async function lab(fn){
 const tmp=await mkdtemp(path.join(os.tmpdir(),'ngds-presence-'));
 const token=crypto.randomBytes(32).toString('hex');
 const app=createApp({home:tmp,token});
 await app.ready;
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 const baseUrl='http://127.0.0.1:'+app.server.address().port+'/';
 try{await fn({tmp,baseUrl,token,app,transport:createLiveWorldPresenceTransport({baseUrl,token})});}
 finally{await new Promise(resolve=>app.server.close(resolve));await rm(tmp,{recursive:true,force:true});}
}
async function submitCapture({baseUrl,token,revision,bytes=png}){
 const r=await fetch(baseUrl+'api/capture',{method:'POST',headers:{'x-liveworld-token':token,'content-type':'application/json','origin':baseUrl.slice(0,-1)},body:JSON.stringify({revision,pngBase64:bytes.toString('base64')})});
 return {status:r.status,body:await r.json()};
}
test('no remote server connection including localhost or DNS rebinding',()=>{
 for(const url of ['http://localhost:4321/','https://127.0.0.1:4321/','http://192.168.1.1:4321/','http://127.0.0.1:4321/evil','http://user:pass@127.0.0.1:4321/'])
  assert.throws(()=>createLiveWorldPresenceTransport({baseUrl:url,token:'a'.repeat(30)}),/LOCAL_LOOPBACK_REQUIRED/);
});
test('short/missing token denied',()=>assert.throws(()=>createLiveWorldPresenceTransport({baseUrl:'http://127.0.0.1:1111/',token:'abc'}),/TOKEN_REQUIRED/));
test('invalid goals and degenerate view direction denied',()=>{
 assert.deepEqual(validateCameraGoal({position:[1,1,1],target:[1,1,1]}),['DEGENERATE_CAMERA_DIRECTION']);
 assert.deepEqual(validateCameraGoal({position:[0,1,Infinity],target:[0,0,0]}),['INVALID_CAMERA_GOAL']);
});
test('missing adapter surface or approval gate fail closed',()=>{
 assert.throws(()=>createWorldPresence({transport:{},...cfg()}),/INCOMPLETE_TRANSPORT/);
 assert.throws(()=>createWorldPresence({transport:{readScene(){},readCapture(){},moveCamera(){},undo(){}},projectRevision:H}),/APPROVAL_GATE_REQUIRED/);
});
test('read-only inspector sees actual isolated fixture scene without mutation',async()=>{
 await lab(async({transport})=>{
  const p=createWorldPresence({transport,...cfg()});
  const v=await p.inspect(),after=await transport.readScene();
  assert.equal(v.revision,0);
  assert.deepEqual(v.camera,after.camera);
  assert.ok(v.objects.some(x=>x.id==='cabin'));
  assert.equal(after.revision,0);
 });
});
test('spectator moves are denied without project-scoped authorization',async()=>{
 await lab(async({transport})=>{
  const p=createWorldPresence({transport,...cfg()});
  await assert.rejects(p.steer({position:[3,4,5],target:[0,0,0]},{}),/SPECTATOR_AUTHORIZATION_REQUIRED/);
  assert.equal((await transport.readScene()).revision,0);
 });
});
test('authorized spectator moves camera in fixture and undo restores exact camera',async()=>{
 await lab(async({transport,tmp})=>{
  const p=createWorldPresence({transport,...cfg({approvalCheck:request=>request.grant?.approved===true&&request.projectRevision===H})});
  const before=await p.inspect();
  const move=await p.steer({position:[1,2,3],target:[0,1,0]},{approved:true});
  assert.equal(move.revision,1);
  assert.deepEqual((await p.inspect()).camera,{position:[1,2,3],target:[0,1,0]});
  const saved=JSON.parse(await readFile(path.join(tmp,'scene.json'),'utf8'));
  assert.deepEqual(saved.camera.position,[1,2,3]);
  const undo=await p.undo({approved:true});
  assert.equal(undo.revision,2);
  assert.deepEqual((await p.inspect()).camera,before.camera);
  assert.equal(p.close().movesRemaining,0);
  await assert.rejects(p.inspect(),/SESSION_CLOSED/);
 });
});
test('real HTTP fixture frame can be read and cryptographically matched, but NOT attested native',async()=>{
 await lab(async({baseUrl,token,transport})=>{
  const original=await transport.readScene();
  const result=await submitCapture({baseUrl,token,revision:original.revision});
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal(result.body.sha256,sha(png));
  const p=createWorldPresence({transport,...cfg()});
  const receipt=await p.observe();
  assert.equal(receipt.imageSha256,sha(png));
  assert.equal(receipt.width,WH[0]);assert.equal(receipt.height,WH[1]);
  assert.equal(receipt.verifiedNative,false);
  assert.equal(receipt.status,'UNVERIFIED_CLIENT_CAPTURE');
  const visual=await p.observe({includePixels:true});
  assert.ok(Buffer.isBuffer(visual.imagePng));
  assert.equal(sha(visual.imagePng),visual.imageSha256);
  assert.equal(p.close().observed,true);
 });
});
test('stale frame after camera move fails rather than showing old picture as new',async()=>{
 await lab(async({baseUrl,token,transport})=>{
  assert.equal((await submitCapture({baseUrl,token,revision:0})).status,200);
  const p=createWorldPresence({transport,...cfg({approvalCheck:()=>true})});
  await p.steer({position:[1,2,3],target:[0,1,0]},{approved:true});
  await assert.rejects(p.observe(),/CAPTURE_NOT_BOUND/);
  await p.undo({approved:true});
 });
});
test('fake independent renderer attestation cannot be promoted by submitting JSON',()=>{
 const scene={revision:0,camera:{position:[1,2,3],target:[0,1,0]}};
 const capture={revision:0,width:WH[0],height:WH[1],sha256:sha(png)};
 const expected={revision:0,position:[1,2,3],target:[0,1,0],projectRevision:H};
 assert.throws(()=>inspectFrame({scene,capture,bytes:png,expected,independentVerification:{verified:true,rendererBackend:'NATIVE_GPU'}}),/TRUSTED_CAPTURE_ATTESTATION_NOT_IMPLEMENTED/);
});
test('tampered PNG bytes or metadata reject',()=>{
 const scene={revision:0,camera:{position:[1,2,3],target:[0,1,0]}},expected={revision:0,position:[1,2,3],target:[0,1,0],projectRevision:H};
 const receipt={revision:0,width:WH[0],height:WH[1],sha256:sha(png)};
 const forged=Buffer.from(png);forged[forged.length-3]^=0xff;
 assert.throws(()=>inspectFrame({scene,capture:receipt,bytes:forged,expected}),/CAPTURE_NOT_BOUND/);
 assert.throws(()=>inspectFrame({scene,capture:{...receipt,revision:1},bytes:png,expected}),/CAPTURE_NOT_BOUND/);
});
test('different frames are not automatically improved quality',()=>{
 const a={imageSha256:'a'.repeat(64),width:100,height:100,verifiedNative:false};
 const b={imageSha256:'b'.repeat(64),width:100,height:100,verifiedNative:false};
 const out=compareObservations(a,b);
 assert.equal(out.changed,true);assert.equal(out.comparableNative,false);assert.match(out.notice,/NOT improved artistic quality/);
});
test('different resolutions invalidate A/B visual comparison',()=>{
 assert.throws(()=>compareObservations({imageSha256:'a'.repeat(64),width:10,height:10},{imageSha256:'b'.repeat(64),width:11,height:10}),/FRAME_RESOLUTION_CHANGED/);
});
test('client capture API refuses a stale revision',async()=>{
 await lab(async({baseUrl,token,transport})=>{
  const p=createWorldPresence({transport,...cfg({approvalCheck:()=>true})});
  await p.steer({position:[1,2,3],target:[0,1,0]}, {approved:true});
  const r=await submitCapture({baseUrl,token,revision:0});
  assert.equal(r.status,409);
  await p.undo({approved:true});
 });
});
