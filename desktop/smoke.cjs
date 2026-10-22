/* Prisma Studio Desktop — teste integrado executado pelo próprio Electron no CI Windows.
 * Não é incluído no instalador. Usa projetos temporários e diálogos de gravação simulados.
 */
'use strict';
const assert=require('node:assert/strict');
module.exports=async function(win,store){
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  const check=(v,m)=>{if(!v)throw Error(m)},P=PS,d=P.doc;
  check(typeof require==='undefined'&&typeof process==='undefined','Node exposto ao documento');check(!!PrismaDesktop&&document.body.classList.contains('ps-desktop'),'Ponte desktop ausente');
  d.newDocument(800,600,'transparent','Teste Windows');P.afterOpen();P.ctx(d.base).fillStyle='#e6007e';P.ctx(d.base).fillRect(30,30,70,60);d.commit('Pintura');d.addMask();d.setParam('exposure',.35);
  const blob=await P.createProjectBlob({background:true}),zip=await JSZip.loadAsync(blob),meta=JSON.parse(await zip.file('projeto.json').async('string'));
  check(meta.params.exposure===.35,'Ajustes não foram serializados');check(!!zip.file('camadas/0_mascara.png'),'Máscara não foi serializada');
  check(await P.desktop.saveEditor(blob),'Salvamento nativo cancelado');
  await P.desktop.checkpoint(true);const copies=await PrismaDesktop.recoveries();check(copies.length===1,'Recuperação não foi gravada');const restored=await PrismaDesktop.recover(copies[0].id);
  await P.openProject(new File([restored.bytes],'recuperada.prisma'));P.afterOpen();check(d.w===800&&d.h===600&&!!d.layer.mask&&d.params.exposure===.35,'Recuperação perdeu camadas/ajustes');
  d.setLayerProp(d.layer,'name','Camada Windows','Nome');d.undo();check(d.layer.name!=='Camada Windows','Undo falhou');d.redo();check(d.layer.name==='Camada Windows','Redo falhou');
  await P.setMode('design');await P.design.ready;P.design.addText('heading');check(await P.design.save(),'Design não salvo');await P.desktop.checkpoint(true);check((await PrismaDesktop.recoveries()).some(x=>x.kind==='design'),'Design sem recuperação');
  await P.setMode('editor');await P.openUpscaler();const frame=document.querySelector('#upscalerDialog iframe');await new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(frame.contentDocument?.querySelector('#go')&&!frame.contentDocument.querySelector('#go').disabled){clearInterval(timer);resolve();}else if(++count>300){clearInterval(timer);reject(Error('Ampliador não carregou'));}},100);});
  check(!frame.contentWindow.PrismaDesktop,'Ponte exposta ao subquadro');document.querySelector('#upscalerDialog header button').click();
  check(!errors.length,'Erros no renderer: '+errors.join('; '));return {projectBytes:blob.size,recoveries:(await PrismaDesktop.recoveries()).length,isolated:true,undoRedo:true,upscaler:true};
 })()`);
 assert(result.isolated&&result.undoRedo&&result.upscaler);assert((await store.list()).length>=2);console.log(JSON.stringify(result));
};
