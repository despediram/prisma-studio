/* Prisma Studio Desktop — gravação atômica, preferências e recuperação em disco.
 * Caminhos de arquivos do usuário são escolhidos pelo processo principal.
 * Cada projeto mantém duas gerações; a anterior só é retirada após gravar a nova.
 */
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
async function atomicWrite(file,bytes){
 await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';
 try{const handle=await fs.open(tmp,'wx');try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}await fs.rename(tmp,file);}
 catch(e){await fs.unlink(tmp).catch(()=>{});throw e;}
}
function safeName(name){return path.basename(String(name||'projeto').replace(/\\/g,'/')).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,180)||'projeto';}
function validKind(kind){if(!['editor','design'].includes(kind))throw Error('Tipo de projeto inválido.');return kind;}
class Storage{
 constructor(root){this.root=root;this.queue=Promise.resolve();}
 async readJSON(name,fallback){try{return JSON.parse(await fs.readFile(path.join(this.root,name),'utf8'));}catch{return fallback;}}
 async preferences(){return this.readJSON('preferencias.json',{});}
 async setPreferences(data){await atomicWrite(path.join(this.root,'preferencias.json'),JSON.stringify(data));}
 async list(){const list=await this.readJSON('recuperacao.json',[]);return Array.isArray(list)?list.filter(x=>['editor','design'].includes(x.kind)&&/^[a-f0-9-]{36}$/.test(x.id)):[];}
 save(kind,name,bytes){
  validKind(kind);if(!(bytes instanceof Uint8Array)||!bytes.byteLength)throw Error('Projeto vazio.');
  const task=this.queue.catch(()=>{}).then(async()=>{
   const previous=await this.list(),id=randomUUID(),file=path.join(this.root,'recuperacao',id);
   await atomicWrite(file,bytes);
   const item={id,kind,name:safeName(name),date:new Date().toISOString(),size:bytes.byteLength};
   const next=[item,...previous],keep=next.filter((x,i)=>next.slice(0,i).filter(p=>p.kind===x.kind).length<2);
   try{await atomicWrite(path.join(this.root,'recuperacao.json'),JSON.stringify(keep));}catch(e){await fs.unlink(file).catch(()=>{});throw e;}
   for(const old of previous)if(!keep.some(x=>x.id===old.id))await fs.unlink(path.join(this.root,'recuperacao',old.id)).catch(()=>{});
   return item;
  });this.queue=task;return task;
 }
 async recover(id){const item=(await this.list()).find(x=>x.id===id);if(!item)throw Error('Recuperação não encontrada.');return {...item,bytes:new Uint8Array(await fs.readFile(path.join(this.root,'recuperacao',item.id)))};}
}
module.exports={Storage,atomicWrite,safeName,validKind};
