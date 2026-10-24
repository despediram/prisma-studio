/* Prisma Studio Desktop — teste integrado executado pelo próprio Electron no CI Windows.
 * Não é incluído no instalador. Usa projetos temporários e diálogos de gravação simulados.
 */
'use strict';
const assert=require('node:assert/strict');
module.exports=async function(win,store){
 const interactionSource=require('node:fs').readFileSync(require('node:path').join(__dirname,'../testes/editor-interactions.js'),'utf8');
 await win.webContents.executeJavaScript(interactionSource+'\n;void 0;');
 const interaction=await win.webContents.executeJavaScript('window.prismaTestInteractions(PS)');
 console.log('Interações: '+JSON.stringify(interaction));
 const fs=require('node:fs'),path=require('node:path');
 await win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname,'../testes/creative-interactions.js'),'utf8')+'\n;void 0;');
 const sample='data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'../testes/fixtures/car.jpg')).toString('base64');
 console.log('Criação e IA: '+JSON.stringify(await win.webContents.executeJavaScript('window.prismaTestCreative(PS,'+JSON.stringify(sample)+')')));
 await win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname,'../testes/refinements-interactions.js'),'utf8')+'\n;void 0;');
 console.log('Aprimoramentos: '+JSON.stringify(await win.webContents.executeJavaScript('window.prismaTestRefinements(PS,'+JSON.stringify(sample)+')')));
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  const check=(v,m)=>{if(!v)throw Error(m)},P=PS,d=P.doc;
  check(typeof require==='undefined'&&typeof process==='undefined','Node exposto ao documento');check(!!PrismaDesktop&&document.body.classList.contains('ps-desktop'),'Ponte desktop ausente');
  for(const [id,value] of Object.entries({pMargin:'0',pOverlap:'10',pBorder:'0',pGlueStyle:'tabs',pFormat:'png',pPdfOrient:'auto'}))check(document.getElementById(id).value===value,'Padrão incorreto: '+id);for(const [id,value] of Object.entries({pBleed:true,pMarkGlue:true,pMarkCut:false,pMarkLabels:true,pGuidePage:false,pSkipBlank:true,pSafePrint:false}))check(document.getElementById(id).checked===value,'Padrão incorreto: '+id);
  d.newDocument(800,600,'transparent','Teste Windows');
  // Confere o botão real com as medidas relatadas, sem alocar 100 MP no CI.
  const priorSize=d.size;try{
   d.size={w:4208,h:5980};d.emit('change');
   check(!document.querySelector('#btnUpscale').disabled,'Botão da aba Melhorar ainda bloqueia 100 MP');
   check(document.querySelector('#upResult').textContent.includes('100,7 MP'),'Medidas do caso relatado não conferem');
   for(const factor of [3,4]){document.querySelector('#upFactor button[data-f="'+factor+'"]').click();check(!document.querySelector('#btnUpscale').disabled,'Multiplicador bloqueado');}
  }finally{d.size=priorSize;document.querySelector('#upFactor button[data-f="2"]').click();d.emit('change');}
  P.afterOpen();P.ctx(d.base).fillStyle='#e6007e';P.ctx(d.base).fillRect(30,30,70,60);d.commit('Pintura');d.addMask();d.setParam('exposure',.35);
  const blob=await P.createProjectBlob({background:true}),zip=await JSZip.loadAsync(blob),meta=JSON.parse(await zip.file('projeto.json').async('string'));
  check(meta.params.exposure===.35,'Ajustes não foram serializados');check(!!zip.file('camadas/0_mascara.png'),'Máscara não foi serializada');
  check(await P.desktop.saveEditor(blob),'Salvamento nativo cancelado');
  const pendingBackup=P.desktop.checkpoint(true);d.setLayerProp(d.layer,'name','Camada Windows salva','Nome');await P.desktop.checkpoint(true);await pendingBackup;const copies=await PrismaDesktop.recoveries();const editorCopy=copies.find(x=>x.kind==='editor'&&x.name.includes('Teste Windows'));check(!!editorCopy,'Recuperação do Editor não foi gravada');check(copies.some(x=>x.kind==='design'),'Recuperação do Design não foi gravada');const restored=await PrismaDesktop.recover(editorCopy.id);
  await P.openProject(new File([restored.bytes],'recuperada.prisma'));P.afterOpen();check(d.w===800&&d.h===600&&!!d.layer.mask&&d.params.exposure===.35&&d.layer.name==='Camada Windows salva','Recuperação perdeu camadas/ajustes');
  d.setLayerProp(d.layer,'name','Camada Windows','Nome');d.undo();check(d.layer.name!=='Camada Windows','Undo falhou');d.redo();check(d.layer.name==='Camada Windows','Redo falhou');
  check(await P.upscaleTo(1.5,'lanczos'),'Ampliação real não concluiu');check(d.w===1200&&d.h===900,'Saída real incorreta');d.undo();check(d.w===800&&d.h===600,'Undo da ampliação falhou');
  await P.setMode('design');await P.design.ready;P.design.addText('heading');check(await P.design.save(),'Design não salvo');await P.desktop.checkpoint(true);check((await PrismaDesktop.recoveries()).some(x=>x.kind==='design'),'Design sem recuperação');
  await P.setMode('editor');await P.openUpscaler();const frame=document.querySelector('#upscalerDialog iframe');await new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(frame.contentDocument?.querySelector('#go')&&!frame.contentDocument.querySelector('#go').disabled){clearInterval(timer);resolve();}else if(++count>300){clearInterval(timer);reject(Error('Ampliador não carregou'));}},100);});
  check(!frame.contentWindow.PrismaDesktop,'Ponte exposta ao subquadro');document.querySelector('#upscalerDialog header button').click();
  check(!errors.length,'Erros no renderer: '+errors.join('; '));return {projectBytes:blob.size,recoveries:(await PrismaDesktop.recoveries()).length,isolated:true,undoRedo:true,upscaler:true,largeUpscaleEnabled:true};
 })()`);
 assert(result.isolated&&result.undoRedo&&result.upscaler);assert((await store.list()).length>=2);console.log(JSON.stringify(result));
};
