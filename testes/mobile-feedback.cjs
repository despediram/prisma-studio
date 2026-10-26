/* Regressões dos relatos de painel encobrindo foto e Selecionar → Luz local. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.PRISMA_CHROMIUM||undefined});
fs.mkdirSync('test-results',{recursive:true});
try{
for(const [width,height] of [[320,720],[390,844],[412,915],[780,390],[1440,900]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:width<=860}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 // Todos os recursos devem funcionar sem rede.
 await p.route(/^https?:/,r=>r.abort());
 await p.goto('file://'+path.resolve('index.html'));
 await p.waitForFunction(()=>window.PS?.mobile&&window.PS?.tools?.registry?.tone);
 await p.evaluate(async()=>{PS.doc.newDocument(600,900,'#808080','Foto de teste');PS.afterOpen();await PS.tools.set('hand');});
 const settle=()=>p.evaluate(async()=>{for(let i=0;i<8;i++)await new Promise(r=>requestAnimationFrame(r));});
 await settle();
 if(width<=860){
  await p.locator('[data-mobile-action=adjust]').click();await settle();
  const geo=await p.evaluate(()=>{const s=PS.$('#stage').getBoundingClientRect(),panel=PS.$('#inspector').getBoundingClientRect();return{stage:{height:s.height,bottom:s.bottom,right:s.right},panel:{top:panel.top,left:panel.left},artHeight:PS.doc.h*PS.view.zoom,zoom:PS.view.zoom};});
  if(height>500){assert(geo.stage.height>=200,JSON.stringify(geo));assert(geo.artHeight>=100,JSON.stringify(geo));assert(geo.stage.bottom<=geo.panel.top+2,'Painel cobre canvas');}
  else assert(geo.stage.right<=geo.panel.left+2,'Painel paisagem cobre canvas');
  assert.equal(await p.locator('#toolOptions').isVisible(),false);
  await p.screenshot({path:`test-results/ajustes-${width}.png`});
  await p.locator('#inspector .mobile-expand').click();await settle();
  if(height>500)assert(await p.locator('#stage').evaluate(e=>e.getBoundingClientRect().height)>=200);
  await p.locator('#inspector .mobile-sheet-title button:last-child').click();await settle();
 }
 // Seleção real e troca pelos botões reais do trilho horizontal.
 await p.locator('.tool[data-tool=marquee]').click();await settle();
 await p.evaluate(()=>{const T=PS.tools,e={pointerType:'touch'};T.pointer('down',e,{x:100,y:100});T.pointer('drag',e,{x:500,y:800});T.pointer('up',e,{x:500,y:800});});
 await p.locator('.tool[data-tool=tone]').click();await settle();
 if(width<=860){assert(await p.locator('#oMode').isVisible());assert.equal(await p.locator('.mobile-panel-backdrop:not(#dsPanelBackdrop)').isVisible(),false);}
 await p.locator('#oMode [data-k=burn]').click();assert.equal(await p.evaluate(()=>PS.tools.S.tone.mode),'burn');
 await p.locator('#oMode [data-k=dodge]').click();
 // O processamento de luz local deve limitar alocações a blocos, preservar seleção e aceitar undo/redo.
 const tone=await p.evaluate(async()=>{const d=PS.doc,T=PS.tools,C=PS.toolContext,e={pointerType:'touch'},pixel=(x,y)=>Array.from(PS.ctx(d.base).getImageData(x,y,1,1).data);const before=pixel(250,300),outside=pixel(20,20),count=d.history.length;T.pointer('down',e,{x:250,y:300});const local=C.stroke.tiled&&!C.stroke.snapshot&&!C.stroke.layer;T.pointer('drag',e,{x:300,y:310});T.pointer('up',e,{x:300,y:310});const after=pixel(250,300),external=pixel(20,20);d.undo();const undo=pixel(250,300);d.redo();return{before,after,outside,external,undo,redo:pixel(250,300),local,added:d.history.length-count};});
 assert(tone.local,'Luz local alocou imagem inteira');assert(tone.after[0]>tone.before[0],'Luz local não pintou');assert.deepEqual(tone.outside,tone.external);assert.deepEqual(tone.undo,tone.before);assert.deepEqual(tone.redo,tone.after);
 if(width<=860){
  const hit=await p.evaluate(()=>{const r=PS.$('#view').getBoundingClientRect();return{x:r.left+PS.view.panX+350*PS.view.zoom,y:r.top+PS.view.panY+500*PS.view.zoom,before:PS.ctx(PS.doc.base).getImageData(350,500,1,1).data[0]};});
  await p.touchscreen.tap(hit.x,hit.y);await settle();assert(await p.evaluate(v=>PS.ctx(PS.doc.base).getImageData(350,500,1,1).data[0]>v,hit.before),'Toque real não atingiu o pincel');
 }
 await p.locator('#toolDeselect').click();assert.equal(await p.evaluate(()=>!!PS.doc.sel),false);
 // Troca com um gesto incompleto não pode deixar o estado preso.
 await p.evaluate(async()=>{await PS.tools.set('marquee');PS.tools.pointer('down',{},{x:20,y:20});await PS.tools.set('tone');if(PS.toolContext.sel)throw Error('Seleção transitória presa');});
 await settle();await p.screenshot({path:`test-results/luz-local-${width}.png`});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({width,height,tone:true,panels:true,offline:true}));await p.close();
}
// Imagem de 24 MP: a primeira pincelada não deve criar cópias integrais.
{
 const p=await browser.newPage();await p.goto('file://'+path.resolve('index.html'));await p.waitForFunction(()=>window.PS?.tools?.registry?.tone);
 const large=await p.evaluate(async()=>{const d=PS.doc,T=PS.tools,C=PS.toolContext;d.newDocument(6000,4000,'#805040');await T.set('tone');const start=performance.now();T.pointer('down',{},{x:260,y:260});const tiles=C.stroke.tiles.size,local=C.stroke.tiled&&!C.stroke.snapshot&&!C.stroke.layer&&!C.stroke.effect;T.pointer('up',{},{x:260,y:260});return{tiles,local,firstStrokeMs:Math.round(performance.now()-start)};});
 assert(large.local&&large.tiles<=4);console.log('Luz local 24 MP: '+JSON.stringify(large));await p.close();
}
// Exercita o worker verdadeiro, prévia, cancelar, aplicar e histórico.
const p=await browser.newPage({viewport:{width:390,height:844}});await p.route(/^https?:/,r=>r.abort());await p.goto('file://'+path.resolve('index.html'));
await p.waitForFunction(()=>window.PS?.toolContext?.removeObject);
await p.evaluate(()=>{const d=PS.doc;d.newDocument(120,120,'#808080');PS.afterOpen();const x=PS.ctx(d.base);x.fillStyle='#ff00ff';x.fillRect(50,50,12,12);d.commit('Objeto');window.beforeRemoval=Array.from(PS.getImg(d.base).d);window.startRemoval=()=>{const layer=PS.canvas(120,120),x=PS.ctx(layer);x.fillStyle='white';x.fillRect(48,48,16,16);return PS.toolContext.removeObject({layer,selMask:PS.doc.sel?PS.doc.selMaskFor(PS.doc.layer):null,size:16,bbox:{x0:48,y0:48,x1:64,y1:64}});};window.removalPromise=startRemoval();if(!document.querySelector('#dialogOk').disabled)throw Error('Prévia prematura');document.querySelector('#dialogCancel').click();});
await p.evaluate(()=>window.removalPromise);assert(await p.evaluate(()=>!PS.toolContext.objectRemovalBusy&&JSON.stringify(Array.from(PS.getImg(PS.doc.base).d))===JSON.stringify(beforeRemoval)));
await p.evaluate(()=>{window.removalPromise=startRemoval();});
await p.waitForFunction(()=>document.querySelector('#dialog').open&&!document.querySelector('#dialogOk').disabled);
await p.locator('#dialogCancel').click();await p.evaluate(()=>window.removalPromise);assert(await p.evaluate(()=>JSON.stringify(Array.from(PS.getImg(PS.doc.base).d))===JSON.stringify(beforeRemoval)));
await p.evaluate(()=>{window.removalPromise=startRemoval();});await p.waitForFunction(()=>document.querySelector('#dialog').open&&!document.querySelector('#dialogOk').disabled);
await p.screenshot({path:'test-results/remocao-previa.png'});await p.locator('#dialogOk').click();await p.evaluate(()=>window.removalPromise);
assert(await p.evaluate(()=>{const d=PS.doc,pixel=PS.ctx(d.base).getImageData(55,55,1,1).data;if(pixel[0]!==128||pixel[1]!==128||pixel[2]!==128)return false;d.undo();if(JSON.stringify(Array.from(PS.getImg(d.base).d))!==JSON.stringify(beforeRemoval))return false;d.redo();return PS.ctx(d.base).getImageData(55,55,1,1).data[1]===128;}));
await p.evaluate(()=>{const d=PS.doc;d.undo();const sel=PS.canvas(120,120);PS.ctx(sel).fillStyle='white';PS.ctx(sel).fillRect(0,0,56,120);d.setSelection(sel);window.removalPromise=startRemoval();});
await p.waitForFunction(()=>document.querySelector('#dialog').open&&!document.querySelector('#dialogOk').disabled);await p.locator('#dialogOk').click();await p.evaluate(()=>window.removalPromise);
assert(await p.evaluate(()=>{const data=PS.getImg(PS.doc.base).d;for(let y=0;y<120;y++)for(let x=56;x<120;x++)for(let k=0;k<4;k++){const i=(y*120+x)*4+k;if(data[i]!==beforeRemoval[i])return false;}return true;}),'Remoção alterou pixels fora da seleção');
console.log('Remoção: worker real offline, cancelar, aplicar, seleção e undo/redo aprovados.');await p.close();
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
