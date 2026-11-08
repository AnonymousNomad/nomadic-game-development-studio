/* Experimental MCP stdio adapter for the disposable World Studio fixture.
   Zero dependencies. Only 5 typed tools; no arbitrary JS or filesystem access.
   Not connected to STILLWATER or the existing Game Studio lane. */
import readline from 'node:readline';
const base=process.env.STUDIO_URL||'http://127.0.0.1:8797';
const token=process.env.STUDIO_AGENT_TOKEN||'';
if(!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(base))
  throw new Error('LOCAL_ONLY_STUDIO_URL_REQUIRED');
if(token.length<32)throw new Error('STUDIO_AGENT_TOKEN_REQUIRED');
const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
async function api(path,method='GET',body) {
  const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});
  const json=await r.json();
  if(!r.ok)throw new Error('Studio HTTP '+r.status+': '+JSON.stringify(json));
  return json;
}
const tool=(name,description,properties,required=[])=>({
  name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}
});
const str=(desc)=>({type:'string',description:desc});
const num=(desc)=>({type:'number',description:desc});
const tools=[
  tool('world_scene_state','Read the isolated fixture scene hierarchy and current material/transform/renderer data',{}),
  tool('world_set_position','Preview a bounded object-position edit. No file is modified.',
    {target:{type:'string',enum:['cabin','spruce-1','spruce-2','stone']},
      x:num('World X'),y:num('World Y'),z:num('World Z')},['target','x','y','z']),
  tool('world_set_color','Preview a material color change. No file is modified.',
    {target:{type:'string',enum:['cabin','spruce-1','spruce-2','stone','ground']},
      color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},['target','color']),
  tool('world_set_light_intensity','Preview a bounded intensity on the fixture sun.',
    {value:{type:'number',minimum:0,maximum:5}},['value']),
  tool('world_undo','Undo the most recent successful temporary edit.',{}),
  tool('world_capture_frame','Capture live synthetic scene pixels as PNG with revision and SHA-256 metadata; read-only.',{})
];
const resultText=(x)=>({content:[{type:'text',text:JSON.stringify(x,null,2)}],isError:false});
async function invoke(name,args={}){
  if(!args||typeof args!=='object'||Array.isArray(args)) throw new Error('ARGUMENTS_INVALID');
  const state=await api('/api/state');
  if(name==='world_scene_state')return resultText(state);
  if(!state.connected)throw new Error('BROWSER_NOT_CONNECTED');
  const cmd={scene_id:state.scene_id,expected_revision:state.snapshot.revision};
  switch(name){
    case 'world_set_position':
      if(!['cabin','spruce-1','spruce-2','stone'].includes(args.target))throw new Error('TARGET_NOT_ALLOWED');
      if(![args.x,args.y,args.z].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=50))
        throw new Error('POSITION_OUT_OF_BOUNDS');
      Object.assign(cmd,{action:'set_position',target:args.target,value:[args.x,args.y,args.z]});break;
    case 'world_set_color':
      if(!['cabin','spruce-1','spruce-2','stone','ground'].includes(args.target))
        throw new Error('TARGET_NOT_ALLOWED');
      if(typeof args.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(args.color))
        throw new Error('COLOR_INVALID');
      Object.assign(cmd,{action:'set_color',target:args.target,value:args.color});break;
    case 'world_set_light_intensity':
      if(typeof args.value!=='number'||!Number.isFinite(args.value)||args.value<0||args.value>5)
        throw new Error('LIGHT_OUT_OF_BOUNDS');
      Object.assign(cmd,{action:'set_light_intensity',target:'sun',value:args.value});break;
    case 'world_undo':Object.assign(cmd,{action:'undo'});break;
    case 'world_capture_frame':Object.assign(cmd,{action:'capture_frame'});break;
    default:throw new Error('TOOL_NOT_AVAILABLE');
  }
  const added=await api('/api/command','POST',cmd);
  const expiry=Date.now()+8000;
  while(Date.now()<expiry){
    await new Promise(resolve=>setTimeout(resolve,200));
    const item=(await api('/api/result/'+added.id)).result;
    if(item){
      if(name==='world_capture_frame' && item.ok){
        const frame=await api('/api/frame');
        if(frame.revision!==item.revision)throw new Error('FRAME_REVISION_CONFLICT');
        return {content:[
          {type:'image',data:frame.png_base64,mimeType:'image/png'},
          {type:'text',text:JSON.stringify({scene_id:state.scene_id,
            revision:frame.revision,sha256:frame.sha256,width:frame.width,height:frame.height})}
        ],isError:false};
      }
      return {content:[{type:'text',text:JSON.stringify(item,null,2)}],isError:!item.ok};
    }
  }
  throw new Error('SCENE_RESULT_TIMEOUT');
}
function respond(id,result,error){
  const packet={jsonrpc:'2.0',id};
  if(error)packet.error={code:-32603,message:String(error.message||error).slice(0,400)};
  else packet.result=result;
  process.stdout.write(JSON.stringify(packet)+'\n');
}
const rd=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
rd.on('line',async line=>{
  let msg;
  try{msg=JSON.parse(line);}catch{respond(null,null,new Error('INVALID_JSON'));return;}
  if(!msg||msg.jsonrpc!=='2.0'||typeof msg.method!=='string'){
    respond(msg?.id??null,null,new Error('INVALID_JSON_RPC'));return;
  }
  if(msg.id===undefined)return; // notifications have no response
  try {
    let value;
    switch(msg.method){
      case 'initialize':
        value={protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},
          serverInfo:{name:'nomadic-world-studio-fixture',version:'0.1.0'}};break;
      case 'ping':value={};break;
      case 'tools/list':value={tools};break;
      case 'tools/call':value=await invoke(msg.params?.name,msg.params?.arguments||{});break;
      default:respond(msg.id,null,new Error('MCP_METHOD_NOT_FOUND'));return;
    }
    respond(msg.id,value);
  }catch(err){respond(msg.id,null,err);}
});
