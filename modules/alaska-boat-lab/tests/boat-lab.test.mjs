import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createServer} from '../server.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function read(name){return readFile(path.join(base,name),'utf8');}
test('original scene contract is isolated and not marked production-qualified',async()=>{
 const c=JSON.parse(await read('scene-contract.json'));
 assert.equal(c.id,'alaska-offshore-workboat');assert.equal(c.engine,'threejs');
 assert.ok(c.scope.includes('ocean'));assert.ok(c.scope.includes('boat-hull'));
 assert.match(c.status,/prototype/);assert.ok(c.nonGoals.includes('STILLWATER integration'));
});
test('HTML includes bundled Three.js and shader/app script in order with no CDN',async()=>{
 const html=await read('index.html');
 assert.ok(html.includes('../world-studio/three.min.js'));
 assert.ok(html.includes('src="./app.js"'));
 assert.ok(html.indexOf('three.min.js')<html.indexOf('app.js'));
 assert.equal(/https?:\/\/(?!127\.0\.0\.1)/.test(html),false);
});
test('controls are wired to actual UI elements',async()=>{
 const html=await read('index.html'),js=await read('app.js');
 for(const id of ['wave','exposure','boat-weight','toggle-weather','toggle-freeze','capture','record'])
 assert.ok(html.includes('id="'+id+'"') && js.includes("'"+id+"'"),id);
for(const preset of ['chase','orbit','bridge']) {
 assert.ok(html.includes('id="camera-'+preset+'"'),preset);
 assert.ok(js.includes("'"+preset+"'"),preset);
}
});
test('viewer is engine-owned with inspect telemetry but no source mutation interface',async()=>{
 const js=await read('app.js');
 assert.match(js,/__NGDS_BOAT_LAB__/);assert.match(js,/23m-alaska-shrimp-workboat/);
 assert.equal(/\bfetch\s*\(/.test(js),false);assert.equal(/localStorage|eval\s*\(/.test(js),false);
 assert.match(js,/NOT_INDEPENDENT_EVIDENCE/);
});
test('server only serves explicitly allowlisted files and refuses writes and traversal',async()=>{
 const server=createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 try{
  for(const x of ['/','/index.html','/app.js','/shaders.js','/style.css','/world-studio/three.min.js']){
   const r=await fetch(url+x);assert.equal(r.status,200,x);assert.ok((await r.arrayBuffer()).byteLength>100,x);
  }
  const health=await (await fetch(url+'/__health')).json();assert.equal(health.readOnly,true);
  assert.equal((await fetch(url+'/README.md')).status,404);
  assert.equal((await fetch(url+'/%2e%2e/%2e%2e/README.md')).status,404);
  assert.equal((await fetch(url+'/app.js?cache=no')).status,404);
  assert.equal((await fetch(url+'/app.js',{method:'POST',body:'change source'})).status,405);
  const headers=await fetch(url+'/index.html');assert.match(headers.headers.get('content-security-policy'),/connect-src 'none'/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
