import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const TOKEN='TEST_ONLY_MCP_TOKEN_SUFFICIENTLY_LONG_2026';
async function setup(t,enabled){
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lwf-mcp-test-'));
  const app=createApp({home:tmp,token:TOKEN});await app.ready;
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const mcp=spawn(process.execPath,['mcp-server.mjs'],{cwd:ROOT,env:{...process.env,LWF_PORT:String(app.server.address().port),LWF_TOKEN:TOKEN,LWF_ALLOW_EDITS:enabled?'1':'0'},stdio:['pipe','pipe','pipe']});
  const responses=new Map();let id=0;
  const lines=readline.createInterface({input:mcp.stdout});
  lines.on('line',line=>{try{const data=JSON.parse(line);const pending=responses.get(data.id);if(pending){responses.delete(data.id);clearTimeout(pending.timer);pending.resolve(data);}}catch{}});
  t.after(async()=>{
    mcp.stdin.end();await new Promise(r=>{if(mcp.exitCode!==null)return r();mcp.once('exit',r);setTimeout(()=>{mcp.kill();r();},2000).unref();});
    await new Promise(r=>app.server.close(r));await fs.rm(tmp,{recursive:true,force:true});
  });
  async function call(method,params){
    const reqId=++id;
    return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{responses.delete(reqId);reject(Error('MCP_TIMEOUT'));},4500);
      responses.set(reqId,{resolve,reject,timer});
      mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id:reqId,method,params})+'\n');
    });
  }
  return {call,app};
}
test('MCP is model agnostic and exposes schema plus live scene read-only',async t=>{
  const x=await setup(t,false);
  const init=await x.call('initialize',{});assert.equal(init.result.serverInfo.name,'nomadic-liveworld-forge');
  const listed=await x.call('tools/list',{});assert.equal(listed.result.tools.length,4);
  const scene=await x.call('tools/call',{name:'lwf_inspect_scene',arguments:{}});
  assert.equal(JSON.parse(scene.result.content[0].text).revision,0);
});
test('MCP default denies mutations even when an editor token is configured',async t=>{
  const x=await setup(t,false);
  const result=await x.call('tools/call',{name:'lwf_edit_scene',arguments:{expectedRevision:0,command:{type:'transform',id:'marker',position:[2,2,2]}}});
  assert.equal(result.result.isError,true);
  assert.match(result.result.content[0].text,/MCP_WRITES_DISABLED/);
  assert.equal(x.app.peek().revision,0);
});
test('authorized MCP typed edit updates live scene through same revision-bound API',async t=>{
  const x=await setup(t,true);
  const result=await x.call('tools/call',{name:'lwf_edit_scene',arguments:{expectedRevision:0,command:{type:'transform',id:'marker',position:[2,2,2]}}});
  assert.equal(result.result.isError,false);
  assert.equal(x.app.peek().revision,1);
  const second=await x.call('tools/call',{name:'lwf_edit_scene',arguments:{expectedRevision:0,command:{type:'transform',id:'marker',position:[1,1,1]}}});
  assert.equal(second.result.isError,true);
  assert.equal(x.app.peek().revision,1);
});
