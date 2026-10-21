/* Prisma Studio — produtividade de camadas e recorte de fundo por cor.
 * Alinhamento usa o conteúdo alfa; fundo é removido por máscara reversível.
 * Não usa IA, modelos remotos, credenciais ou serviços externos.
 */
(function(){
 'use strict';const PS=window.PS,d=PS.doc,$=PS.$;
 const ready=()=>{if(!d.has)return false;if(PS.tools.isBusy()){PS.toast('Conclua a ferramenta atual antes de aplicar esta ação.','info');return false;}return true;};
 PS.alignLayer=async direction=>{
  if(!ready())return;await d.ensureFlat();const L=d.layer,version=d.version,c=PS.cloneCanvas(L.canvas);
  if(L.mask&&L.maskEnabled){const x=PS.ctx(c);x.globalCompositeOperation='destination-in';x.drawImage(L.mask,0,0,c.width,c.height);}
  const b=await PS.run('alphaBounds',{img:PS.getImg(c)});if(d.layer!==L||d.version!==version)return;if(!b.w||!b.h)return;
  if(['left','center','right'].includes(direction))L.x=direction==='left'?-b.x:direction==='center'?Math.round((d.w-b.w)/2)-b.x:d.w-b.w-b.x;
  else L.y=direction==='top'?-b.y:direction==='middle'?Math.round((d.h-b.h)/2)-b.y:d.h-b.h-b.y;
  d.commit('Alinhar conteúdo da camada','fa-align-center','meta');
 };
 PS.removeUniformBackground=async opts=>{
  if(!ready())return;await d.ensureFlat();const L=d.layer,version=d.version;let result;
  await PS.withBusy('Recortando fundo uniforme','As cores conectadas às bordas serão ocultadas por uma máscara.',async progress=>{result=await PS.run('backgroundMask',{img:PS.getImg(L.canvas),opts},progress);});
  if(d.layer!==L||d.version!==version){PS.toast('O documento mudou durante o recorte. Tente novamente.','info');return;}
  let mask=PS.putImg(result);if(L.mask&&L.maskEnabled){const x=PS.ctx(mask);x.globalCompositeOperation='destination-in';x.drawImage(L.mask,0,0);}
  if(d.sel){const before=L.mask&&L.maskEnabled?L.mask:PS.canvas(L.canvas.width,L.canvas.height);if(!L.mask||!L.maskEnabled){const x=PS.ctx(before);x.fillStyle='#fff';x.fillRect(0,0,before.width,before.height);}mask=d.throughSelection(L,before,mask);}
  L.mask=mask;L.maskEnabled=true;d.editMask=false;d.commit('Remover fundo uniforme (máscara)','fa-mask');PS.toast('Fundo ocultado. Pinte ou exclua a máscara para refinar ou recuperar.','success');
 };
 PS.backgroundDialog=async()=>{
  if(!ready())return;const body=document.createElement('div');body.innerHTML='<p>Para fotos de produtos, logotipos e fundos de cor uniforme. Somente regiões ligadas às bordas são removidas; não é recorte de pessoas por IA.</p><label class="check"><input id="bgAuto" type="checkbox" checked> Identificar a cor pelos cantos</label><label class="color-row"><span>Cor manual do fundo</span><input id="bgColorValue" type="color" value="#ffffff"></label><label class="fld"><span>Tolerância de cor (0–100)</span><input class="input" id="bgTolerance" type="number" value="18" min="0" max="100"></label><label class="fld"><span>Suavizar contorno (px)</span><input class="input" id="bgSoftness" type="number" value="0.8" min="0" max="4" step="0.2"></label><p class="hint">A camada original será preservada. Se já existe máscara, o novo recorte é combinado com ela. A seleção atual limita a alteração.</p>';
  const result=await PS.dialog({title:'Remover fundo uniforme',body,okText:'Criar máscara'});if(!result)return;
  await PS.removeUniformBackground({color:$('#bgAuto').checked?null:$('#bgColorValue').value,tolerance:PS.clamp(+$('#bgTolerance').value||0,0,100),softness:PS.clamp(+$('#bgSoftness').value||0,0,4)});
 };
 function alignOptions(){return [['Esquerda','left'],['Centro horizontal','center'],['Direita','right'],['Topo','top'],['Centro vertical','middle'],['Base','bottom']];}
 PS.layerProductivityMenu=()=>alignOptions().map(([name,key])=>[name,'',()=>PS.alignLayer(key)]);
 const panel=document.createElement('section');panel.className='layer-productivity';panel.innerHTML='<h3 class="ph">Organizar e recortar</h3><div class="grid3">'+alignOptions().map(([name,key])=>`<button class="btn soft sm" data-layer-align="${key}">${name}</button>`).join('')+'</div><div class="grid2"><button class="btn soft sm" id="lyFlipH">Espelhar ↔</button><button class="btn soft sm" id="lyFlipV">Espelhar ↕</button></div><button class="btn soft block" id="lyRemoveBg">Remover fundo uniforme…</button><p class="hint">Alinhar considera os pixels visíveis e a máscara. O recorte de fundo preserva a camada original.</p>';
 $('#layersDock .ly-body').append(panel);
 const run=fn=>()=>Promise.resolve().then(fn).catch(e=>{console.error(e);PS.toast(e.message,'error');});
 panel.querySelectorAll('[data-layer-align]').forEach(b=>b.addEventListener('click',run(()=>PS.alignLayer(b.dataset.layerAlign))));$('#lyRemoveBg').addEventListener('click',run(PS.backgroundDialog));$('#lyFlipH').addEventListener('click',run(()=>ready()&&PS.flipLayer(true)));$('#lyFlipV').addEventListener('click',run(()=>ready()&&PS.flipLayer(false)));
 d.on(()=>panel.querySelectorAll('button').forEach(b=>b.disabled=!d.has));panel.querySelectorAll('button').forEach(b=>b.disabled=!d.has);
})();
