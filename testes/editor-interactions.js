/* Prisma Studio — integração compartilhada do editor no navegador, Electron e Android.
 * Verifica pixels, recorte, máscara, histórico e custo das interações reais.
 */
window.prismaTestInteractions=async function(P){
 'use strict';const d=P.doc,T=P.tools,C=P.toolContext,check=(v,m)=>{if(!v)throw Error(m);};
 const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const hash=c=>{let h=2166136261;for(const b of P.ctx(c).getImageData(0,0,c.width,c.height).data)h=Math.imul(h^b,16777619);return h>>>0;};
 d.newDocument(320,240,'transparent','Teste de interação');P.afterOpen();
 const ctx=P.ctx(d.base);ctx.fillStyle='#00a7e1';ctx.fillRect(0,0,320,240);ctx.fillStyle='#e6007e';ctx.fillRect(60,40,100,100);d.commit('Arte de teste');d.addMask();d.editMask=false;d.rebuildProxy();
 const originalHash=hash(d.base);await T.set('crop');P.view.render();await frame();
 const draw=d.drawLayers;let compositions=0;d.drawLayers=function(...args){compositions++;return draw.apply(d,args);};
 try{
  T.pointer('down',{pointerType:'touch'},{x:60,y:40});
  for(let i=1;i<=40;i++)T.pointer('drag',{pointerType:'touch'},{x:60+i*4,y:40+i*3});
  T.pointer('up',{pointerType:'touch'},{x:220,y:160});await frame();
  check(compositions===0,'Recorte recompôs camadas durante o arraste');
  check(C.crop.x===60&&C.crop.y===40&&C.crop.w===160&&C.crop.h===120,'Seleção por arraste incorreta');
 }finally{d.drawLayers=draw;}
 const index=d.index;await T.applyCrop();
 check(d.w===160&&d.h===120&&T.current==='move'&&!C.crop,'Recorte não foi confirmado');
 check(d.index===index+1,'Recorte deve ser um único comando');check(d.layer.mask.width===160,'Máscara não foi recortada');
 const croppedHash=hash(d.base);
 for(let i=0;i<100;i++){
  d.undo();check(d.w===320&&d.h===240&&hash(d.base)===originalHash,'Desfazer divergiu');
  d.redo();check(d.w===160&&d.h===120&&hash(d.base)===croppedHash,'Refazer divergiu');
 }
 d.undo();await T.set('crop');T.pointer('down',{pointerType:'touch'},{x:60,y:40});T.pointer('drag',{pointerType:'touch'},{x:200,y:160});T.pointer('up',{},{});T.cancelCrop();check(d.w===320&&d.h===240&&!C.crop,'Cancelar alterou pixels');
 await T.set('text');T.S.text.size=24;T.registry.text.pointer('down',{pointerType:'touch'},{x:30,y:80});T.registry.text.pointer('up',{},{});
 C.updateText('family','DM Sans');await document.fonts.load(C.fontStr(C.textEdit.L.text));C.flushText();
 const L=C.textEdit.L,canvas=L.canvas,render=T.renderTextLayer;let draws=0;T.renderTextLayer=function(layer){draws++;return render(layer);};
 try{for(let i=0;i<50;i++)C.updateText('text','Texto '+i);C.flushText();check(draws===1,'Digitação não foi agrupada por quadro');check(L.canvas===canvas,'Digitação realocou a imagem inteira');}finally{T.renderTextLayer=render;}
 C.updateText('text','Prisma');C.updateText('size',32);C.updateText('x',70);C.updateText('y',90);C.flushText();
 const reference=P.canvas(d.w,d.h);C.drawText(P.ctx(reference),L.text);check(hash(reference)===hash(L.canvas),'Prévia deixou resíduos do texto antigo');
 T.commitText();const textHash=hash(d.base);d.undo();check(!d.layers.some(l=>l.type==='text'),'Undo não removeu texto novo');d.redo();check(d.layer.type==='text'&&d.layer.text.family==='DM Sans'&&hash(d.base)===textHash,'Texto perdeu fonte ou pixels');
 await T.cropTo({x:20,y:30,w:280,h:200});check(d.layer.type==='text'&&d.layer.text.x===50&&d.layer.text.y===60,'Recorte rasterizou ou deslocou o texto editável');d.undo();check(d.layer.type==='text'&&d.layer.text.x===70,'Undo do texto recortado falhou');
 check(document.querySelector('#pPromptShortcut')&&document.querySelector('#pPromptPanel'),'Atalho de prompts ausente');
 check(P.poster.cfg.overlap===10&&P.poster.cfg.glueStyle==='tabs','Padrão de pôster mudou');
 await T.set('move');P.mobile?.close();return {crop:true,cancel:true,mask:true,undoRedo:100,text:true,textDraws:draws,cropCompositions:compositions};
};
