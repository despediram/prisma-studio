/* Prisma Studio — painéis móveis do editor e do pôster, sem duplicar controles.
 * Fecha painéis ao mudar de área e conserva a imagem disponível no centro.
 */
(function(){
 'use strict';const PS=window.PS,$=PS.$,mq=matchMedia('(max-width:860px)');
 const dock=document.createElement('nav');dock.className='mobile-workspace-dock';dock.setAttribute('aria-label','Painéis do estúdio');document.body.append(dock);
 const shade=document.createElement('div');shade.className='mobile-panel-backdrop';shade.hidden=true;document.body.append(shade);
 const targets=[$('#inspector'),$('.pside.left'),$('.pside.right')];
 targets.forEach(el=>{const head=document.createElement('div');head.className='mobile-sheet-title';const span=document.createElement('span');span.textContent=el.id==='inspector'?'Painel do editor':el.classList.contains('left')?'Configurar pôster':'Imprimir e montar';const b=document.createElement('button');b.className='btn ghost sm';b.textContent='Fechar';b.addEventListener('click',close);head.append(span,b);el.prepend(head);});
 function close(){targets.forEach(t=>t.classList.remove('mobile-open'));shade.hidden=true;dock.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded','false'));}
 function mode(){return document.querySelector('.mode.active')?.dataset.mode||'editor';}
 function render(){close();document.body.dataset.mode=mode();dock.replaceChildren();const entries=mode()==='poster'?[['settings','Papel e tamanho'],['export','Imprimir / salvar'],['fit','Ajustar vista']]:[['options','Ferramenta'],['adjust','Ajustes'],['layers','Camadas'],['fit','Ajustar vista']];
  for(const [key,label]of entries){const b=document.createElement('button');b.textContent=label;b.dataset.mobileAction=key;b.setAttribute('aria-expanded','false');b.addEventListener('click',()=>{if(key==='fit'){if(mode()==='editor')PS.view.fit();else PS.poster.drawPreview();return;}const panel=mode()==='poster'?targets[key==='settings'?1:2]:targets[0],was=panel.classList.contains('mobile-open')&&panel.dataset.mobileSection===key;close();if(was)return;panel.dataset.mobileSection=key;panel.classList.add('mobile-open');shade.hidden=false;b.setAttribute('aria-expanded','true');if(key==='layers')$('#layersDock').classList.remove('collapsed');});dock.append(b);}
 }
 shade.addEventListener('click',close);mq.addEventListener('change',close);PS.$$('.mode').forEach(b=>b.addEventListener('click',()=>{PS.design.closePanel?.();render();}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();PS.design.closePanel?.();}});render();
 // Também acompanha mudanças de modo programáticas (abrir design no editor).
 new MutationObserver(()=>{if(document.body.dataset.mode!==mode())render();}).observe($('.modes'),{subtree:true,attributes:true,attributeFilter:['class']});
})();
