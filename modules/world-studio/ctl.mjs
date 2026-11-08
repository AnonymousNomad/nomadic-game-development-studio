/* Typed local agent client. Pass STUDIO_AGENT_TOKEN via environment or use
   any MCP client to call /api/state and /api/command with Bearer auth.
   No shell or game-source authority is exposed by this interface. */
const base=process.env.STUDIO_URL||'http://127.0.0.1:8797';
const token=process.env.STUDIO_AGENT_TOKEN;
if(!token || token.length<32)throw new Error('STUDIO_AGENT_TOKEN_REQUIRED');
if(!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(base))
  throw new Error('LOCAL_URL_REQUIRED');
const [operation,target,...rest]=process.argv.slice(2);
if(!['state','position','color','light','undo','capture'].includes(operation))
  throw new Error('Usage: node ctl.mjs state | position <object> <x> <y> <z> | color <object> <#RRGGBB> | light sun <intensity> | undo | capture');
const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
async function api(route,method='GET',body=undefined){
  const r=await fetch(base+route,{method,headers,body:body?JSON.stringify(body):undefined});
  const data=await r.json();
  if(!r.ok)throw new Error('HTTP '+r.status+' '+JSON.stringify(data));
  return data;
}
const snapshot=await api('/api/state');
if(operation==='state') {console.log(JSON.stringify(snapshot,null,2));process.exit(0);}
if(!snapshot.connected)throw new Error('BROWSER_NOT_CONNECTED');
const s=snapshot.snapshot;
const request={scene_id:s.scene_id,expected_revision:s.revision};
switch(operation){
  case 'position':
    if(rest.length!==3)throw new Error('POSITION_REQUIRES_THREE_NUMBERS');
    Object.assign(request,{action:'set_position',target,value:rest.map(Number)});break;
  case 'color':
    Object.assign(request,{action:'set_color',target,value:rest[0]});break;
  case 'light':
    Object.assign(request,{action:'set_light_intensity',target,value:Number(rest[0])});break;
  case 'undo':request.action='undo';break;
  case 'capture':request.action='capture_frame';break;
}
const enqueued=await api('/api/command','POST',request);
console.log('ACCEPTED '+enqueued.id);
const start=Date.now();
while(Date.now()-start<8000){
  await new Promise(resolve=>setTimeout(resolve,200));
  const result=await api('/api/result/'+enqueued.id);
  if(result.result){
    console.log(JSON.stringify(result.result,null,2));
    if(operation==='capture' && result.result.ok){
      const frame=await api('/api/frame');
      console.log('FRAME_SHA256='+frame.sha256+' WIDTH='+frame.width+' HEIGHT='+frame.height+' REVISION='+frame.revision);
    }
    if(!result.result.ok)process.exitCode=1;
    break;
  }
}
if(Date.now()-start>=8000)throw new Error('NO_SCENE_ACK_WITHIN_8S');
