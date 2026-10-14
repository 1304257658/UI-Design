import http from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';

const directory=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(await readFile(path.join(directory,'preview.config.json'),'utf8'));
const root=path.join(directory,'dist');
const args=process.argv.slice(2);
let port=config.port,openPage=null;
for(let i=0;i<args.length;i++){
  if(args[i]==='--port')port=Number(args[++i]);
  else if(args[i]==='--open')openPage=args[++i]||'/';
  else throw new Error(`Unknown argument: ${args[i]}`);
}
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Port must be 0..65535');
if(openPage!==null&&!/^\/(?:[a-zA-Z0-9_./-]*)$/.test(openPage))throw new Error('Invalid page path');
try{await stat(path.join(root,'index.html'));}catch{console.error('Missing dist/index.html. Copy the complete deployment folder first.');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.mp4':'video/mp4'};
let address='';
const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
  if(pathname==='/_preview/status'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:JSON.stringify({id:config.id,root:directory,pid:process.pid,url:address}));return;
  }
  try{
    let file=path.resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    let info=await stat(file);
    if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}
    if(!info.isFile())throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});
    if(req.method==='HEAD'){res.end();return;}
    const stream=createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{if(!res.headersSent){res.writeHead(404);res.end('Not found');}else res.destroy();}
});
function existing(port){return new Promise(resolve=>{
  const request=http.get({hostname:'127.0.0.1',port,path:'/_preview/status',timeout:800},response=>{
    let body='';response.setEncoding('utf8');response.on('data',chunk=>{body+=chunk;if(body.length>8192){request.destroy();resolve(null);}});
    response.on('end',()=>{try{const found=JSON.parse(body);resolve(found.id===config.id&&found.root?.toLowerCase()===directory.toLowerCase()?found:null);}catch{resolve(null);}});
    response.on('error',()=>resolve(null));
  });request.on('timeout',()=>{request.destroy();resolve(null);});request.on('error',()=>resolve(null));
});}
function open(url){
  if(openPage===null)return;
  const target=url+openPage;
  // Run only after the server is ready, with a fixed localhost origin.
  execFile('rundll32.exe',['url.dll,FileProtocolHandler',target],{windowsHide:true},error=>{
    if(error)console.log(`Open this address in your browser: ${target}`);
  });
}
function listen(candidate){return new Promise((resolve,reject)=>{
  const onError=e=>{server.off('listening',onReady);reject(e);};
  const onReady=()=>{server.off('error',onError);resolve();};
  server.once('error',onError);server.once('listening',onReady);server.listen(candidate,'127.0.0.1');
});}
let started=false;
for(let attempt=0;attempt<21&&port+attempt<=65535;attempt++){
  const candidate=port===0?0:port+attempt;
  try{
    await listen(candidate);address=`http://127.0.0.1:${server.address().port}`;
    console.log(`${config.title}\n${address}${openPage||'/'}\nKeep this window open. Press Ctrl+C to stop.`);
    open(address);started=true;break;
  }catch(error){
    if(error.code!=='EADDRINUSE'&&error.code!=='EACCES')throw error;
    const found=await existing(candidate);
    if(found){console.log(`Already running: ${found.url}${openPage||'/'}`);open(found.url);started=true;break;}
    console.log(`Port ${candidate} is unavailable; trying the next port.`);
  }
}
if(!started){console.error('No available preview port. Close another preview or use --port with a different port.');process.exitCode=1;}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));server.closeAllConnections();});
