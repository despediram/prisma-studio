/* Prisma Studio — catálogo pesquisável das ferramentas reais do editor.
 * Mantém o roteador existente e abre opções contextuais após a escolha no celular.
 */
(function(){
 'use strict';const P=window.PS,$=P.$;
 const dialog=document.createElement('dialog');dialog.id='toolboxDialog';dialog.className='toolbox-dialog';
 dialog.setAttribute('aria-labelledby','toolboxTitle');
 dialog.innerHTML='<header><div><small>PRISMA STUDIO</small><h2 id="toolboxTitle">O que vamos criar?</h2></div><button class="btn ghost icon" aria-label="Fechar ferramentas">✕</button></header><input class="input" type="search" placeholder="Buscar corte, texto, pincel…" aria-label="Buscar ferramentas"><div class="toolbox-grid"></div>';
 document.body.append(dialog);const search=dialog.querySelector('input'),grid=dialog.querySelector('.toolbox-grid');
 const items=[...document.querySelectorAll('.toolrail [data-tool]')].map(b=>({name:b.title.replace(/\s*\([^)]*\)/g,''),icon:b.querySelector('i').className,run:()=>{b.click();P.mobile?.open('options');}}));
 items.unshift({name:'Remover fundo com IA',icon:'fa-solid fa-wand-magic-sparkles',run:()=>P.openBackgroundAI()});
 function render(){const q=search.value.trim().toLocaleLowerCase('pt-BR');grid.replaceChildren();for(const item of items.filter(v=>v.name.toLocaleLowerCase('pt-BR').includes(q))){const b=document.createElement('button');b.type='button';b.className='toolbox-item';const icon=document.createElement('i');icon.className=item.icon;icon.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=item.name;b.append(icon,label);b.onclick=()=>{dialog.close();item.run();};grid.append(b);}if(!grid.children.length){const p=document.createElement('p');p.textContent='Nenhuma ferramenta encontrada.';grid.append(p);}}
 search.oninput=render;dialog.querySelector('header button').onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>e.stopPropagation());
 P.openToolbox=()=>{search.value='';render();dialog.showModal();search.focus();};
 const launch=document.createElement('button');launch.type='button';launch.id='btnToolbox';launch.className='tool';launch.title='Todas as ferramentas';launch.setAttribute('aria-label',launch.title);launch.innerHTML='<i class="fa-solid fa-grip"></i>';launch.onclick=P.openToolbox;$('.toolrail').prepend(launch);
 const icons={models:'fa-palette',photos:'fa-image',text:'fa-font',elements:'fa-shapes',collages:'fa-table-cells-large',backgrounds:'fa-fill-drip',sizes:'fa-ruler-combined',properties:'fa-sliders',layers:'fa-layer-group',export:'fa-download'};
 document.querySelectorAll('[data-ds-mobile]').forEach(b=>{const span=document.createElement('span');span.textContent=b.textContent;const i=document.createElement('i');i.className='fa-solid '+icons[b.dataset.dsMobile];i.setAttribute('aria-hidden','true');b.replaceChildren(i,span);});
})();
