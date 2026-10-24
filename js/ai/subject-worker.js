/* Prisma Studio — inferência U²-NetP em worker isolado, sem requisições externas.
 * Cancelar encerra o worker; o histórico e o documento só mudam ao aplicar.
 */
function PrismaSubjectWorker(){
 'use strict';let session=null;
 self.onmessage=async event=>{
  const m=event.data;
  try{
   if(m.type==='init'){
    importScripts(m.runtime);
    ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths={mjs:m.mjs,wasm:m.wasm};
    session=await ort.InferenceSession.create(m.model,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
    self.postMessage({type:'ready'});return;
   }
   if(m.type==='run'){
    if(!session)throw Error('O motor de recorte ainda não está pronto.');
    const data=PrismaSubjectMath.input(new Uint8ClampedArray(m.pixels));
    const input=new ort.Tensor('float32',data,[1,3,320,320]);
    const outputs=await session.run({[session.inputNames[0]]:input},[session.outputNames[0]]);
    try{const mask=PrismaSubjectMath.alpha(outputs[session.outputNames[0]].data);self.postMessage({type:'result',alpha:mask.buffer},[mask.buffer]);}
    finally{input.dispose?.();Object.values(outputs).forEach(t=>t.dispose?.());}
   }
  }catch(e){self.postMessage({type:'error',message:e.message||String(e)});}
 };
}
