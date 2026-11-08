import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
test('MCP stdio advertises exactly six typed fixture-only tools',async()=>{
  const child=spawn(process.execPath,['mcp.mjs'],{
    cwd:new URL('.',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),
    env:{...process.env,STUDIO_AGENT_TOKEN:'x'.repeat(40)},
    stdio:['pipe','pipe','pipe'],windowsHide:true
  });
  try {
    const output=[];
    const lines=readline.createInterface({input:child.stdout});
    const done=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('MCP_RESPONSE_TIMEOUT')),2500);
      lines.on('line',line=>{
        output.push(JSON.parse(line));
        if(output.length===2){clearTimeout(timeout);resolve();}
      });
      child.on('error',reject);
    });
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',
      params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'0.1'}}})+'\n');
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}})+'\n');
    await done;
    assert.equal(output[0].result.serverInfo.name,'nomadic-world-studio-fixture');
    const names=output[1].result.tools.map(x=>x.name);
    assert.deepEqual(names,['world_scene_state','world_set_position','world_set_color',
      'world_set_light_intensity','world_undo','world_capture_frame']);
    assert.ok(!names.includes('run_js'));
    assert.ok(!names.includes('read_file'));
    for(const tool of output[1].result.tools){
      assert.equal(tool.inputSchema.additionalProperties,false);
    }
  }finally{child.kill();}
});
