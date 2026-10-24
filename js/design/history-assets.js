/* Prisma Studio — histórico de objetos com imagens compartilhadas por referência.
 * A exportação continua incorporando as fotos; o histórico armazena cada fonte uma
 * única vez e limita a memória adicional além das imagens do documento corrente.
 */
(function(root){
 'use strict';class DesignHistoryAssets{
  constructor(){this.sources=new Map();this.ids=new Map();this.references=new Map();this.next=0;}
  capture(value){const refs=new Set(),snapshot=JSON.stringify(value,(key,v)=>{if(key!=='src'||typeof v!=='string'||!v.startsWith('data:image/'))return v;let id=this.ids.get(v);if(!id){id=++this.next;this.ids.set(v,id);this.sources.set(id,v);}refs.add(id);return {prismaHistoryAsset:id};});this.references.set(snapshot,refs);return snapshot;}
  restore(snapshot){return JSON.parse(snapshot,(key,v)=>{if(key==='src'&&v&&typeof v==='object'&&Object.hasOwn(v,'prismaHistoryAsset')){const source=this.sources.get(v.prismaHistoryAsset);if(!source)throw Error('Foto ausente no histórico do design.');return source;}return v;});}
  bytes(states){const baseline=this.references.get(states.at(-1))||new Set(),used=new Set();let bytes=states.reduce((n,s)=>n+s.length*2,0);for(const state of states)for(const id of this.references.get(state)||[])used.add(id);for(const id of used)if(!baseline.has(id))bytes+=(this.sources.get(id)?.length||0)*2;return bytes;}
  collect(states){const keep=new Set(states),used=new Set();for(const state of states)for(const id of this.references.get(state)||[])used.add(id);for(const [state]of this.references)if(!keep.has(state))this.references.delete(state);for(const [id,source]of this.sources)if(!used.has(id)){this.sources.delete(id);this.ids.delete(source);}}
  clear(){this.sources.clear();this.ids.clear();this.references.clear();}
 }
 if(typeof module==='object'&&module.exports)module.exports=DesignHistoryAssets;else root.PS.DesignHistoryAssets=DesignHistoryAssets;
})(typeof window==='object'?window:globalThis);
