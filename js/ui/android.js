/* Prisma Studio Android — interface de toque, arquivos e recuperação do APK.
 * Só é ativado pela ponte de origem local; o site e o Windows não são alterados.
 * Imagens e projetos são transferidos em blocos, com escolha de destino pelo Android.
 */
(function(){
 'use strict';const host=window.PrismaAndroidHost,PS=window.PS;if(!host||window!==window.top||!PS)return;
 const T=window.PrismaAndroidTransfer,$=PS.$,doc=PS.doc,D=PS.design,pending=new Map();let seq=0,saveQueue=Promise.resolve(),running=false,lastInput=0,backupEditor=null,backupDesign=null,backupName='';
 document.body.classList.add('ps-android');
 function request(op,payload={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});try{host.postMessage(JSON.stringify({...payload,op,id}));}catch(e){pending.delete(id);reject(e);}});}
 host.onmessage=event=>{let m;try{m=JSON.parse(event.data);}catch{return;}const wait=pending.get(m.id);if(!wait)return;pending.delete(m.id);if(m.error)wait.reject(Error(m.error));else wait.resolve(m.value);};
 const safe=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>PS.toast(e.message||String(e),'error',7000));
 async function save(blob,name,share=false){
  const work=async()=>{
   PS.toast(share?'Preparando compartilhamento…':'Escolha onde salvar no Android.','info');
   const result=await T.write(blob,{op:share?'share-start':'save-start',name,mime:blob.type||'application/octet-stream'},request);
   if(result)PS.toast(share?'Escolha o aplicativo para compartilhar.':'Arquivo salvo: '+result.name,'success');return !!result;
  };
  const next=saveQueue.catch(()=>{}).then(work);saveQueue=next;return next;
 }
 PS.fileHost={saveProject:(blob,name)=>save(blob,name)};
 PS.download=(blob,name)=>{const task=save(blob,name);task.catch(e=>PS.toast(e.message,'error',7000));return task;};
 const signature=()=>doc.has?doc.version+'|'+JSON.stringify(doc.params):null;
 async function checkpoint(force=false){
  // Uma gravação forçada espera a cópia em curso e captura também a edição mais recente.
  if(force)while(running)await new Promise(resolve=>setTimeout(resolve,25));
  if(running||D.busy||PS.tools.isBusy()||!$('#busy').hidden||(!force&&Date.now()-lastInput<2000))return false;
  running=true;
  try{
   const before=signature();
   if(doc.has&&before!==backupEditor){const blob=await PS.createProjectBlob({background:true});if(blob&&before===signature()){await T.write(blob,{op:'recovery-start',kind:'editor',name:(doc.name||'projeto')+'.prisma'},request);backupEditor=before;}}
   if(D.canvas&&(D.revision!==backupDesign||$('#dsName').value!==backupName)){
    const revision=D.revision,name=$('#dsName').value,blob=new Blob([D.edit.serialize()],{type:'application/json'});
    if(revision===D.revision){await T.write(blob,{op:'recovery-start',kind:'design',name:(name||'design')+'.prismadesign'},request);backupDesign=revision;backupName=name;}
   }
   return true;
  }finally{running=false;}
 }
 async function openFile(file){
  if(doc.has||D.canvas){if(!await PS.dialog({title:'Abrir outro arquivo?',body:'<p>Salve o projeto atual antes de substituir a área em uso.</p>',okText:'Abrir',cancelText:'Cancelar'}))return;}
  if(/\.prismadesign$/i.test(file.name)){await D.load(JSON.parse(await file.text()));await PS.setMode('design');}
  else{if(!await PS.openFile(file))return;await PS.setMode('editor');}
 }
 async function incoming(){const item=await request('read-open');await openFile(await T.read(item,request));}
 async function recover(){
  const items=await request('recovery-list');if(!items.length){PS.toast('Ainda não há cópias de recuperação neste aparelho.','info');return;}
  const body=document.createElement('div'),text=document.createElement('p');text.textContent='Escolha uma cópia local. Depois de recuperar, salve o projeto na pasta desejada.';body.append(text);
  for(const [i,item]of items.entries()){const label=document.createElement('label');label.className='android-recovery-row';const input=document.createElement('input');input.type='radio';input.name='android-recovery';input.value=item.id;input.checked=i===0;const span=document.createElement('span');span.textContent=item.name+' · '+new Date(item.date).toLocaleString('pt-BR');label.append(input,span);body.append(label);}
  const result=await PS.dialog({title:'Recuperar trabalho',body,okText:'Recuperar',cancelText:'Depois'});if(result){const item=await request('recovery-open',{key:$('input:checked',result).value});await openFile(await T.read(item,request));}
 }
 async function shareImage(){
  const design=document.body.dataset.mode==='design';if(!design&&!doc.has){PS.toast('Abra uma imagem primeiro.','warning');return;}
  const canvas=design?D.toCanvas():await doc.finalCanvas(),blob=await PS.canvasToBlob(canvas,'image/png');await save(blob,(design?$('#dsName').value:doc.name||'imagem')+'.png',true);
 }
 function back(){
  const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(dialog){const cancel=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(cancel)&&dialog.open)dialog.close();return true;}
  const menu=$('#menubar');if(menu.classList.contains('mobile-menu-open')){menu.classList.remove('mobile-menu-open');$('#btnMobileMenu').setAttribute('aria-expanded','false');return true;}
  if(document.querySelector('.mobile-open')||$('#view-design').dataset.mobilePanel){PS.mobile.close();D.closePanel?.();return true;}
  return false;
 }
 async function prepareExit(){if(running||D.busy||PS.tools.isBusy()||!$('#busy').hidden){PS.toast('Conclua ou cancele a operação atual antes de sair.','warning');return;}await checkpoint(true);await request('close-app');}
 PS.android={request,checkpoint,back,prepareExit:safe(prepareExit),recover,shareImage};
 const menu=$('#menubar');for(const [title,action]of [['Salvar projeto',()=>document.body.dataset.mode==='design'?D.save():PS.saveProject()],['Compartilhar imagem',shareImage],['Recuperar trabalho',recover]]){const b=document.createElement('button');b.className='menu-btn android-menu-action';b.textContent=title;b.onclick=()=>{menu.classList.remove('mobile-menu-open');safe(action)();};menu.append(b);}
 const mark=document.createElement('span');mark.className='android-edition';mark.textContent='ANDROID';$('.brand-text').append(mark);
 doc.on(type=>{if(type==='load')backupEditor=null;});for(const type of ['pointerdown','pointerup','input','keydown'])addEventListener(type,()=>lastInput=Date.now(),{passive:true,capture:true});
 setInterval(()=>safe(checkpoint)(),60000);addEventListener('prisma:android-background',()=>safe(()=>checkpoint(true))());addEventListener('prisma:android-incoming',safe(incoming));
 request('ready').then(async info=>{if(info.incoming)await incoming();else if((await request('recovery-list')).length)await recover();}).catch(e=>PS.toast(e.message,'warning'));
})();
