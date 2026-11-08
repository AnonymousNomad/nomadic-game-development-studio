import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {SCENE_ID,validateCommand,validateSnapshot,validateResult} from './protocol.mjs';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY=32*1024;
const MAX_FRAME_BODY=2_500_000;
function send(res,status,obj) {
  const body=JSON.stringify(obj);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});
  res.end(body);
}
async function bodyJson(req,limit=MAX_BODY) {
  let data='',size=0;
  for await(const chunk of req) {
    size+=chunk.length;
    if(size>limit) throw new Error('BODY_TOO_LARGE');
    data+=chunk.toString('utf8');
  }
  try {return JSON.parse(data);} catch {throw new Error('JSON_INVALID');}
}
function staticFile(res,name,type) {
  const bytes=fs.readFileSync(path.join(DIR,name));
  const csp="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':csp,'Cross-Origin-Resource-Policy':'same-origin'});
  res.end(bytes);
}
export function createStudioServer({port=0,agentToken=randomBytes(32).toString('hex')}={}) {
  if(typeof agentToken!=='string' || agentToken.length<32) throw new Error('AGENT_TOKEN_WEAK');
  const bridgeToken=randomBytes(32).toString('hex');
  let snapshot=null, pending=null, seq=0, served=false, frame=null;
  const results=new Map();
  const state=()=>({scene_id:SCENE_ID,connected:!!snapshot, pending:pending?.id??null,
    snapshot, frame_summary:frame?{revision:frame.revision,sha256:frame.sha256,width:frame.width,height:frame.height}:null,
    last_result:results.size ? Array.from(results.values()).at(-1):null});
  const server=http.createServer(async(req,res)=>{
    try {
      const addr=server.address();
      const origin='http://127.0.0.1:'+addr.port;
      const url=new URL(req.url||'/',origin);
      // Local-only non-production pilot: exact Host, Origin and typed commands.
      if(req.headers.host!=='127.0.0.1:'+addr.port)
        return send(res,403,{error:'HOST_REJECTED'});
      if(req.headers.origin && req.headers.origin!==origin)
        return send(res,403,{error:'ORIGIN_REJECTED'});
      if(url.origin!==origin) return send(res,403,{error:'URL_ORIGIN_REJECTED'});
      const agent=req.headers.authorization==='Bearer '+agentToken;
      const bridge=req.headers['x-studio-bridge']===bridgeToken;
      if(req.method==='GET' && url.pathname==='/') return staticFile(res,'index.html','text/html; charset=utf-8');
      if(req.method==='GET' && url.pathname==='/app.js') return staticFile(res,'app.js','text/javascript; charset=utf-8');
      if(req.method==='GET' && url.pathname==='/style.css') return staticFile(res,'style.css','text/css; charset=utf-8');
      if(req.method==='GET' && url.pathname==='/three.min.js') return staticFile(res,'three.min.js','text/javascript; charset=utf-8');
      if(req.method==='GET' && url.pathname==='/health') return send(res,200,{ok:true,scope:'disposable-scene-only',scene_id:SCENE_ID});
      if(req.method==='GET' && url.pathname==='/api/bootstrap')
        return send(res,200,{scene_id:SCENE_ID,bridge_token:bridgeToken}); // same-origin page only
      if(req.method==='GET' && url.pathname==='/api/state') {
        if(!agent) return send(res,401,{error:'AGENT_AUTH_REQUIRED'});
        return send(res,200,state());
      }
      if(req.method==='GET' && url.pathname==='/api/next') {
        if(!bridge) return send(res,401,{error:'BRIDGE_AUTH_REQUIRED'});
        if(!pending || served) return send(res,200,{command:null});
        served=true;
        return send(res,200,{command:pending});
      }
      if(req.method==='POST' && url.pathname==='/api/snapshot') {
        if(!bridge) return send(res,401,{error:'BRIDGE_AUTH_REQUIRED'});
        if(req.headers['content-type']?.split(';')[0]!=='application/json')
          return send(res,415,{error:'JSON_ONLY'});
        const parsed=validateSnapshot(await bodyJson(req));
        if(!parsed.ok) return send(res,422,{error:parsed.reason});
        if(snapshot && parsed.snapshot.revision<snapshot.revision)
          return send(res,409,{error:'SNAPSHOT_STALE'});
        if(pending && results.has(pending.id)) {
          const previous=results.get(pending.id);
          if(parsed.snapshot.revision!==previous.revision)
            return send(res,409,{error:'SNAPSHOT_RESULT_MISMATCH'});
          pending=null;served=false;
        }
        snapshot=parsed.snapshot;
        if(frame && frame.revision!==snapshot.revision)frame=null;
        return send(res,200,{ok:true,revision:snapshot.revision});
      }
      if(req.method==='POST' && url.pathname==='/api/report') {
        if(!bridge) return send(res,401,{error:'BRIDGE_AUTH_REQUIRED'});
        if(req.headers['content-type']?.split(';')[0]!=='application/json')
          return send(res,415,{error:'JSON_ONLY'});
        const parsed=validateResult(await bodyJson(req));
        if(!parsed.ok) return send(res,422,{error:parsed.reason});
        if(!pending || parsed.result.id!==pending.id)
          return send(res,409,{error:'UNEXPECTED_RESULT_ID'});
        const expected=pending.expected_revision+(parsed.result.ok && pending.action!=='capture_frame'?1:0);
        if(parsed.result.revision!==expected)
          return send(res,409,{error:'RESULT_REVISION_MISMATCH'});
        if(results.has(parsed.result.id)) return send(res,409,{error:'RESULT_ALREADY_RECORDED'});
        results.set(parsed.result.id, parsed.result);
        if(results.size>32) results.delete(results.keys().next().value);
        return send(res,200,{ok:true});
      }
      if(req.method==='POST' && url.pathname==='/api/frame') {
        if(!bridge) return send(res,401,{error:'BRIDGE_AUTH_REQUIRED'});
        if(req.headers['content-type']?.split(';')[0]!=='application/json')
          return send(res,415,{error:'JSON_ONLY'});
        if(!pending || pending.action!=='capture_frame' || !snapshot)
          return send(res,409,{error:'FRAME_NOT_REQUESTED'});
        const raw=await bodyJson(req,MAX_FRAME_BODY);
        if(!raw || typeof raw!=='object'
          || !Number.isSafeInteger(raw.revision) || raw.revision!==snapshot.revision
          || typeof raw.png_base64!=='string' || raw.png_base64.length>MAX_FRAME_BODY-100
          || raw.png_base64.length%4!==0
          || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw.png_base64))
          return send(res,422,{error:'FRAME_INVALID'});
        const bytes=Buffer.from(raw.png_base64,'base64');
        if(bytes.length<24 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'
          || bytes.subarray(12,16).toString('ascii')!=='IHDR')
          return send(res,422,{error:'FRAME_NOT_PNG'});
        const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
        if(width<1 || width>1600 || height<1 || height>1200)
          return send(res,422,{error:'FRAME_DIMENSIONS_DENIED'});
        frame={revision:raw.revision,sha256:createHash('sha256').update(bytes).digest('hex'),
          width,height,png_base64:raw.png_base64};
        return send(res,200,{ok:true,sha256:frame.sha256,width,height,revision:frame.revision});
      }
      if(req.method==='GET' && url.pathname==='/api/frame') {
        if(!agent)return send(res,401,{error:'AGENT_AUTH_REQUIRED'});
        if(!frame || !snapshot || frame.revision!==snapshot.revision)
          return send(res,404,{error:'FRAME_NOT_READY'});
        return send(res,200,frame);
      }
      if(req.method==='GET' && url.pathname.startsWith('/api/result/')) {
        if(!agent) return send(res,401,{error:'AGENT_AUTH_REQUIRED'});
        const id=Number(url.pathname.slice('/api/result/'.length));
        if(!Number.isSafeInteger(id)||id<1) return send(res,400,{error:'RESULT_ID_INVALID'});
        return send(res,200,{result:results.get(id)??null});
      }
      if(req.method==='POST' && url.pathname==='/api/command') {
        if(!agent) return send(res,401,{error:'AGENT_AUTH_REQUIRED'});
        if(req.headers['content-type']?.split(';')[0]!=='application/json')
          return send(res,415,{error:'JSON_ONLY'});
        const parsed=validateCommand(await bodyJson(req));
        if(!parsed.ok) return send(res,422,{error:parsed.reason});
        if(!snapshot) return send(res,409,{error:'BROWSER_NOT_CONNECTED'});
        if(pending) return send(res,409,{error:'COMMAND_IN_FLIGHT'});
        if(parsed.command.expected_revision!==snapshot.revision)
          return send(res,409,{error:'REVISION_STALE',current:snapshot.revision});
        pending={id:++seq,...parsed.command};
        served=false;
        return send(res,202,{accepted:true,id:pending.id,scene_id:SCENE_ID});
      }
      return send(res,404,{error:'NOT_FOUND'});
    } catch(err) {
      return send(res,400,{error:err?.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':
        err?.message==='JSON_INVALID'?'JSON_INVALID':'BAD_REQUEST'});
    }
  });
  return {
    server,agentToken,sceneId:SCENE_ID,
    async start(){
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
      return {url:'http://127.0.0.1:'+server.address().port,port:server.address().port};
    },
    async close(){if(server.listening) await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));},
    state
  };
}
if(process.argv[1]&&path.resolve(process.argv[1]).toLowerCase()===path.resolve(fileURLToPath(import.meta.url)).toLowerCase()){
  const argPort=Number(process.env.STUDIO_PORT||'8797');
  if(!Number.isSafeInteger(argPort)||argPort<1024||argPort>65535)throw new Error('PORT_INVALID');
  const app=createStudioServer({port:argPort});
  const started=await app.start();
  console.log('DISPOSABLE_WORLD_STUDIO='+started.url);
  console.log('AGENT_TOKEN='+app.agentToken); // process-only secret; not written to disk
  console.log('NO_PRODUCTION_GAME_CONNECTED=true');
}
