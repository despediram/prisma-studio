/* Prisma Studio Android — codificação de blocos pequenos para a ponte nativa.
 * A transferência não cria uma string Base64 da imagem inteira na memória.
 */
(function(root){
 'use strict';
 const CHUNK=65536;
 function encode(bytes){let raw='';for(let i=0;i<bytes.length;i+=4096)raw+=String.fromCharCode(...bytes.subarray(i,i+4096));return btoa(raw);}
 function decode(value){const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}
 async function write(blob,start,request,progress){
  const opened=await request(start.op,start);if(opened.canceled)return false;const token=opened.token;
  try{
   for(let offset=0;offset<blob.size;offset+=CHUNK){const bytes=new Uint8Array(await blob.slice(offset,offset+CHUNK).arrayBuffer());await request('write-chunk',{token,data:encode(bytes)});progress?.(Math.min(1,(offset+bytes.length)/blob.size));}
   return await request('write-finish',{token});
  }catch(e){await request('abort',{token}).catch(()=>{});throw e;}
 }
 async function read(opened,request){
  const parts=[],token=opened.token;
  try{for(;;){const result=await request('read-next',{token});if(result.done)break;parts.push(decode(result.data));}return new File(parts,opened.name,{type:opened.mime||'application/octet-stream'});}
  catch(e){await request('abort',{token}).catch(()=>{});throw e;}
 }
 const api={CHUNK,encode,decode,write,read};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrismaAndroidTransfer=api;
})(typeof window==='undefined'?globalThis:window);
