import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const win=process.platform==='win32';
const python=path.join(root,'backend','.venv',win?'Scripts/python.exe':'bin/python');
const apiPort=Number(process.env.DELUXXX_API_PORT || 8000);
const webPort=Number(process.env.DELUXXX_WEB_PORT || 5173);
const api=`http://127.0.0.1:${apiPort}`, web=`http://127.0.0.1:${webPort}`;
const children=[];
let ending=false;
function stop(code=0){
  if(ending)return; ending=true;
  for(const child of children) if(child.exitCode===null){
    if(win) spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
    else child.kill('SIGTERM');
  }
  setTimeout(()=>process.exit(code),400);
}
process.on('SIGINT',()=>stop()); process.on('SIGTERM',()=>stop());
function launch(command,args,cwd){
  const child=spawn(command,args,{cwd,stdio:'inherit',windowsHide:true,env:{...process.env,DELUXXX_API_TARGET:api}});
  children.push(child);
  child.on('error',error=>{console.error(error.message);stop(1);});
  child.on('exit',code=>{if(!ending){console.error(`Un servicio terminó (${code}).`);stop(code||1);}});
}
async function probe(url){try{return await fetch(url,{signal:AbortSignal.timeout(1500)});}catch{return null;}}
async function wait(url,predicate){
  for(let i=0;i<80&&!ending;i++){
    const response=await probe(url);
    if(response?.ok&&await predicate(response))return;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error(`No respondió ${url}. Revisa el error del servicio en esta terminal.`);
}
try{
  if(!existsSync(python))throw new Error('Falta el entorno del backend. Ejecuta Instalar.cmd desde la carpeta del proyecto.');
  if(process.argv.includes('--production')&&!existsSync(path.join(root,'frontend','dist','index.html')))throw new Error('Falta el build. Ejecuta npm run build.');
  const health=await probe(`${api}/api/health`);
  if(health){
    if(!health.ok||(await health.json()).application!=='DeluxXx Sound')throw new Error(`El puerto ${apiPort} pertenece a otro servicio.`);
    console.log(`Backend de DeluxXx Sound ya iniciado: ${api}`);
  }else{
    launch(python,['-m','uvicorn','app.main:app','--host','127.0.0.1','--port',String(apiPort)],path.join(root,'backend'));
    await wait(`${api}/api/health`,async response=>(await response.json()).application==='DeluxXx Sound');
  }
  if(!process.argv.includes('--backend')&&!process.argv.includes('--production')){
    const vite=path.join(root,'frontend','node_modules','vite','bin','vite.js');
    if(!existsSync(vite))throw new Error('Faltan dependencias del frontend. Ejecuta Instalar.cmd.');
    const running=await probe(web);
    if(running){if(!(await running.text()).includes('DeluxXx Sound'))throw new Error(`El puerto ${webPort} pertenece a otra aplicación.`);}
    else launch(process.execPath,[vite,'--host','127.0.0.1','--port',String(webPort),'--configLoader','native'],path.join(root,'frontend'));
    await wait(web,async response=>(await response.text()).includes('DeluxXx Sound'));
  }
  console.log(`DELUXXX_READY ${process.argv.includes('--backend')||process.argv.includes('--production')?api:web}`);
  console.log('Ctrl+C detiene los procesos iniciados por este comando.');
  if(process.argv.includes('--check'))stop();
  else setInterval(()=>{},60000);
}catch(error){console.error(`DeluxXx Sound: ${error.message}`);stop(1);}

