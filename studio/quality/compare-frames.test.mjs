import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const tool=fileURLToPath(new URL('./compare-frames.mjs',import.meta.url));
const image=fileURLToPath(new URL('../../modules/liveworld-forge/tests/evidence/scene-before-agent-edit.png',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
test('CLI produces reproducible data and refuses camera mismatches',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'ngds-visual-gate-cli-'));
 try{
  const raw=await readFile(image);
  const m={schema:'ngds.capture-manifest/1',projectId:'alaska-offshore-visual-fixture',engine:'threejs',sourceSha256:'1'.repeat(64),imageSha256:hash(raw),sceneRevision:9,sceneTime:40,camera:{position:[0,2,18],target:[0,3,0],fov:54},viewport:{width:raw.readUInt32BE(16),height:raw.readUInt32BE(20)},renderer:{backend:'test-only-client-GL'}};
  const a=path.join(tmp,'a.png'),b=path.join(tmp,'b.png'),am=path.join(tmp,'a.json'),bm=path.join(tmp,'b.json');
  await Promise.all([writeFile(a,raw),writeFile(b,raw),writeFile(am,JSON.stringify(m)),writeFile(bm,JSON.stringify(m))]);
  const call=()=>spawnSync(process.execPath,[tool,a,am,b,bm],{encoding:'utf8',timeout:10000});
  let result=call();
  assert.equal(result.status,0,result.stderr);
  let report=JSON.parse(result.stdout);
  assert.equal(report.changedPixels,0);
  assert.equal(report.status,'PIXEL_DIFFERENCE_ONLY_REVIEW_REQUIRED');
  await writeFile(bm,JSON.stringify({...m,camera:{...m.camera,position:[0,2,30]}}));
  result=call();
  assert.equal(result.status,2,result.stderr);
  report=JSON.parse(result.stdout);
  assert.equal(report.status,'BLOCKED_COMPARABILITY');
  assert.ok(report.reasonCodes.includes('CAMERA_POSITION_MISMATCH'));
 }finally{await rm(tmp,{recursive:true,force:true});}
});
test('CLI refuses missing input without fabricating a comparison',()=>{
 const r=spawnSync(process.execPath,[tool,'bad.png','bad.json','bad2.png','bad2.json'],{encoding:'utf8',timeout:10000});
 assert.equal(r.status,1);
 assert.match(r.stderr,/"status":"ERROR"/);
});
