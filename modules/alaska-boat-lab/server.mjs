/**
 * Read-only NGDS Alaska Offshore fixture server. Local loopback only, no dependencies,
 * no write endpoints, no private game root served, no model/provider access.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const routes=new Map([
 ['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],
 ['/shaders.js','shaders.js'],['/app.js','app.js'],['/scene-contract.json','scene-contract.json'],
 ['/world-studio/three.min.js','../world-studio/three.min.js']
]);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
export function createServer(){
 return http.createServer(async(req,res)=>{
  const hdr={'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
   'cache-control':'no-store','cross-origin-resource-policy':'same-origin',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'none'; object-src 'none'; frame-ancestors 'none'"};
  const send=(status,data,type='text/plain; charset=utf-8')=>{res.writeHead(status,{...hdr,'content-type':type});res.end(data);};
  if(req.method!=='GET'&&req.method!=='HEAD')return send(405,'Method not allowed');
  const raw=req.url||'/';
  if(raw==='/__health')return send(200,JSON.stringify({ok:true,project:'ngds-alaska-offshore',readOnly:true}),mime['.json']);
  if(raw.includes('?')||raw.includes('#')||raw.includes('%'))return send(404,'Not found');
  const name=routes.get(raw);if(!name)return send(404,'Not found');
  try{
   const contents=await fs.readFile(path.resolve(dir,name));
   res.writeHead(200,{...hdr,'content-type':mime[path.extname(name)],'content-length':contents.length});
   if(req.method==='HEAD')res.end();else res.end(contents);
  }catch{send(500,'Bundled scene file unavailable');}
 });
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const port=Number(process.env.NGDS_BOAT_PORT||4177);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
 const server=createServer();
 server.listen(port,'127.0.0.1',()=>{console.log('NGDS Alaska Offshore interactive test: http://127.0.0.1:'+port+'/');console.log('Press Ctrl+C in this window to stop the fixture server.');});
}
