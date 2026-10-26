/* Prisma Studio — painéis móveis do editor e do pôster, sem duplicar controles.
 * Fecha painéis ao mudar de área e conserva a imagem disponível no centro.
 */
(function(){
 'use strict';const PS=window.PS,$=PS.$,mq=matchMedia('(max-width:860px)');
 let opener=null,previousPanel=null,reserveFrame=0;
 const menuButton=document.createElement('button');menuButton.id='btnMobileMenu';menuButton.className='btn icon ghost mobile-menu-toggle';menuButton.setAttribute('aria-label','Menu do aplicativo');menuButton.setAttribute('aria-expanded','false');menuButton.innerHTML='<i class="fa-solid fa-bars"></i>';$('.top-actions').prepend(menuButton);
 const menu=$('#menubar');menuButton.onclick=()=>{const on=menu.classList.toggle('mobile-menu-open');menuButton.setAttribute('aria-expanded',String(on));};
 const theme=document.createElement('button');theme.className='menu-btn mobile-menu-theme';theme.textContent='Alternar tema';theme.onclick=()=>$('#btnTheme').click();menu.append(theme);
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target)&&!menuButton.contains(e.target)){menu.classList.remove('mobile-menu-open');menuButton.setAttribute('aria-expanded','false');}});
 function viewport(){document.documentElement.style.setProperty('--prisma-viewport-height',(visualViewport?.height||innerHeight)+'px');}
 visualViewport?.addEventListener('resize',viewport);viewport();
 const dock=document.createElement('nav');dock.className='mobile-workspace-dock';dock.setAttribute('aria-label','Painéis do estúdio');document.body.append(dock);
 const shade=document.createElement('div');shade.className='mobile-panel-backdrop';shade.hidden=true;document.body.append(shade);
 const targets=[$('#inspector'),$('.pside.left'),$('.pside.right')];
 targets.forEach(el=>{const head=document.createElement('div');head.className='mobile-sheet-title';const span=document.createElement('span');span.textContent=el.id==='inspector'?'Painel do editor':el.classList.contains('left')?'Configurar pôster':'Imprimir e montar';const b=document.createElement('button');b.className='btn ghost sm';b.textContent='Fechar';b.addEventListener('click',close);const expand=document.createElement('button');expand.className='btn ghost sm mobile-expand';expand.type='button';expand.textContent='Expandir';expand.setAttribute('aria-expanded','false');expand.onclick=()=>{const open=el.classList.toggle('sheet-expanded');expand.textContent=open?'Reduzir':'Expandir';expand.setAttribute('aria-expanded',String(open));};head.append(span,expand,b);el.prepend(head);
 let start=null;head.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;start=e.clientY;head.setPointerCapture(e.pointerId);});head.addEventListener('pointerup',e=>{if(start===null)return;const dy=e.clientY-start;start=null;if(dy>60)close();else if(dy< -45&&!el.classList.contains('sheet-expanded'))expand.click();});});
 function close(){targets.forEach(t=>t.classList.remove('mobile-open','sheet-expanded'));shade.hidden=true;dock.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded','false'));scheduleReserve();}
 function open(key){
  if(!mq.matches)return false;
  const panel=mode()==='poster'?targets[key==='settings'?1:2]:targets[0];
  close();panel.dataset.mobileSection=key;panel.classList.add('mobile-open');panel.scrollTop=0;
  const eb=panel.querySelector('.mobile-expand');if(eb){eb.textContent='Expandir';eb.setAttribute('aria-expanded','false');}
  shade.hidden=mode()==='editor';dock.querySelector('[data-mobile-action="'+key+'"]')?.setAttribute('aria-expanded','true');
  if(key==='layers')$('#layersDock').classList.remove('collapsed');
  if(key==='prompt')$('#pPromptPanel').open=true;
  panel.querySelector('.mobile-sheet-title span').textContent=key==='prompt'?'Prompts para IA':panel===targets[2]?'Imprimir e montar':panel===targets[1]?'Configurar pôster':'Painel do editor';
  scheduleReserve();return true;
 }
 PS.mobile={close,open};
 window.addEventListener('prisma:toolchange',()=>{if(!mq.matches||mode()!=='editor'||!PS.doc.has)return;if(['hand','zoom'].includes(PS.tools.current))close();else open('options');});
 function mode(){return document.querySelector('.mode.active')?.dataset.mode||'editor';}
 function render(){close();document.body.dataset.mode=mode();dock.replaceChildren();const entries=mode()==='poster'?[['settings','Papel e tamanho'],['export','Imprimir / salvar'],['prompt','Prompts IA'],['fit','Ajustar vista']]:[['tools','Ferramentas'],['options','Opções'],['adjust','Ajustes'],['layers','Camadas'],['fit','Enquadrar']];
  for(const [key,label]of entries){const b=document.createElement('button');const icon={tools:'fa-paintbrush',options:'fa-sliders',adjust:'fa-sun',layers:'fa-layer-group',fit:'fa-expand',settings:'fa-ruler-combined',export:'fa-print',prompt:'fa-wand-magic-sparkles'}[key];b.innerHTML='<i class="fa-solid '+icon+'" aria-hidden="true"></i><span></span>';b.querySelector('span').textContent=label;b.dataset.mobileAction=key;b.setAttribute('aria-expanded','false');b.addEventListener('click',()=>{if(key==='tools'){close();PS.openToolbox();return;}if(key==='fit'){if(mode()==='editor')PS.view.fit();else PS.poster.drawPreview();return;}const panel=mode()==='poster'?targets[key==='settings'?1:2]:targets[0],was=panel.classList.contains('mobile-open')&&panel.dataset.mobileSection===key;close();if(was)return;opener=b;open(key);panel.querySelector('.mobile-sheet-title button:last-child')?.focus();});dock.append(b);}
 }
 $('#pPromptShortcut').addEventListener('click',()=>{
  if(!open('prompt')){const panel=$('#pPromptPanel');panel.open=true;panel.scrollIntoView({block:'start',behavior:'smooth'});}
 });
 shade.addEventListener('click' ,()=>{close();opener?.focus();});mq.addEventListener('change',close);PS.$$('.mode').forEach(b=>b.addEventListener('click',()=>{PS.design.closePanel?.();render();}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();PS.design.closePanel?.();}});render();
 // Reserva a altura real da gaveta para o painel não cobrir a arte.

 function scheduleReserve(){if(reserveFrame)return;reserveFrame=requestAnimationFrame(()=>{reserveFrame=0;reserve();});}
 function reserve(){
  const editor=$('#view-editor'),rail=editor.querySelector('.toolrail');
  if(mq.matches&&mode()==='editor'){
   const available=editor.getBoundingClientRect().height-(rail?.getBoundingClientRect().height||0)-dock.getBoundingClientRect().height;
   // Garante pelo menos metade da área útil para a imagem, inclusive com painel expandido.
   editor.style.setProperty('--editor-sheet-limit',Math.max(0,available*.48)+'px');
  }
  const active=mq.matches?targets.find(t=>t.classList.contains('mobile-open')):null;
  document.body.classList.toggle('mobile-panel-visible',!!active);
  const reserveValue=(active?.getBoundingClientRect().height||0)+'px';if(document.body.style.getPropertyValue('--mobile-sheet-reserve')!==reserveValue)document.body.style.setProperty('--mobile-sheet-reserve',reserveValue);
  const design=$('#view-design'),name=design.dataset.mobilePanel;
  const designPanel=mq.matches&&name?design.querySelector(['models','text','elements','photos','collages','backgrounds','sizes'].includes(name)?'.design-library':'.design-inspector'):null;
  const designValue=(designPanel?.getBoundingClientRect().height||0)+'px';if(design.style.getPropertyValue('--mobile-design-reserve')!==designValue)design.style.setProperty('--mobile-design-reserve',designValue);
  if(active&&active!==previousPanel&&mode()==='editor')requestAnimationFrame(()=>PS.view.fit());
  previousPanel=active;
 }
 window.addEventListener('resize',scheduleReserve);visualViewport?.addEventListener('resize',scheduleReserve);
 const panels=[...targets,$('.design-library'),$('.design-inspector'),$('#view-editor'),$('.topbar')];
 const sizes=new ResizeObserver(scheduleReserve),changes=new MutationObserver(scheduleReserve);for(const panel of panels){sizes.observe(panel);changes.observe(panel,{attributes:true,attributeFilter:['class','hidden']});}changes.observe($('#view-design'),{attributes:true,attributeFilter:['data-mobile-panel']});mq.addEventListener('change',scheduleReserve);
 // Também acompanha mudanças de modo programáticas (abrir design no editor).
 new MutationObserver(()=>{if(document.body.dataset.mode!==mode())render();}).observe($('.modes'),{subtree:true,attributes:true,attributeFilter:['class']});
})();
