import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TYPES = ['add','transform','recolor','remove','camera','undo'];
const STATIC = {'/':'index.html','/index.html':'index.html','/client.js':'client.js','/vendor/three.min.js':'vendor/three.min.js','/vendor/glb_loader.js':'vendor/glb_loader.js','/assets/aframe.glb':'assets/aframe.glb'};
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png'};
const initial = () => ({schema:'nomadic.liveworld.scene/1',revision:0,camera:{position:[8,5.5,11],target:[0,1.3,0]},objects:[
  {id:'cabin',kind:'asset',asset:'aframe.glb',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],color:'#ffffff'},
  {id:'marker',kind:'box',position:[4,.8,1],rotation:[0,0,0],scale:[1.6,1.6,1.6],color:'#e0a14a'},
  {id:'tree-a',kind:'cone',position:[-5,2.8,-4],rotation:[0,0,0],scale:[1.8,5.6,1.8],color:'#256749'},
  {id:'tree-b',kind:'cone',position:[6,2.4,-5],rotation:[0,0,0],scale:[1.7,4.8,1.7],color:'#307656'}
]});
const bad = (status, code) => Object.assign(new Error(code),{status,code});
const vec = (a,max=1000) => Array.isArray(a)&&a.length===3&&a.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=max);
const idOK = id => typeof id==='string'&&/^[a-z][a-z0-9_-]{0,47}$/.test(id);
const colorOK = c => typeof c==='string'&&/^#[0-9a-fA-F]{6}$/.test(c);
const hash = buf => createHash('sha256').update(buf).digest('hex');
// PNG chunk integrity: every chunk carries a CRC32 of its own type and data.
// A capture that has been truncated or altered in transit fails this.
const CRC_TABLE=(()=>{const t=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
function crc32(buf){let c=0xffffffff;for(let i=0;i<buf.length;i++)c=CRC_TABLE[(c^buf[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
function pngChunksIntact(buf){
 let offset=8;
 while(offset+12<=buf.length){
  const length=buf.readUInt32BE(offset);
  if(offset+12+length>buf.length)return false;
  const type=buf.toString('ascii',offset+4,offset+8);
  const data=buf.subarray(offset+8,offset+8+length);
  const stored=buf.readUInt32BE(offset+8+length);
  // The CRC covers the chunk's type and its data, not the data alone.
  const covered=Buffer.concat([Buffer.from(type,'ascii'),data]);
  if(crc32(covered)!==stored)return false;
  offset+=12+length;
  if(type==='IEND')return true;
 }
 return false;
}

async function atomic(file,obj) {const tmp=file+'.write';try{await fs.writeFile(tmp,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});await fs.rename(tmp,file);}finally{await fs.rm(tmp,{force:true}).catch(()=>{});}}
function change(old,c) {
  if(!c||typeof c!=='object'||!TYPES.includes(c.type)||c.type==='undo') throw bad(400,'INVALID_COMMAND');
  const s=structuredClone(old);
  if(c.type==='camera'){if(!vec(c.position)||!vec(c.target))throw bad(400,'INVALID_CAMERA');s.camera={position:c.position,target:c.target};return s;}
  if(!idOK(c.id))throw bad(400,'INVALID_ID');
  const found=s.objects.find(o=>o.id===c.id);
  if(c.type==='add'){
    if(found)throw bad(409,'ID_EXISTS');
    if(s.objects.length>=80)throw bad(409,'OBJECT_LIMIT');
    if(!['box','sphere','cone','cylinder'].includes(c.kind)||!vec(c.position)||!vec(c.rotation,7)||!vec(c.scale,50)||c.scale.some(x=>x<=0)||!colorOK(c.color))throw bad(400,'INVALID_OBJECT');
    s.objects.push({id:c.id,kind:c.kind,position:c.position,rotation:c.rotation,scale:c.scale,color:c.color.toLowerCase()});return s;
  }
  if(!found)throw bad(404,'ID_NOT_FOUND');
  if(c.type==='remove'){if(found.kind==='asset')throw bad(403,'PROTECTED_REFERENCE');s.objects=s.objects.filter(o=>o.id!==c.id);return s;}
  if(c.type==='recolor'){if(found.kind==='asset')throw bad(403,'PROTECTED_MATERIAL');if(!colorOK(c.color))throw bad(400,'INVALID_COLOR');found.color=c.color.toLowerCase();return s;}
  if(c.type==='transform'){
    if(!['position','rotation','scale'].some(k=>c[k]!==undefined))throw bad(400,'EMPTY_TRANSFORM');
    for(const k of ['position','rotation','scale'])if(c[k]!==undefined){if(!vec(c[k],k==='rotation'?7:k==='scale'?50:1000)||k==='scale'&&c[k].some(x=>x<=0))throw bad(400,'INVALID_TRANSFORM');found[k]=c[k];}
    return s;
  }
  throw bad(400,'INVALID_COMMAND');
}
async function json(req) {
  if(!/application\/json/i.test(req.headers['content-type']||''))throw bad(415,'JSON_REQUIRED');
  let size=0;const pieces=[];
  for await(const b of req){size+=b.length;if(size>7*1024*1024)throw bad(413,'PAYLOAD_TOO_LARGE');pieces.push(b);}
  try{return JSON.parse(Buffer.concat(pieces).toString('utf8'));}catch{throw bad(400,'MALFORMED_JSON');}
}
function send(res,status,body,type='application/json'){
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'"});
  res.end(type==='application/json'?JSON.stringify(body):body);
}
// The state lives outside the package when LWF_HOME says so. Running the
// server in the package directory used to create a state directory inside it,
// which changed the package under its own checkpoint manifest.
export function createApp({home=process.env.LWF_HOME||path.join(ROOT,'state'),token=process.env.LWF_TOKEN,staticRoot=ROOT}={}){
  if(typeof token!=='string'||token.length<20)throw Error('LWF_TOKEN_REQUIRED_20_CHARS');
  const secret=Buffer.from(token); const state=path.join(home,'scene.json');const snapshots=path.join(home,'history');const captures=path.join(home,'captures');
  let current;let queue=Promise.resolve();const subscribers=new Set();
  const ready=(async()=>{await fs.mkdir(snapshots,{recursive:true});await fs.mkdir(captures,{recursive:true});try{current=JSON.parse(await fs.readFile(state,'utf8'));}catch(e){if(e.code==='ENOENT'){current=initial();await atomic(state,current);}else{throw Error('BAD_SAVED_SCENE: the saved scene at '+state+' is not readable JSON ('+e.message+')');}}if(current.schema!=='nomadic.liveworld.scene/1'||!Number.isSafeInteger(current.revision))throw Error('BAD_SAVED_SCENE');})();
  const authorized=req=>{const token=req.headers['x-liveworld-token'];if(typeof token!=='string')return false;const buf=Buffer.from(token);return buf.length===secret.length&&timingSafeEqual(buf,secret);};
  const push=f=>{const p=queue.then(f);queue=p.catch(()=>{});return p;};
  // How many steps back the scene can be rolled. An agent should be told this
  // rather than discovering it by counting undo calls that fail.
  const undoDepth=async()=>{try{const items=(await fs.readdir(snapshots)).filter(s=>/^[0-9]{8}\.json$/.test(s));return items.length;}catch{return 0;}};
  const notify=()=>{for(const res of subscribers){try{res.write('event: revision\ndata: '+current.revision+'\n\n');}catch{subscribers.delete(res);}}};
  async function edit(body) {
    if(!body||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision!==current.revision)throw bad(409,'REVISION_CONFLICT');
    const cmd=body.command;
    if(!cmd||typeof cmd!=='object')throw bad(400,'INVALID_COMMAND');
    if(cmd.type==='undo'){
      const items=(await fs.readdir(snapshots)).filter(s=>/^[0-9]{8}\.json$/.test(s)).sort();
      if(!items.length)throw bad(409,'NO_UNDO');
      const name=path.join(snapshots,items.at(-1));const prev=JSON.parse(await fs.readFile(name,'utf8'));
      const next={...prev,revision:current.revision+1};
      await atomic(state,next);await fs.unlink(name);current=next;notify();return{ok:true,revision:current.revision,undo:true};
    }
    const next=change(current,cmd);next.revision=current.revision+1;
    await atomic(path.join(snapshots,String(current.revision).padStart(8,'0')+'.json'),current);
    await atomic(state,next);current=next;notify();
    return {ok:true,revision:current.revision,type:cmd.type};
  }
  const server=http.createServer(async(req,res)=>{
    try{
      await ready;
      const host=req.headers.host||'';
      if(!/^127\.0\.0\.1:\d+$/.test(host))throw bad(403,'LOCAL_HOST_ONLY');
      const u=new URL(req.url,'http://127.0.0.1');
      if(req.method==='GET'&&u.pathname==='/api/health')return send(res,200,{ok:true,revision:current.revision,offline:true,models:'provider-agnostic'});
      if(req.method==='GET'&&u.pathname==='/api/scene')return send(res,200,{...current,undoDepth:await undoDepth()});
      if(req.method==='GET'&&u.pathname==='/api/contract')return send(res,200,{schema:'nomadic.liveworld.command/1',types:TYPES,auth:'x-liveworld-token',concurrency:'expectedRevision',note:'Agent-neutral typed commands; never executes submitted code'});
      if(req.method==='GET'&&u.pathname==='/api/events'){
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store',Connection:'keep-alive'});
        subscribers.add(res);res.write('event: revision\ndata: '+current.revision+'\n\n');req.on('close',()=>subscribers.delete(res));return;
      }
      if(req.method==='GET'&&u.pathname==='/api/capture/latest'){
        const b=await fs.readFile(path.join(captures,'latest.json'),'utf8').catch(()=>null);
        if(!b)throw bad(404,'NO_CAPTURE');return send(res,200,JSON.parse(b));
      }
      if(req.method==='GET'&&u.pathname==='/api/capture/latest.png'){
        const b=await fs.readFile(path.join(captures,'latest.png')).catch(()=>null);
        if(!b)throw bad(404,'NO_CAPTURE');return send(res,200,b,'image/png');
      }
      if(req.method==='GET'&&Object.hasOwn(STATIC,u.pathname)){
        const f=path.join(staticRoot,STATIC[u.pathname]);const b=await fs.readFile(f).catch(()=>null);if(!b)throw bad(404,'STATIC_NOT_FOUND');
        return send(res,200,b,mime[path.extname(f)]||'application/octet-stream');
      }
      if(req.method==='POST'&&['/api/command','/api/capture'].includes(u.pathname)){
        if(!authorized(req))throw bad(401,'EDITOR_TOKEN_REQUIRED');
        if(req.headers.origin&&req.headers.origin!=='http://'+host)throw bad(403,'ORIGIN_DENIED');
        const body=await json(req);
        if(u.pathname==='/api/command')return send(res,200,await push(()=>edit(body)));
        return send(res,200,await push(async()=>{
          if(body.revision!==current.revision)throw bad(409,'STALE_CAPTURE');
          if(typeof body.pngBase64!=='string'||body.pngBase64.length>6e6||!/^[a-zA-Z0-9+/=]+$/.test(body.pngBase64))throw bad(400,'CAPTURE_DATA_INVALID');
          const b=Buffer.from(body.pngBase64,'base64');
          if(b.length<24||!b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw bad(400,'CAPTURE_NOT_PNG');
          // The capture is the only evidence an agent gets back, so it has to be
          // internally sound and not merely start with a PNG signature. Every
          // chunk's CRC is checked before the file is stored.
          if(!pngChunksIntact(b))throw bad(400,'CAPTURE_CORRUPT');
          const width=b.readUInt32BE(16),height=b.readUInt32BE(20);
          if(width<1||height<1||width>2560||height>1440)throw bad(400,'CAPTURE_DIMENSIONS');
          const meta={schema:'nomadic.liveworld.capture/1',revision:current.revision,width,height,sha256:hash(b),bytes:b.length,createdAt:new Date().toISOString(),trust:'CLIENT_SUBMITTED_NOT_INDEPENDENTLY_VERIFIED'};
          await fs.writeFile(path.join(captures,'latest.png.tmp'),b);
          await fs.rename(path.join(captures,'latest.png.tmp'),path.join(captures,'latest.png'));
          await atomic(path.join(captures,'latest.json'),meta);return meta;
        }));
      }
      throw bad(404,'NOT_FOUND');
    }catch(e){send(res,e.status||500,{ok:false,code:e.code||'SERVER_FAILURE'});}
  });
  return {server,ready,peek:()=>structuredClone(current)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(!process.env.LWF_TOKEN){console.error('Set LWF_TOKEN to a locally held secret of 20+ characters');process.exit(2);}
  const app=createApp();await app.ready;const port=Number(process.env.LWF_PORT||18788);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('BAD_PORT');
  app.server.listen(port,'127.0.0.1',()=>console.log('LiveWorld Forge: http://127.0.0.1:'+port+' (loopback only)'));
}