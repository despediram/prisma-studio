/* Prisma Studio — integração opcional com o aplicativo Windows.
 * Menus, arquivos e recuperação usam uma ponte limitada do preload.
 * No navegador este arquivo não altera a interface nem os fluxos existentes.
 */
(function(){
 'use strict';const api=window.PrismaDesktop,PS=window.PS;if(!api||!PS)return;
 const doc=PS.doc,D=PS.design,$=PS.$;document.body.classList.add('ps-desktop');
 const label=document.createElement('small');label.className='desktop-edition';label.textContent='WINDOWS · OFFLINE';$('.brand-text').append(label);
 const footer=document.createElement('footer');footer.className='desktop-status';footer.innerHTML='<span class="desktop-local">● Processamento local</span><span id="desktopDocument">Sem documento</span><span class="desktop-recovery" id="desktopRecovery">Recuperação automática a cada minuto</span><button class="btn ghost sm" type="button">Recuperar trabalho</button>';document.body.append(footer);
 let editorKey=crypto.randomUUID(),designKey=crypto.randomUUID(),designGeneration=D.generation;
 let savedEditor=null,savedDesign=null,savedDesignName='',backupEditor=null,backupDesign=null,backupDesignName='',running=false,lastInput=0,saveAs=false;
 const editorSignature=()=>doc.has?doc.version+'|'+JSON.stringify(doc.params)+'|'+doc.fg+'|'+doc.bg:null;
 const designName=()=>$('#dsName').value||'design';
 function designChanged(){if(designGeneration!==D.generation){designGeneration=D.generation;designKey=crypto.randomUUID();savedDesign=null;backupDesign=null;}return !!D.canvas&&(D.revision!==savedDesign||designName()!==savedDesignName);}
 function editorChanged(){return doc.has&&editorSignature()!==savedEditor;}
 function state(){
  const designDirty=designChanged(),editorDirty=editorChanged(),mode=document.body.dataset.mode;
  const name=mode==='design'?designName():doc.name||'Sem documento';
  api.state({dirty:editorDirty||designDirty,name});
  $('#desktopDocument').textContent=doc.has?`${PS.fmtInt(doc.w)} × ${PS.fmtInt(doc.h)} px · ${doc.layers.length} camadas · histórico ${PS.bytes(doc.historyBytes)}`:'Sem documento';
 }
 async function save(blob,kind,name){
  const signature=editorSignature(),revision=D.revision,currentDesignName=designName();
  const result=await api.save({kind,name,documentKey:kind==='editor'?editorKey:designKey,bytes:new Uint8Array(await blob.arrayBuffer()),saveAs});
  if(result.canceled)return false;
  if(kind==='editor')savedEditor=signature;else{savedDesign=revision;savedDesignName=currentDesignName;}
  state();PS.toast('Projeto salvo: '+result.name,'success');return true;
 }
 PS.desktop={
  saveEditor:blob=>save(blob,'editor',(doc.name||'projeto')+'.prisma'),
  saveDesign:blob=>save(blob,'design',designName()+'.prismadesign'),
  checkpoint,open:openNative,recovery:showRecovery
 };
 async function checkpoint(force=false){
  // Uma gravação forçada espera a cópia em curso e captura também a edição mais recente.
  if(force)while(running)await new Promise(resolve=>setTimeout(resolve,25));
  if(running||D.busy||PS.tools.isBusy()||!$('#busy').hidden||(!force&&Date.now()-lastInput<2000))return false;
  running=true;let written=false;
  try{
   const signature=editorSignature();
   if(doc.has&&signature!==backupEditor){
    $('#desktopRecovery').textContent='Gravando recuperação do Editor…';
    const blob=await PS.createProjectBlob({background:true});
    // Se o usuário continuou editando, descarta a cópia e tenta de novo no próximo ciclo.
    if(blob&&signature===editorSignature()){
     await api.autosave({kind:'editor',name:(doc.name||'projeto')+'.prisma',bytes:new Uint8Array(await blob.arrayBuffer())});backupEditor=signature;written=true;
    }
   }
   if(D.canvas&&(D.revision!==backupDesign||designName()!==backupDesignName)){
    const name=designName(),revision=D.revision,bytes=new TextEncoder().encode(D.edit.serialize());
    if(!D.busy&&revision===D.revision&&name===designName()){await api.autosave({kind:'design',name:name+'.prismadesign',bytes});backupDesign=revision;backupDesignName=name;written=true;}
   }
   if(written)$('#desktopRecovery').textContent='Recuperação em disco às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
   return written;
  }catch(e){$('#desktopRecovery').textContent='Não foi possível gravar recuperação';PS.toast('Recuperação automática: '+e.message,'warning',6000);return false;}
  finally{running=false;state();}
 }
 async function openData(data,recovered=false){
  if(!data)return false;const isDesign=/\.prismadesign$/i.test(data.name);
  if((isDesign?designChanged():editorChanged())&&!await PS.dialog({title:'Substituir projeto aberto?',body:'<p>Há alterações não salvas. Salve o projeto atual antes de substituí-lo.</p>',okText:'Substituir',cancelText:'Cancelar'}))return false;
  const file=new File([data.bytes],data.name,{type:data.type||'application/octet-stream'});
  if(isDesign){await D.load(JSON.parse(await file.text()));await PS.setMode('design');designChanged();designKey=data.documentKey||crypto.randomUUID();savedDesign=recovered?null:D.revision;savedDesignName=designName();}
  else{const ok=await PS.openFile(file);if(!ok)return false;await PS.setMode('editor');editorKey=data.documentKey||crypto.randomUUID();savedEditor=recovered?null:editorSignature();}
  state();return true;
 }
 async function openNative(){return openData(await api.open());}
 async function showRecovery(){
  const items=await api.recoveries();
  if(!items.length){PS.toast('Ainda não há cópias de recuperação neste computador.','info');return;}
  const body=document.createElement('div'),p=document.createElement('p');p.textContent='Escolha uma cópia completa. O arquivo original em disco não será alterado.';body.append(p);
  const list=document.createElement('div');list.className='desktop-recovery-list';body.append(list);
  items.forEach((item,i)=>{const row=document.createElement('label');row.className='desktop-recovery-row';const radio=document.createElement('input');radio.type='radio';radio.name='desktop-recovery';radio.value=item.id;radio.checked=i===0;const text=document.createElement('span'),name=document.createElement('strong'),info=document.createElement('small');name.textContent=item.name;info.textContent=new Date(item.date).toLocaleString('pt-BR')+' · '+PS.bytes(item.size);text.append(name,info);row.append(radio,text);list.append(row);});
  const result=await PS.dialog({title:'Recuperar trabalho',body,okText:'Recuperar',cancelText:'Depois'});
  if(result){const item=await api.recover($('input:checked',result).value);if(await openData(item,true))PS.toast('Projeto recuperado. Salve para escolher o arquivo definitivo.','success');}
 }
 async function about(){const info=await api.info();await PS.dialog({title:'Prisma Studio para Windows',okText:'Fechar',cancelText:'',body:'<p><strong>Versão '+PS.escape(info.version)+'</strong> · Windows de 64 bits</p><p>Editor, Design e Pôsteres funcionam localmente. A IA usa os modelos ONNX que você carregar ou autorizar baixar no ampliador.</p><p>Recuperação em disco, a cada minuto de alterações, quando não há traço ou edição em andamento:</p><p class="hint">'+PS.escape(info.recoveryDirectory)+'</p><p>O motor de pixels e os cálculos de impressão são compartilhados com o site. Memória, aceleração e escala física continuam dependendo do computador e da impressora.</p>'});}
 async function execute(message){
  const mode=document.body.dataset.mode,design=mode==='design';
  switch(message.action){
   case 'open':return openNative();case 'open-file':return openData(message.file);case 'new':return PS.newDialog();
   case 'save':return design?D.save():PS.saveProject();
   case 'save-as':saveAs=true;try{return await(design?D.save():PS.saveProject());}finally{saveAs=false;}
   case 'export':return design?D.exportPng():doc.has&&PS.exportDialog();case 'psd':return PS.exportPsd();
   case 'editor':case 'design':case 'poster':return PS.setMode(message.action);
   case 'upscale':return PS.openUpscaler();case 'fit':return PS.view.fit();case 'undo':return design?D.undo():PS.editorHistory('undo');case 'redo':return design?D.redo():PS.editorHistory('redo');
   case 'help':return $('#btnHelp').click();case 'about':return about();case 'recovery':return showRecovery();
   case 'save-and-close':{
    let ok=true;try{if(editorChanged())ok=await PS.saveProject();if(ok&&designChanged())ok=await D.save();api.closed(ok&&!editorChanged()&&!designChanged());}catch(e){api.closed(false);throw e;}return;
   }
  }
 }
 const guarded=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>PS.toast(e.message||String(e),'error',7000));
 api.onCommand(guarded(execute));$('button',footer).onclick=guarded(showRecovery);
 // O seletor nativo atende também os botões e menus HTML existentes.
 for(const id of ['fileInput','dsProjectInput'])$('#'+id).addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();guarded(openNative)();},true);
 window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='o'){e.preventDefault();e.stopImmediatePropagation();guarded(openNative)();}},true);
 for(const type of ['pointerdown','pointerup','keydown','input'])window.addEventListener(type,()=>{lastInput=Date.now();},{capture:true,passive:true});
 doc.on(type=>{if(type==='load'){editorKey=crypto.randomUUID();savedEditor=null;backupEditor=null;}if(['load','change','layers','params'].includes(type))state();});
 window.addEventListener('prisma:designchange',state);$('#dsName').addEventListener('input',state);
 setInterval(()=>checkpoint(),60000);state();api.ready();
 api.recoveries().then(items=>{if(items.length)guarded(showRecovery)();}).catch(e=>PS.toast(e.message,'warning'));
})();
