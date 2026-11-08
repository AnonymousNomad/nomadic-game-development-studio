// Provider-neutral terminal adapter: ANY agent with authorized local shell may use it.
// No model-specific SDK, browser credential or cloud API required.
import fs from 'node:fs/promises';
const BASE='http://127.0.0.1:'+(process.env.LWF_PORT||'18788');
const [action,argument]=process.argv.slice(2);
const help='Usage: node agent-cli.mjs inspect | contract | capture-meta | edit <command.json> | capture <new-output.png>';
async function get(url){
  const r=await fetch(BASE+url);const body=await r.json();
  if(!r.ok)throw Error(body.code||'HTTP_'+r.status);return body;
}
async function main(){
  if(action==='inspect'){console.log(JSON.stringify(await get('/api/scene'),null,2));return;}
  if(action==='contract'){console.log(JSON.stringify(await get('/api/contract'),null,2));return;}
  if(action==='capture-meta'){console.log(JSON.stringify(await get('/api/capture/latest'),null,2));return;}
  if(action==='capture'){
    if(!argument)throw Error(help);
    const r=await fetch(BASE+'/api/capture/latest.png');if(!r.ok)throw Error('NO_CAPTURE');
    await fs.writeFile(argument,Buffer.from(await r.arrayBuffer()),{flag:'wx'});console.log('SAVED '+argument);return;
  }
  if(action==='edit'){
    if(!argument)throw Error(help);
    const token=process.env.LWF_TOKEN;if(!token||token.length<20)throw Error('LWF_TOKEN_REQUIRED');
    const text=await fs.readFile(argument,'utf8');
    const command=JSON.parse(text);
    const scene=await get('/api/scene');
    const r=await fetch(BASE+'/api/command',{method:'POST',
      headers:{'Content-Type':'application/json','x-liveworld-token':token},
      body:JSON.stringify({expectedRevision:scene.revision,command})});
    const body=await r.json();if(!r.ok)throw Error(body.code||'EDIT_FAILED');
    console.log(JSON.stringify(body,null,2));return;
  }
  throw Error(help);
}
main().catch(e=>{console.error('AGENT_CLI_ERROR: '+e.message);process.exitCode=1;});
