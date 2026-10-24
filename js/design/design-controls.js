/* Prisma Studio — controles contextuais, alinhamento, fotos e interação móvel.
 * Amplia o editor de objetos existente sem substituir seu histórico ou formato.
 * Recortes usam cropX/cropY do Fabric e preservam a imagem incorporada original.
 */
(function(){
 'use strict';const PS=window.PS,D=PS.design,F=window.fabric,$=PS.$,E=D.edit;
 let multiple=false,canvasBound=false,guides=[];
 const mobile=()=>matchMedia('(max-width:860px)').matches;
 const run=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>{console.error(e);PS.toast(e.message,'error');});
 const on=(id,event,fn)=>$('#'+id).addEventListener(event,run(fn));
 const editable=()=>{const o=E.selected();return o&&!o.prismaLocked?o:null;};
 const finish=()=>{D.canvas.requestRenderAll();E.commit();};
 function library(tab){$('.design-library').dataset.tab=tab;PS.$$('[data-ds-library]').forEach(b=>{const active=b.dataset.dsLibrary===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',active);});PS.$$('[data-ds-section]').forEach(p=>p.hidden=p.dataset.dsSection!==tab);}
 function panel(name){
  const root=$('#view-design');root.dataset.mobilePanel=name||'';$('#dsPanelBackdrop').hidden=!name||!mobile();
  for(const [id,section]of [['dsPropertiesPanel','properties'],['dsLayersPanel','layers'],['dsExportPanel','export']])$('#'+id).hidden=mobile()&&!!name&&name!==section;
  if(['models','elements','text','photos','collages','backgrounds','sizes'].includes(name))library(name);
  PS.$$('[data-ds-mobile]').forEach(b=>b.setAttribute('aria-expanded',b.dataset.dsMobile===name));
 }
 D.closePanel=()=>panel('');D.openPanel=panel;D.openLibrary=library;
 PS.$$('[data-ds-library]').forEach(b=>b.addEventListener('click',()=>library(b.dataset.dsLibrary)));
 PS.$$('[data-ds-mobile]').forEach(b=>b.addEventListener('click',()=>panel($('#view-design').dataset.mobilePanel===b.dataset.dsMobile?'':b.dataset.dsMobile)));
 on('dsPanelBackdrop','click',D.closePanel);on('dsClosePanel','click',D.closePanel);on('dsEditSelection','click',()=>panel('properties'));
 matchMedia('(max-width:860px)').addEventListener('change',()=>{panel('');for(const id of ['dsPropertiesPanel','dsLayersPanel','dsExportPanel'])$('#'+id).hidden=false;});
 D.selectObject=(obj,shift=false)=>{
  const c=D.canvas;if((multiple||shift)&&!obj.prismaLocked){const list=c.getActiveObjects().filter(o=>!o.prismaLocked),set=list.includes(obj)?list.filter(o=>o!==obj):[...list,obj];c.discardActiveObject();if(set.length===1)c.setActiveObject(set[0]);else if(set.length>1)c.setActiveObject(new F.ActiveSelection(set,{canvas:c}));}
  else c.setActiveObject(obj);
 };
 on('dsMultiSelect','click',()=>{multiple=!multiple;$('#dsMultiSelect').setAttribute('aria-pressed',multiple);PS.toast(multiple?'Toque nos nomes dos objetos para selecionar vários.':'Seleção individual.','info');});
 PS.$$('[data-ds-text]').forEach(b=>b.addEventListener('click',()=>{D.addText(b.dataset.dsText);panel(mobile()?'':'properties');}));
 on('dsZoomIn','click',()=>E.zoom(1.2));on('dsZoomOut','click',()=>E.zoom(1/1.2));
 on('dsLineHeight','input',e=>E.update('lineHeight',PS.clamp(+e.target.value||1,.5,3)));
 on('dsCharSpacing','input',e=>E.update('charSpacing',PS.clamp(+e.target.value||0,-100,1000)));
 on('dsUnderline','click',()=>E.update('underline',!E.selected()?.underline));
 for(const [id,prop]of [['dsX','left'],['dsY','top']])on(id,'change',e=>E.update(prop,Number.isFinite(+e.target.value)?+e.target.value:0));
 for(const [id,prop]of [['dsWidth','width'],['dsHeight','height']])on(id,'change',e=>{const o=editable();if(!o)return;const v=PS.clamp(+e.target.value||1,1,20000);if(prop==='width')o.scaleToWidth(v);else o.scaleToHeight(v);o.setCoords();finish();});
 for(const [id,prop]of [['dsFlipX','flipX'],['dsFlipY','flipY']])on(id,'click',()=>E.update(prop,!E.selected()?.[prop]));
 on('dsShadow','input',e=>{const v=+e.target.value;$('#dsShadowOut').textContent=v;E.update('shadow',v?new F.Shadow({color:'#00000055',blur:v,offsetX:0,offsetY:v*.5}):null);});
 PS.$$('[data-ds-position]').forEach(b=>b.addEventListener('click',()=>{
  const o=editable();if(!o)return;const f=E.fmt(),r=o.getBoundingRect(),mode=b.dataset.dsPosition;
  o.set({left:o.left+(mode==='left'?-r.left:mode==='right'?f.w-r.left-r.width:0),top:o.top+(mode==='top'?-r.top:mode==='bottom'?f.h-r.top-r.height:0)});o.setCoords();finish();
 }));
 function distribute(axis){const c=D.canvas,items=c.getActiveObjects();if(items.length<3||items.some(o=>o.prismaLocked))return;const pos=axis==='x'?'left':'top',extent=axis==='x'?'width':'height';c.discardActiveObject();const sorted=items.map(o=>({o,b:o.getBoundingRect()})).sort((a,b)=>a.b[pos]-b.b[pos]),first=sorted[0].b,last=sorted.at(-1).b,gap=(last[pos]+last[extent]-first[pos]-sorted.reduce((v,p)=>v+p.b[extent],0))/(sorted.length-1);let cursor=first[pos];for(const item of sorted){item.o.set(pos,item.o[pos]+cursor-item.b[pos]);item.o.setCoords();cursor+=item.b[extent]+gap;}c.setActiveObject(new F.ActiveSelection(items,{canvas:c}));finish();}
 on('dsDistributeX','click',()=>distribute('x'));on('dsDistributeY','click',()=>distribute('y'));
 function crop(ratio){const o=editable();if(!(o instanceof F.FabricImage))return;if(o.prismaSlot){D.openPhotoFit(o);return;}const size=o.getOriginalSize(),center=o.getCenterPoint();let w=size.width,h=size.height;if(ratio){if(w/h>ratio)w=h*ratio;else h=w/ratio;}const scale=o.getScaledWidth()/w;o.set({cropX:(size.width-w)/2,cropY:(size.height-h)/2,width:w,height:h,scaleX:scale,scaleY:scale});o.setPositionByOrigin(center,'center','center');o.setCoords();finish();}
 PS.$$('[data-ds-crop]').forEach(b=>b.addEventListener('click',()=>crop({square:1,portrait:.8,wide:16/9}[b.dataset.dsCrop])));on('dsCropReset','click',()=>crop(null));
 PS.$$('[data-ds-photo-effect]').forEach(b=>b.addEventListener('click',()=>{const o=editable();if(!(o instanceof F.FabricImage))return;const k=b.dataset.dsPhotoEffect;o.filters=k==='mono'?[new F.filters.Grayscale()]:k==='warm'?[new F.filters.Sepia()]:k==='bright'?[new F.filters.Brightness({brightness:.12})]:[];o.applyFilters();finish();}));
 on('dsExportSvg','click',()=>{const c=D.canvas,f=E.fmt(),saved=c.svgViewportTransformation;c.discardActiveObject();try{c.svgViewportTransformation=false;const svg=c.toSVG({width:f.w,height:f.h,viewBox:{x:0,y:0,width:f.w,height:f.h}});PS.download(new Blob([svg],{type:'image/svg+xml'}),($('#dsName').value||'design')+'.svg');}finally{c.svgViewportTransformation=saved;c.requestRenderAll();}});
 function sync(){
  if(!D.canvas)return;if(!canvasBound)bindCanvas();const o=E.selected(),text=o instanceof F.Textbox,image=o instanceof F.FabricImage,multi=o instanceof F.ActiveSelection,locked=!!o?.prismaLocked,can=!!o&&!locked;
  $('#dsSelectionName').textContent=!o?'Selecione um objeto na página':multi?`${o.getObjects().length} objetos selecionados`:(image?'Foto':text?'Texto':o instanceof F.Group?'Grupo':'Forma')+(locked?' · bloqueado':' · editável');
  $('#dsSelectionHint').hidden=!!o;$('#dsObjectFields').hidden=!o;
  PS.$$('[data-ds-context]').forEach(p=>p.hidden=p.dataset.dsContext==='text'?!text:p.dataset.dsContext==='image'?!image:image||multi);
  for(const id of ['dsFont','dsFontSize','dsBold','dsItalic','dsUnderline','dsLineHeight','dsCharSpacing','dsText'])$('#'+id).disabled=!can||!text;
  for(const id of ['dsFill','dsStroke','dsStrokeWidth','dsAngle','dsOpacity','dsCenterX','dsCenterY','dsForward','dsBackward','dsDelete','dsX','dsY','dsWidth','dsHeight','dsFlipX','dsFlipY','dsShadow'])$('#'+id).disabled=!can;
  $('#dsLock').disabled=!o;$('#dsLock').textContent=locked?'Desbloquear objeto':'Bloquear objeto';$('#dsDuplicate').disabled=!o;
  $('#dsGroup').disabled=!multi||o.getObjects().some(v=>v.prismaLocked);$('#dsUngroup').disabled=!can||!(o instanceof F.Group)||multi;
  for(const id of ['dsDistributeX','dsDistributeY'])$('#'+id).disabled=!multi||o.getObjects().length<3||o.getObjects().some(v=>v.prismaLocked);
  PS.$$('[data-ds-position],[data-ds-crop],[data-ds-photo-effect],[data-ds-align]').forEach(b=>b.disabled=!can);
  if(!o)return;
  for(const [id,v]of [['dsX',Math.round(o.left)],['dsY',Math.round(o.top)],['dsWidth',Math.round(o.getScaledWidth())],['dsHeight',Math.round(o.getScaledHeight())],['dsShadow',o.shadow?.blur||0],['dsLineHeight',o.lineHeight||1],['dsCharSpacing',o.charSpacing||0]])if(document.activeElement!==$('#'+id))$('#'+id).value=v;
  $('#dsShadowOut').textContent=o.shadow?.blur||0;
  for(const [id,value]of [['dsBold',o.fontWeight==='bold'],['dsItalic',o.fontStyle==='italic'],['dsUnderline',!!o.underline]])$('#'+id).setAttribute('aria-pressed',value);
  PS.$$('[data-ds-align]').forEach(b=>b.setAttribute('aria-pressed',o.textAlign===b.dataset.dsAlign));
 }
 function bindCanvas(){
  canvasBound=true;const c=D.canvas;c.targetFindTolerance=8;F.FabricObject.prototype.touchCornerSize=32;F.FabricObject.prototype.cornerSize=11;
  c.on('object:moving',e=>{
   guides=[];if(!$('#dsSnap').checked||e.target.prismaLocked)return;const o=e.target,r=o.getBoundingRect(),center=o.getCenterPoint(),f=E.fmt(),z=c.getZoom(),threshold=6/z;
   const xs=[0,f.w/2,f.w],ys=[0,f.h/2,f.h];for(const v of c.getObjects()){if(v===o||v.group===o)continue;const b=v.getBoundingRect();xs.push(b.left,b.left+b.width/2,b.left+b.width);ys.push(b.top,b.top+b.height/2,b.top+b.height);}
   const nearest=(edges,targets)=>{let best=null;for(const a of edges)for(const b of targets)if(Math.abs(a-b)<threshold&&(!best||Math.abs(a-b)<Math.abs(best.delta)))best={delta:b-a,target:b};return best;};
   const x=nearest([r.left,center.x,r.left+r.width],xs),y=nearest([r.top,center.y,r.top+r.height],ys);if(x){o.left+=x.delta;guides.push(['x',x.target]);}if(y){o.top+=y.delta;guides.push(['y',y.target]);}o.setCoords();
  });
  const clear=()=>{guides=[];c.requestRenderAll();};c.on('object:modified',clear);c.on('mouse:up',clear);
  c.on('after:render',()=>{if(!guides.length)return;const ctx=c.getContext(),v=c.viewportTransform,d=c.getRetinaScaling(),f=E.fmt();ctx.save();ctx.setTransform(v[0]*d,v[1]*d,v[2]*d,v[3]*d,v[4]*d,v[5]*d);ctx.strokeStyle='#c357ff';ctx.lineWidth=1/c.getZoom();for(const [axis,value]of guides){ctx.beginPath();ctx.moveTo(axis==='x'?value:0,axis==='y'?value:0);ctx.lineTo(axis==='x'?value:f.w,axis==='y'?value:f.h);ctx.stroke();}ctx.restore();});
 }
 window.addEventListener('prisma:designchange',sync);library('models');
})();
