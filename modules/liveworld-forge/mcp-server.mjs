// Nomadic LiveWorld Forge stdio MCP server — minimal, model-independent.
import readline from 'node:readline';
const base='http://127.0.0.1:'+(process.env.LWF_PORT||'18788');
const writeEnabled=process.env.LWF_ALLOW_EDITS==='1';
const token=process.env.LWF_TOKEN;
const TOOLS=[
  {name:'lwf_inspect_scene',description:'Read current scene graph, stable IDs, transforms, camera and revision from the local pilot. Does not run code or alter the game.',
    inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'lwf_get_contract',description:'Read the supported typed scene editing contract and safety limits.',
    inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'lwf_last_capture',description:'Read metadata for latest browser-submitted screenshot, including hash and explicit unverified capture trust level.',
    inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'lwf_edit_scene',description:'Apply ONE typed, revision-bound scene command. Disabled unless LWF_ALLOW_EDITS=1 plus local editor token; host Authority and Resource Admission remain separate obligations.',
    inputSchema:{type:'object',properties:{expectedRevision:{type:'integer',minimum:0},command:{oneOf:[
      {type:'object',properties:{type:{const:'add'},id:{type:'string',pattern:'^[a-z][a-z0-9_-]{0,47}$'},kind:{enum:['box','sphere','cone','cylinder']},position:{type:'array',items:{type:'number'},minItems:3,maxItems:3},rotation:{type:'array',items:{type:'number'},minItems:3,maxItems:3},scale:{type:'array',items:{type:'number'},minItems:3,maxItems:3},color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},required:['type','id','kind','position','rotation','scale','color'],additionalProperties:false},
      {type:'object',properties:{type:{const:'transform'},id:{type:'string'},position:{type:'array',items:{type:'number'},minItems:3,maxItems:3},rotation:{type:'array',items:{type:'number'},minItems:3,maxItems:3},scale:{type:'array',items:{type:'number'},minItems:3,maxItems:3}},required:['type','id'],additionalProperties:false},
      {type:'object',properties:{type:{const:'recolor'},id:{type:'string'},color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},required:['type','id','color'],additionalProperties:false},
      {type:'object',properties:{type:{const:'remove'},id:{type:'string'}},required:['type','id'],additionalProperties:false},
      {type:'object',properties:{type:{const:'camera'},position:{type:'array',items:{type:'number'},minItems:3,maxItems:3},target:{type:'array',items:{type:'number'},minItems:3,maxItems:3}},required:['type','position','target'],additionalProperties:false},
      {type:'object',properties:{type:{const:'undo'}},required:['type'],additionalProperties:false}
    ]}},required:['expectedRevision','command'],additionalProperties:false}}
];
function reply(id,result,err){const msg={jsonrpc:'2.0',id};if(err)msg.error=err;else msg.result=result;process.stdout.write(JSON.stringify(msg)+'\n');}
function textResult(data,isError=false){return{content:[{type:'text',text:JSON.stringify(data)}],isError};}
async function get(endpoint){
  const r=await fetch(base+endpoint,{signal:AbortSignal.timeout(4500)});const v=await r.json();if(!r.ok)throw Error(v.code||'HTTP_'+r.status);return v;
}
async function handle(msg){
  const id=msg.id;
  if(msg.method==='notifications/initialized')return;
  if(msg.method==='initialize')return reply(id,{protocolVersion:'2024-11-05',capabilities:{tools:{listChanged:false}},serverInfo:{name:'nomadic-liveworld-forge',version:'0.1.0-pilot'}});
  if(msg.method==='ping')return reply(id,{});
  if(msg.method==='tools/list')return reply(id,{tools:TOOLS});
  if(msg.method==='tools/call'){
    try{
      const name=msg.params?.name,args=msg.params?.arguments||{};
      if(!TOOLS.some(t=>t.name===name)||!args||typeof args!=='object'||Array.isArray(args))throw Error('INVALID_TOOL_ARGUMENTS');
      if(name!=='lwf_edit_scene'&&Object.keys(args).length)throw Error('UNEXPECTED_ARGUMENTS');
      if(name==='lwf_inspect_scene')return reply(id,textResult(await get('/api/scene')));
      if(name==='lwf_get_contract')return reply(id,textResult(await get('/api/contract')));
      if(name==='lwf_last_capture')return reply(id,textResult(await get('/api/capture/latest')));
      if(name==='lwf_edit_scene'){
        if(!writeEnabled||!token||token.length<20)throw Error('MCP_WRITES_DISABLED');
        if(!Number.isSafeInteger(args.expectedRevision)||args.expectedRevision<0||!args.command||typeof args.command!=='object'||Object.keys(args).some(k=>!['command','expectedRevision'].includes(k)))throw Error('INVALID_EDIT_ARGS');
        const r=await fetch(base+'/api/command',{method:'POST',headers:{'content-type':'application/json','x-liveworld-token':token},body:JSON.stringify(args),signal:AbortSignal.timeout(6000)});
        const response=await r.json();if(!r.ok)throw Error(response.code||'EDIT_DENIED');
        return reply(id,textResult(response));
      }
    }catch(e){return reply(id,textResult({code:'TOOL_FAILED',reason:e.message},true));}
  }
  if(id!==undefined)reply(id,null,{code:-32601,message:'Unknown method'});
}
const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of rl){try{const msg=JSON.parse(line);if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('RPC_EXPECTED');await handle(msg);}catch(e){reply(null,null,{code:-32600,message:e.message});}}
