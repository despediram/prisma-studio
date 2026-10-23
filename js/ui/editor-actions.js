/* Prisma Studio — ações contextuais sempre acessíveis sobre a área de edição.
 * Usa o histórico existente e confirma/cancela ferramentas sem duplicar o motor.
 */
(function(){
 'use strict';const PS=window.PS,doc=PS.doc,C=PS.toolContext;
 const bar=document.createElement('div');bar.id='editorActions';bar.className='editor-actions';bar.setAttribute('aria-label','Ações da edição');
 function button(id,label,icon,action,primary=false){const b=document.createElement('button');b.id=id;b.type='button';b.className='btn sm '+(primary?'primary':'soft');b.title=label;b.setAttribute('aria-label',label);const i=document.createElement('i');i.className='fa-solid '+icon;i.setAttribute('aria-hidden','true');const span=document.createElement('span');span.textContent=label;b.append(i,span);b.onclick=action;bar.append(b);return b;}
 function history(action){if(C.cropApplying||C.stroke)return;if(C.textEdit)PS.tools.commitText();if(C.xf)PS.tools.cancelTransform();PS.mobile?.close();doc[action]();PS.view.fit();}
 PS.editorHistory=history;
 const undo=button('editUndo','Desfazer','fa-rotate-left',()=>history('undo'));
 const redo=button('editRedo','Refazer','fa-rotate-right',()=>history('redo'));
 const caption=document.createElement('span');caption.className='editor-action-caption';bar.append(caption);
 const options=button('editOptions','Opções','fa-sliders',()=>PS.mobile?.open('options'));
 const cancel=button('editCancel','Cancelar','fa-xmark',()=>{if(C.textEdit)PS.tools.cancelText();else PS.tools.cancelCrop();sync();});
 const apply=button('editApply','Aplicar corte','fa-check',()=>{if(C.textEdit){PS.tools.commitText();PS.mobile?.close();}else PS.tools.applyCrop();sync();},true);
 PS.$('#stage').append(bar);
 function sync(){
  bar.hidden=!doc.has;undo.disabled=!doc.canUndo()&&!C.textEdit;redo.disabled=!doc.canRedo()||!!C.textEdit;
  const crop=PS.tools.current==='crop',text=!!C.textEdit;
  caption.textContent=crop?'Recortar':text?'Editar texto':'';
  options.hidden=!crop&&!text;cancel.hidden=apply.hidden=!crop&&!text;
  apply.querySelector('span').textContent=text?'Concluir texto':'Aplicar corte';apply.setAttribute('aria-label',text?'Concluir texto':'Aplicar corte');
  apply.disabled=!!C.cropApplying||(crop&&(!C.crop||C.crop.w<1||C.crop.h<1));
  undo.disabled||=!!C.cropApplying;redo.disabled||=!!C.cropApplying;
 }
 window.addEventListener('prisma:toolchange',()=>{sync();if(PS.tools.current==='text'&&!C.textEdit)PS.mobile?.open('options');});
 doc.on(type=>{if(['load','change','layers'].includes(type))sync();});sync();
})();
