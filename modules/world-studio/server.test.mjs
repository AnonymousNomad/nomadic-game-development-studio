import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createStudioServer} from './server.mjs';
import {SCENE_ID} from './protocol.mjs';

const AUTH='unit-test-key-'.padEnd(40,'t');
function snap(revision=0){
  return {scene_id:SCENE_ID,revision,renderer:'WebGL Test',
    objects:[{id:'cabin',position:[0,0,0],color:'#ffffff',intensity:null}]};
}
async function fetchJson(base,route,{method='GET',headers={},body}={}){
  const r=await fetch(base+route,{method,headers:{
    ...(body?{'Content-Type':'application/json'}:{}),...headers},
    body:body?JSON.stringify(body):undefined});
  return {status:r.status,body:await r.json()};
}
test('server binds only loopback, returns no direct mutations without session',async()=>{
  const app=createStudioServer({agentToken:AUTH});
  const {url}=await app.start();
  try{
    assert.equal(app.server.address().address,'127.0.0.1');
    const health=await fetchJson(url,'/health');
    assert.equal(health.body.scope,'disposable-scene-only');
    const unauthorized=await fetchJson(url,'/api/state');
    assert.equal(unauthorized.status,401);
    const bridgeBootstrap=await fetchJson(url,'/api/bootstrap');
    assert.equal(bridgeBootstrap.status,200);
    assert.ok(bridgeBootstrap.body.bridge_token.length>=32);
    assert.ok(!JSON.stringify(health).includes(AUTH));
    const invalid=await fetchJson(url,'/api/command',{method:'POST',
      headers:{Authorization:'Bearer '+AUTH},
      body:{action:'undo',scene_id:SCENE_ID,expected_revision:0}});
    assert.equal(invalid.body.error,'BROWSER_NOT_CONNECTED');
  }finally{await app.close();}
});
test('simulated browser: typed agent request, acknowledgement, snapshot and undo',async()=>{
  const app=createStudioServer({agentToken:AUTH});
  const {url}=await app.start();
  try{
    const boot=(await fetchJson(url,'/api/bootstrap')).body;
    const agentHeaders={Authorization:'Bearer '+AUTH};
    const bridgeHeaders={'X-Studio-Bridge':boot.bridge_token};
    let r=await fetchJson(url,'/api/snapshot',{method:'POST',headers:bridgeHeaders,body:snap()});
    assert.equal(r.status,200);
    const current=await fetchJson(url,'/api/state',{headers:agentHeaders});
    assert.equal(current.body.connected,true);
    const cmd={scene_id:SCENE_ID,expected_revision:0,action:'set_color',target:'cabin',value:'#aabbcc'};
    r=await fetchJson(url,'/api/command',{method:'POST',headers:agentHeaders,body:cmd});
    assert.equal(r.status,202);const id=r.body.id;
    const duplicate=await fetchJson(url,'/api/command',{method:'POST',headers:agentHeaders,body:cmd});
    assert.equal(duplicate.body.error,'COMMAND_IN_FLIGHT');
    const requested=await fetchJson(url,'/api/next',{headers:bridgeHeaders});
    assert.equal(requested.body.command.id,id);
    assert.equal(requested.body.command.value,'#aabbcc');
    assert.equal((await fetchJson(url,'/api/next',{headers:bridgeHeaders})).body.command,null);
    r=await fetchJson(url,'/api/report',{method:'POST',headers:bridgeHeaders,
      body:{id,ok:true,reason:'APPLIED',revision:1}});
    assert.equal(r.status,200);
    const premature=await fetchJson(url,'/api/command',{method:'POST',headers:agentHeaders,
      body:{scene_id:SCENE_ID,expected_revision:1,action:'undo'}});
    assert.equal(premature.body.error,'COMMAND_IN_FLIGHT');
    const next={...snap(1),objects:[{...snap().objects[0],color:'#aabbcc'}]};
    r=await fetchJson(url,'/api/snapshot',{method:'POST',headers:bridgeHeaders,body:next});
    assert.equal(r.status,200);
    const stale=await fetchJson(url,'/api/command',{method:'POST',headers:agentHeaders,body:cmd});
    assert.equal(stale.body.error,'REVISION_STALE');
    const undo=await fetchJson(url,'/api/command',{method:'POST',headers:agentHeaders,
      body:{scene_id:SCENE_ID,expected_revision:1,action:'undo'}});
    assert.equal(undo.status,202);
    assert.equal((await fetchJson(url,'/api/result/'+id,{headers:agentHeaders})).body.result.ok,true);
  }finally{await app.close();}
});
test('security negatives: cross origin, wrong Host, unauthorized bridge, invalid JSON',async()=>{
  const app=createStudioServer({agentToken:AUTH});
  const {url}=await app.start();
  try{
    const origin=await fetchJson(url,'/api/state',{headers:{Authorization:'Bearer '+AUTH,Origin:'https://evil.example'}});
    assert.equal(origin.body.error,'ORIGIN_REJECTED');
    // Node fetch may normalize the Host header. Use raw http.request to
    // prove the listener itself rejects a forged Host value.
    const host=await new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port:app.server.address().port,
        path:'/api/state',headers:{Host:'localhost:'+app.server.address().port,
          Authorization:'Bearer '+AUTH}},res=>{
          let data='';res.on('data',c=>data+=c);res.on('end',()=>{
            resolve({status:res.statusCode,body:JSON.parse(data)});
          });
        });req.on('error',reject);req.end();
    });
    assert.equal(host.status,403);
    assert.equal(host.body.error,'HOST_REJECTED');
    const wrong=await fetchJson(url,'/api/snapshot',{method:'POST',body:snap()});
    assert.equal(wrong.body.error,'BRIDGE_AUTH_REQUIRED');
    const bad=await fetchJson(url,'/api/command',{method:'POST',
      headers:{Authorization:'Bearer '+AUTH},body:{scene_id:SCENE_ID,expected_revision:0,action:'run_js',value:'x'}});
    assert.equal(bad.body.error,'ACTION_NOT_ALLOWED');
  }finally{await app.close();}
});

