/* Prisma Studio — serviço de remoção de fundo local, com pesos e motor incluídos.
 * Carrega apenas sob demanda, funciona em file:// e encerra a inferência ao cancelar.
 */
(function(){
 'use strict';const PS=window.PS,root=new URL('../../',document.currentScript.src).href;
 const scripts=new Map();let assetsPromise=null,worker=null,ready=null,job=null,running=false,cancelCurrent=null;
 const aborted=()=>new DOMException('Operação cancelada.','AbortError');
 function script(path){if(scripts.has(path))return scripts.get(path);const promise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=root+path;s.onload=resolve;s.onerror=()=>{scripts.delete(path);s.remove();reject(Error('Arquivo local ausente: '+path));};document.head.append(s);});scripts.set(path,promise);return promise;}
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 async function unpack(s){return new Response(new Blob([decode(s)]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
 function assets(progress){return assetsPromise||=(async()=>{
  progress('Carregando o motor local…');
  await script('vendor/onnxruntime/offline-runtime.js');
  const enginePromise=window.PrismaORTLoad();
  window.PrismaSubjectParts||=[];let next=0,done=0;
  await script('vendor/subject/runtime.js');
  await Promise.all(Array.from({length:4},async()=>{while(next<89){const n=next++;await script('vendor/subject/part-'+String(n).padStart(3,'0')+'.js');progress('Carregando a IA do próprio aplicativo…',++done/89);}}));
  const packed=window.PrismaSubjectParts.join('');delete window.PrismaSubjectParts;
  const model=await unpack(packed),runtime=await unpack(window.PrismaSubjectRuntime);delete window.PrismaSubjectRuntime;
  if(model.byteLength!==4574861)throw Error('Os arquivos do modelo estão incompletos.');
  if(crypto.subtle){const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',model))].map(v=>v.toString(16).padStart(2,'0')).join('');if(sha!=='309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8')throw Error('A verificação do modelo falhou.');}
  const engine=await enginePromise,wasm=await unpack(engine.wasm);
  return {model:new Uint8Array(model),runtime:URL.createObjectURL(new Blob([runtime],{type:'text/javascript'})),mjs:URL.createObjectURL(new Blob([decode(engine.mjs)],{type:'text/javascript'})),wasm:URL.createObjectURL(new Blob([wasm],{type:'application/wasm'}))};
 })().catch(e=>{assetsPromise=null;throw e;});}
 function release(){cancelCurrent?.();const current=job;if(current)current.reject(aborted());worker?.terminate();worker=null;ready=null;}
 async function initialize(a){
  if(ready)return ready;
  const code=PrismaSubjectMathFactory.toString()+';self.PrismaSubjectMath=PrismaSubjectMathFactory();('+PrismaSubjectWorker.toString()+')();';
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
  const current=worker=new Worker(url);URL.revokeObjectURL(url);
  ready=new Promise((resolve,reject)=>{
   current.onmessage=e=>{if(worker!==current)return;const m=e.data;if(m.type==='ready')resolve();else if(m.type==='result')job?.resolve(new Uint8ClampedArray(m.alpha));else if(m.type==='error'){reject(Error(m.message));job?.reject(Error(m.message));current.terminate();worker=null;ready=null;}};
   current.onerror=e=>{const error=Error('Não foi possível executar a IA neste aparelho: '+(e.message||'erro do motor'));reject(error);job?.reject(error);current.terminate();if(worker===current){worker=null;ready=null;}};
   current.postMessage({type:'init',...a});
  });return ready;
 }
 const service=PS.backgroundAI={release,async segment(source,{signal,onProgress=()=>{}}={}){
  if(running)throw Error('Já existe um recorte em andamento.');if(signal?.aborted)throw aborted();running=true;
  let stopped=false,rejectCancel;
  const cancel=new Promise((_,reject)=>{rejectCancel=reject;});
  const stop=()=>{stopped=true;worker?.terminate();worker=null;ready=null;rejectCancel(aborted());};
  cancelCurrent=stop;signal?.addEventListener('abort',stop,{once:true});
  try{
   const a=await Promise.race([assets((...args)=>{if(!stopped)onProgress(...args);}),cancel]);if(stopped)throw aborted();
   onProgress('Preparando a rede neural…');await Promise.race([initialize(a),cancel]);if(stopped)throw aborted();
   const c=PS.canvas(320,320),ctx=PS.ctx(c);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,320,320);ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,320,320);
   const pixels=ctx.getImageData(0,0,320,320).data;onProgress('Reconhecendo o assunto e calculando o contorno…');
   return await Promise.race([new Promise((resolve,reject)=>{job={resolve,reject};worker.postMessage({type:'run',pixels:pixels.buffer},[pixels.buffer]);}),cancel]);
  }finally{signal?.removeEventListener('abort',stop);job=null;running=false;cancelCurrent=null;}
 },mask(alpha,w,h,edge=0,invert=false){
  const small=PS.canvas(320,320);PS.ctx(small).putImageData(new ImageData(PrismaSubjectMath.refine(alpha,edge,invert),320,320),0,0);
  const out=PS.canvas(w,h),ctx=PS.ctx(out);ctx.imageSmoothingQuality='high';ctx.drawImage(small,0,0,w,h);return out;
 },applyEditor(mask,L,version){
  const d=PS.doc;if(L.locked)throw Error('Desbloqueie a camada para alterar a máscara.');if(d.version!==version||d.layer!==L)throw Error('A camada mudou. Abra o recorte novamente.');
  if(L.mask&&L.maskEnabled){const x=PS.ctx(mask);x.globalCompositeOperation='destination-in';x.drawImage(L.mask,0,0);x.globalCompositeOperation='source-over';}
  if(d.sel){let before=L.mask&&L.maskEnabled?L.mask:null;if(!before){before=PS.canvas(L.canvas.width,L.canvas.height);const x=PS.ctx(before);x.fillStyle='#fff';x.fillRect(0,0,before.width,before.height);}mask=d.throughSelection(L,before,mask);}
  L.mask=mask;L.maskEnabled=true;d.editMask=false;d.commit('Remover fundo com IA','fa-mask');
 }};
})();
