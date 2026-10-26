'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const engine=require('../js/core/inpaint-texture.js');
(async()=>{
for(const action of ['apply','cancel','stale','error']){
 let committed=0,written=0,terminated=0,revoked=0;
 const C={},target={width:50,height:50},layer={},doc={base:target,layer,version:1,commit:()=>committed++};
 const button={}, elements=[];
 const sandbox={PrismaTextureFill:engine,Uint8Array,ImageData:class {constructor(d,w,h){Object.assign(this,{d,w,h});}},document:{createElement:()=>{const el={style:{},setAttribute(){},append(){}};elements.push(el);return el;}},URL:{createObjectURL:()=> 'blob:local',revokeObjectURL:()=>revoked++},Blob:class {},Worker:class {postMessage({img}){queueMicrotask(()=>this.onmessage({data:action==='error'?{error:'Sem referência'}:{result:img}}));}terminate(){terminated++;}},PS:{toolContext:C,doc,$:()=>button,getImg:()=>({w:30,h:30,d:new Uint8ClampedArray(3600)}),ctx:c=>({putImageData(){if(c===target)written++;}}),view:{render(){}},toast(){},dialog:async opts=>{opts.onOpen();await new Promise(r=>setImmediate(r));if(action==='stale')doc.version++;return action==='apply'||action==='stale'?{}:null;}}};
 vm.runInNewContext(fs.readFileSync('js/editor/tools/object-removal.js','utf8'),sandbox);
 await C.removeObject({size:4,bbox:{x0:10,y0:10,x1:20,y1:20},layer:{}});
 assert.equal(committed,action==='apply'?1:0);assert.equal(written,committed);
 assert.equal(terminated,1);assert.equal(revoked,1);assert.equal(C.objectRemovalBusy,false);assert.equal(button.disabled,false);
 console.log(action+': aplicação atômica e limpeza verificadas');
}
const context={};vm.runInNewContext('const engine='+engine.workerSource+'; this.run=engine.run;',context);assert.equal(typeof context.run,'function');
})().catch(e=>{console.error(e);process.exit(1)});