test('bound PNG frame returns real image bytes with hash and unchanged scene revision',async()=>{
  const app=createStudioServer({agentToken:AUTH});
  const {url}=await app.start();
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
  try{
    const bridgeHeaders={'X-Studio-Bridge':(await fetchJson(url,'/api/bootstrap')).body.bridge_token};
    const agentHeaders={Authorization:'Bearer '+AUTH};
    const premature=await fetchJson(url,'/api/frame',{method:'POST',headers:bridgeHeaders,
      body:{revision:0,png_base64:png}});
    assert.equal(premature.status,409);
    await fetchJson(url,'/api/snapshot',{method:'POST',headers:bridgeHeaders,body:snap(0)});
    const cmd=await fetchJson(url,'/api/command',{method:'POST',headers:agentHeaders,
      body:{scene_id:SCENE_ID,expected_revision:0,action:'capture_frame'}});
    assert.equal(cmd.status,202);
    const invalid=await fetchJson(url,'/api/frame',{method:'POST',headers:bridgeHeaders,
      body:{revision:1,png_base64:png}});
    assert.equal(invalid.body.error,'FRAME_INVALID');
    const accepted=await fetchJson(url,'/api/frame',{method:'POST',headers:bridgeHeaders,
      body:{revision:0,png_base64:png}});
    assert.equal(accepted.status,200);
    assert.equal(accepted.body.width,1);
    assert.equal(accepted.body.height,1);
    assert.match(accepted.body.sha256,/^[a-f0-9]{64}$/);
    const report=await fetchJson(url,'/api/report',{method:'POST',headers:bridgeHeaders,
      body:{id:cmd.body.id,ok:true,reason:'FRAME_CAPTURED',revision:0}});
    assert.equal(report.status,200);
    const snapReply=await fetchJson(url,'/api/snapshot',{method:'POST',headers:bridgeHeaders,body:snap(0)});
    assert.equal(snapReply.status,200);
    const image=await fetchJson(url,'/api/frame',{headers:agentHeaders});
    assert.equal(image.body.png_base64,png);
    assert.equal(image.body.revision,0);
    const unauth=await fetchJson(url,'/api/frame');
    assert.equal(unauth.status,401);
    const next=await fetchJson(url,'/api/command',{method:'POST',headers:agentHeaders,
      body:{scene_id:SCENE_ID,expected_revision:0,action:'undo'}});
    assert.equal(next.status,202);
  }finally{await app.close();}
});
