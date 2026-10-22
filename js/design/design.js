/* Prisma Studio — editor de convites e layouts com Fabric.js 6.9.0 (MIT).
 * Objetos, páginas e histórico próprios; o editor de pixels mantém PS.doc.
 * Fotos são incorporadas ao arquivo local. Não usa APIs do Canva ou servidores.
 */
(function(){
 'use strict';
 const PS=window.PS,F=window.fabric,$=PS.$;
 let canvas=null,pages=[],active=0,format='a5',busy=false,history=[],index=-1,timer=0,generation=0;
 F.FabricObject.customProperties=['prismaName','prismaLocked'];
 const MAX_BYTES=32*1024*1024;
 const D=PS.design={get canvas(){return canvas;},get pages(){return pages;},get active(){return active;},get format(){return format;},get busy(){return busy;},get revision(){return history[index]||'';},get generation(){return generation;}};
 const safe=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>{console.error(e);PS.toast('Não foi possível concluir: '+e.message,'error');});
 const on=(id,ev,fn)=>$('#'+id).addEventListener(ev,safe(fn));
 const fmt=()=>PS.designFormats[format];
 const state=()=>{savePage();return JSON.stringify({app:'Prisma Design',version:1,name:$('#dsName').value,format,active,pages});};
 function savePage(){if(canvas&&pages[active]){const o=canvas.getActiveObject(),objects=o instanceof F.ActiveSelection?[...o.getObjects()]:null;if(objects)canvas.discardActiveObject();pages[active].scene=canvas.toJSON(['prismaName','prismaLocked']);if(objects){canvas.setActiveObject(new F.ActiveSelection(objects,{canvas}));canvas.requestRenderAll();}}}
 function commit(){if(busy||!canvas)return;const value=state();if(history[index]===value)return;history.splice(index+1);history.push(value);index=history.length-1;let bytes=history.reduce((n,s)=>n+s.length*2,0);while(bytes>MAX_BYTES&&history.length>1){bytes-=history.shift().length*2;index--; }sync();}
 const later=()=>{clearTimeout(timer);timer=setTimeout(()=>{timer=0;commit();},250);};
 function init(){
  if(canvas)return;
  canvas=new F.Canvas('dsCanvas',{preserveObjectStacking:true,selection:true,backgroundColor:'#fff5e8'});
  canvas.on('object:modified',()=>{commit();sync();});canvas.on('text:editing:exited',()=>{commit();sync();});
  for(const event of ['selection:created','selection:updated','selection:cleared'])canvas.on(event,sync);
  pages=[{name:'Página 1',scene:{objects:[],background:'#fff5e8'}}];resize();D.ready=D.applyTemplate('birthday');
 }
 let viewZoom=1;
 function resize(){if(!canvas)return;const r=$('#dsStage').getBoundingClientRect(),f=fmt(),z=Math.max(.02,Math.min((r.width-40)/f.w,(r.height-40)/f.h)*viewZoom);canvas.setDimensions({width:Math.max(1,Math.round(f.w*z)),height:Math.max(1,Math.round(f.h*z))});canvas.setViewportTransform([z,0,0,z,0,0]);canvas.requestRenderAll();}
 D.activate=async()=>{init();await D.ready;requestAnimationFrame(resize);};new ResizeObserver(resize).observe($('#dsStage'));
 async function load(data){
  if(data?.app!=='Prisma Design'||data.version!==1||!PS.designFormats[data.format]||!Array.isArray(data.pages)||!data.pages.length||data.pages.length>40)throw Error('Arquivo de design inválido ou com mais de 40 páginas.');
  // Só aceita o subconjunto de objetos emitido por este editor. Imagens externas
  // não são carregadas: a abertura do arquivo continua local, sem requisições.
  const allowed=new Set(['Rect','Circle','Ellipse','Triangle','Polygon','Path','Textbox','Group','Image']);let objects=0;
  function check(o,depth=0){if(depth>12||++objects>5000||!allowed.has(o.type))throw Error('Objeto não suportado no design.');if(o.type==='Image'&&!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(o.src||''))throw Error('A imagem precisa estar incorporada ao design.');if(o.filters&&(!Array.isArray(o.filters)||o.filters.some(f=>!['Grayscale','Sepia','Brightness','Contrast','Saturation'].includes(f.type))))throw Error('Efeito de foto não suportado.');if(o.objects){if(!Array.isArray(o.objects))throw Error('Grupo inválido.');o.objects.forEach(v=>check(v,depth+1));}for(const k of ['clipPath','fill','stroke'])if(o[k]&&typeof o[k]==='object')throw Error('Recurso externo não suportado neste arquivo.');}
  data.pages.forEach(p=>{if(p.scene?.backgroundImage||p.scene?.overlayImage||p.scene?.clipPath||p.scene?.overlay)throw Error('Recurso de página não suportado.');if(!p.scene||!Array.isArray(p.scene.objects))throw Error('Página inválida.');p.scene.objects.forEach(o=>check(o));if(typeof p.scene.background!=='string'||!/^#[a-f0-9]{6}$/i.test(p.scene.background))throw Error('Fundo inválido.');});
  busy=true;try{pages=data.pages;format=data.format;active=Math.max(0,Math.min(data.active||0,pages.length-1));$('#dsName').value=String(data.name||'Meu design');$('#dsFormat').value=format;await canvas.loadFromJSON(pages[active].scene);resize();sync();}finally{busy=false;}
 }
 D.load=async data=>{init();await D.ready;await load(data);generation++;history=[];index=-1;commit();};
 async function goto(i){if(timer){const direction=i-index;clearTimeout(timer);timer=0;commit();i=index+direction;}if(i<0||i>=history.length||busy)return;await load(JSON.parse(history[i]));index=i;sync();}
 D.undo=()=>goto(index-1);D.redo=()=>goto(index+1);
 async function switchPage(i){if(busy||i===active)return;savePage();busy=true;try{active=i;await canvas.loadFromJSON(pages[i].scene);resize();sync();}finally{busy=false;}}
 function add(o,name){o.set({prismaName:name||o.type,cornerColor:'#00a7e1',borderColor:'#00a7e1',transparentCorners:false,touchCornerSize:32});canvas.add(o);return o;}
 const text=(content,left,top,width,size,color,extra={})=>add(new F.Textbox(content,{left,top,width,fontSize:size,fill:color,fontFamily:'Georgia',textAlign:'center',...extra}),'Texto');
 D.applyTemplate=async id=>{
  init();if(busy){await D.ready;if(busy)return;}const t=PS.designTemplates.find(t=>t.id===id);if(!t)return;busy=true;
  try{await PS.designFontsReady;const scene=PS.designTemplateScene(t,fmt().w,fmt().h);canvas.discardActiveObject();canvas.clear();canvas.backgroundColor=scene.background;scene.objects.forEach(o=>add(o,o.prismaName));canvas.requestRenderAll();savePage();sync();}
  finally{busy=false;commit();}
 };
 function selected(){return canvas?.getActiveObject();}
 function update(prop,value){const o=selected();if(!o||o.prismaLocked)return;o.set(prop,value);o.setCoords();canvas.requestRenderAll();sync(false);later();}
 function sync(rebuild=true){
  if(!canvas)return;const o=selected(),isText=o instanceof F.Textbox;
  $('#dsUndo').disabled=index<=0;$('#dsRedo').disabled=index>=history.length-1;
  $('#dsText').disabled=!isText;if(document.activeElement!==$('#dsText'))$('#dsText').value=isText?o.text:'';$('#dsFont').disabled=!isText;$('#dsFontSize').disabled=!isText;
  if(isText){if(document.activeElement!==$('#dsFont'))$('#dsFont').value=o.fontFamily;if(document.activeElement!==$('#dsFontSize'))$('#dsFontSize').value=o.fontSize;}
  $('#dsBackground').value=canvas.backgroundColor||'#ffffff';
  if(o){if(typeof o.fill==='string'&&/^#[\da-f]{6}$/i.test(o.fill))$('#dsFill').value=o.fill;$('#dsOpacity').value=Math.round(o.opacity*100);$('#dsOpacityOut').textContent=Math.round(o.opacity*100)+'%';if(document.activeElement!==$('#dsAngle'))$('#dsAngle').value=Math.round(o.angle);if(document.activeElement!==$('#dsStrokeWidth'))$('#dsStrokeWidth').value=o.strokeWidth||0;}
  $('#dsStatus').textContent=`${fmt().w} × ${fmt().h} px · ${canvas.getObjects().length} objetos`;
  window.dispatchEvent(new Event('prisma:designchange'));
  if(!rebuild)return;
  const list=$('#dsObjects');list.replaceChildren();[...canvas.getObjects()].reverse().forEach(obj=>{const b=document.createElement('button');b.className='design-object'+(o===obj?' active':'');b.textContent=(obj.prismaLocked?'🔒 ':'')+(obj.text?.split('\n')[0].slice(0,32)||obj.prismaName||obj.type);b.addEventListener('click',e=>{if(D.selectObject)D.selectObject(obj,e.shiftKey);else canvas.setActiveObject(obj);canvas.requestRenderAll();sync();});list.append(b);});
  const pageList=$('#dsPages');pageList.replaceChildren();pages.forEach((p,i)=>{const b=document.createElement('button');b.className='btn '+(i===active?'primary':'soft')+' sm';b.textContent=p.name;b.addEventListener('click',safe(()=>switchPage(i)));pageList.append(b);});
 }
 D.addText=kind=>{init();const f=fmt(),u=Math.min(f.w,f.h),preset=typeof kind==='string'?kind:'default',sizes={heading:.085,subheading:.045,body:.028,default:.06},content={heading:'Seu título aqui',subheading:'Um subtítulo para sua ideia',body:'Escreva a sua mensagem. Cada detalhe pode ser seu.',default:'Escreva seu texto'},o=text(content[preset]||content.default,f.w*.2,f.h*.4,f.w*.6,u*(sizes[preset]||sizes.default),'#312b45',{fontFamily:preset==='heading'?'Cormorant Garamond':'DM Sans',fontWeight:preset==='heading'?'bold':'normal'});canvas.setActiveObject(o);commit();canvas.requestRenderAll();};
 D.addShape=kind=>{init();const u=Math.min(fmt().w,fmt().h),base={left:fmt().w*.35,top:fmt().h*.4,fill:$('#dsFill').value},size=u*.22;let o;
  if(kind==='circle')o=new F.Circle({...base,radius:size/2});else if(kind==='triangle')o=new F.Triangle({...base,width:size,height:size});else if(kind==='star'){const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?size*.22:size*.5;pts.push({x:size/2+Math.cos(a)*r,y:size/2+Math.sin(a)*r});}o=new F.Polygon(pts,base);}else if(kind==='heart')o=new F.Path('M 50 90 C 20 65 0 50 8 25 C 16 0 42 4 50 25 C 58 4 84 0 92 25 C 100 50 80 65 50 90 Z',{...base,scaleX:size/100,scaleY:size/100});else o=new F.Rect({...base,width:size,height:kind==='line'?u*.007:size,rx:kind==='rect'?u*.015:0});
  add(o,kind==='heart'?'Coração':kind==='star'?'Estrela':'Forma');canvas.setActiveObject(o);commit();canvas.requestRenderAll();
 };
 D.duplicate=async()=>{const o=selected();if(!o)return;const c=await o.clone(['prismaName','prismaLocked']);c.set({left:o.left+25,top:o.top+25});if(c instanceof F.ActiveSelection){c.canvas=canvas;c.forEachObject(obj=>canvas.add(obj));}else canvas.add(c);canvas.setActiveObject(c);commit();canvas.requestRenderAll();};
 D.remove=()=>{const objects=canvas.getActiveObjects().filter(o=>!o.prismaLocked);canvas.discardActiveObject();objects.forEach(o=>canvas.remove(o));commit();canvas.requestRenderAll();};
 D.save=async()=>{init();commit();const blob=new Blob([state()],{type:'application/json'});if(PS.desktop)return PS.desktop.saveDesign(blob);PS.download(blob,($('#dsName').value||'design')+'.prismadesign');PS.toast('Design salvo com páginas e objetos editáveis.','success');return true;};
 D.toCanvas=()=>{init();canvas.discardActiveObject();const f=fmt(),v=[...canvas.viewportTransform];try{canvas.setViewportTransform([1,0,0,1,0,0]);return canvas.toCanvasElement(1,{left:0,top:0,width:f.w,height:f.h,enableRetinaScaling:false});}finally{canvas.setViewportTransform(v);canvas.requestRenderAll();}};
 D.exportPng=async()=>PS.download(await PS.canvasToBlob(D.toCanvas(),'image/png'),($('#dsName').value||'design')+'.png');
 D.exportPdf=async()=>{savePage();const all=JSON.parse(JSON.stringify(pages)),f={...fmt()};await PS.withBusy('Exportando design','Preparando as páginas em alta resolução…',async progress=>{
  const pdf=await PDFLib.PDFDocument.create(),off=new F.StaticCanvas(null,{width:f.w,height:f.h,enableRetinaScaling:false});
  try{for(let i=0;i<all.length;i++){await off.loadFromJSON(all[i].scene);const c=off.toCanvasElement(),img=await pdf.embedPng(new Uint8Array(await (await PS.canvasToBlob(c)).arrayBuffer())),w=(f.mmW||f.w/300*25.4)*PS.PT_PER_MM,h=(f.mmH||f.h/300*25.4)*PS.PT_PER_MM;pdf.addPage([w,h]).drawImage(img,{x:0,y:0,width:w,height:h});progress((i+1)/all.length);await PS.nextFrame();}PS.download(new Blob([await pdf.save()],{type:'application/pdf'}),($('#dsName').value||'design')+'.pdf');}finally{await off.dispose();}
 });};
 D.edit={commit,later,sync,selected,add,fmt,update,resize,zoom:delta=>{viewZoom=PS.clamp(viewZoom*delta,.5,4);resize();},serialize:state};
 D.key=(e,typing)=>{const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();if(mod&&k==='s'){D.save();return true;}if(mod&&k==='o'){$('#dsProjectInput').click();return true;}if(typing||selected()?.isEditing)return false;if(mod&&k==='z'){safe(e.shiftKey?D.redo:D.undo)();return true;}if(mod&&k==='y'){safe(D.redo)();return true;}if(mod&&k==='d'){safe(D.duplicate)();return true;}if(k==='delete'||k==='backspace'){D.remove();return true;}if(k==='escape'){canvas.discardActiveObject();canvas.requestRenderAll();return true;}if(k.startsWith('arrow')&&selected()){const o=selected();if(o.prismaLocked)return true;const step=e.shiftKey?10:1;o.set({left:o.left+(k==='arrowright'?step:k==='arrowleft'?-step:0),top:o.top+(k==='arrowdown'?step:k==='arrowup'?-step:0)});o.setCoords();canvas.requestRenderAll();later();return true;}return false;};
 for(const [id,fn]of Object.entries({dsAddText:D.addText,dsDuplicate:D.duplicate,dsDelete:D.remove,dsUndo:D.undo,dsRedo:D.redo,dsFit:()=>{viewZoom=1;resize();},dsSave:D.save,dsExportPng:D.exportPng,dsExportPdf:D.exportPdf,dsOpen:()=>$('#dsProjectInput').click(),dsAddImage:()=>$('#dsImageInput').click()}))on(id,'click',fn);
 PS.$$('[data-ds-shape]').forEach(b=>b.addEventListener('click',()=>D.addShape(b.dataset.dsShape)));
 PS.$$('[data-ds-align]').forEach(b=>b.addEventListener('click',()=>update('textAlign',b.dataset.dsAlign)));
 for(const [id,prop,convert]of [['dsText','text',v=>v],['dsFont','fontFamily',v=>v],['dsFontSize','fontSize',v=>PS.clamp(+v||6,6,1000)],['dsFill','fill',v=>v],['dsStroke','stroke',v=>v],['dsStrokeWidth','strokeWidth',v=>PS.clamp(+v,0,100)],['dsAngle','angle',v=>+v||0],['dsOpacity','opacity',v=>+v/100]])on(id,'input',e=>update(prop,convert(e.target.value)));
 on('dsBold','click',()=>update('fontWeight',selected()?.fontWeight==='bold'?'normal':'bold'));on('dsItalic','click',()=>update('fontStyle',selected()?.fontStyle==='italic'?'normal':'italic'));
 on('dsBackground','input',e=>{canvas.backgroundColor=e.target.value;canvas.requestRenderAll();later();});
 on('dsCenterX','click',()=>{const o=selected();if(!o||o.prismaLocked)return;const box=o.getBoundingRect();o.set({left:o.left+fmt().w/2-box.left-box.width/2});o.setCoords();canvas.requestRenderAll();commit();});
 on('dsCenterY','click',()=>{const o=selected();if(!o||o.prismaLocked)return;const box=o.getBoundingRect();o.set({top:o.top+fmt().h/2-box.top-box.height/2});o.setCoords();canvas.requestRenderAll();commit();});
 on('dsForward','click',()=>{if(selected()){canvas.bringObjectForward(selected());commit();canvas.requestRenderAll();}});on('dsBackward','click',()=>{if(selected()){canvas.sendObjectBackwards(selected());commit();canvas.requestRenderAll();}});
 on('dsGroup','click',()=>{const o=selected();if(!(o instanceof F.ActiveSelection))return;const objects=o.getObjects();canvas.discardActiveObject();objects.forEach(v=>canvas.remove(v));const group=add(new F.Group(objects),'Grupo');canvas.setActiveObject(group);commit();canvas.requestRenderAll();});
 on('dsUngroup','click',()=>{const o=selected();if(!(o instanceof F.Group)||o instanceof F.ActiveSelection||o.prismaLocked)return;const items=o.removeAll();canvas.remove(o);items.forEach(v=>canvas.add(v));canvas.discardActiveObject();commit();canvas.requestRenderAll();});
 on('dsLock','click',()=>{const o=selected();if(!o)return;const v=!o.prismaLocked;o.set({prismaLocked:v,lockMovementX:v,lockMovementY:v,lockScalingX:v,lockScalingY:v,lockRotation:v,editable:!v});commit();canvas.requestRenderAll();});
 on('dsImageInput','change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>25*1024*1024)throw Error('Use uma foto com até 25 MB.');const img=await PS.loadImageFile(file),c=PS.canvas(img.naturalWidth,img.naturalHeight);PS.ctx(c).drawImage(img,0,0);const object=await F.FabricImage.fromURL(c.toDataURL('image/png'));const k=Math.min(fmt().w*.75/object.width,fmt().h*.65/object.height);object.set({scaleX:k,scaleY:k,left:(fmt().w-object.width*k)/2,top:(fmt().h-object.height*k)/2});add(object,'Foto');canvas.setActiveObject(object);commit();canvas.requestRenderAll();});
 on('dsProjectInput','change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>40*1024*1024)throw Error('O design excede 40 MB.');await D.load(JSON.parse(await f.text()));});
 on('dsAddPage','click',async()=>{if(pages.length>=40)throw Error('Limite de 40 páginas.');savePage();pages.push({name:'Página '+(pages.length+1),scene:{objects:[],background:'#ffffff'}});await switchPage(pages.length-1);commit();});
 on('dsDuplicatePage','click',async()=>{if(pages.length>=40)throw Error('Limite de 40 páginas.');savePage();pages.push({...JSON.parse(JSON.stringify(pages[active])),name:'Página '+(pages.length+1)});await switchPage(pages.length-1);commit();});
 on('dsDeletePage','click',async()=>{if(pages.length<=1)throw Error('Mantenha pelo menos uma página.');pages.splice(active,1);active=Math.min(active,pages.length-1);busy=true;try{await canvas.loadFromJSON(pages[active].scene);resize();}finally{busy=false;}commit();});
 on('dsFormat','change',e=>{savePage();const previous=fmt(),next=PS.designFormats[e.target.value],scale=Math.min(next.w/previous.w,next.h/previous.h),dx=(next.w-previous.w*scale)/2,dy=(next.h-previous.h*scale)/2;
  pages.forEach(p=>p.scene.objects.forEach(o=>{o.left=o.left*scale+dx;o.top=o.top*scale+dy;o.scaleX=(o.scaleX??1)*scale;o.scaleY=(o.scaleY??1)*scale;}));format=e.target.value;catalog();safe(async()=>{busy=true;try{await canvas.loadFromJSON(pages[active].scene);resize();}finally{busy=false;}commit();})();});
 on('dsToEditor','click',async()=>{if(PS.doc.has&&!await PS.dialog({title:'Enviar página ao editor',body:'<p>A página do design substituirá o documento aberto no Editor. Salve o projeto atual antes de continuar.</p>',okText:'Substituir documento'}))return;const c=D.toCanvas();PS.doc.load(c,$('#dsName').value||'Design');PS.afterOpen();await PS.setMode('editor');PS.toast('Página enviada ao editor. O design continua editável na aba Design.','success');});
 window.addEventListener('beforeunload',e=>{if(history.length>1){e.preventDefault();e.returnValue='';}});
 const thumbs=new Map();
 function catalog(){
  const f=fmt(),thumbW=240,thumbH=Math.round(240*f.h/f.w),q=$('#dsSearch').value.toLocaleLowerCase('pt-BR'),category=$('#dsCategory').value,el=$('#dsTemplates');el.replaceChildren();
  const items=PS.designTemplates.filter(t=>(!category||t.category===category)&&(t.name+' '+t.category).toLocaleLowerCase('pt-BR').includes(q));
  $('#dsCatalogStatus').textContent=items.length?`${items.length} composições editáveis`:'Nenhum modelo encontrado. Tente outra categoria.';
  items.forEach(t=>{const b=document.createElement('button');b.className='design-template';b.setAttribute('aria-label','Usar modelo '+t.name);const img=document.createElement('img');img.alt='Prévia de '+t.name;img.width=thumbW;img.height=thumbH;img.style.aspectRatio=f.w+'/'+f.h;const title=document.createElement('strong');title.textContent=t.name;const small=document.createElement('small');small.textContent=t.category;b.append(img,title,small);b.addEventListener('click',safe(async()=>{await D.applyTemplate(t.id);D.closePanel?.();}));el.append(b);
   const key=t.id+'|'+format;if(!thumbs.has(key))thumbs.set(key,Promise.resolve().then(async()=>{await PS.designFontsReady;const off=new F.StaticCanvas(null,{width:thumbW,height:thumbH,enableRetinaScaling:false}),scene=PS.designTemplateScene(t,thumbW,thumbH);off.backgroundColor=scene.background;off.add(...scene.objects);off.renderAll();const url=off.toDataURL({format:'png'});await off.dispose();return url;}));
   thumbs.get(key).then(url=>{img.src=url;}).catch(()=>{img.alt='Prévia indisponível';});
  });
 }
 [...new Set(PS.designTemplates.map(t=>t.category))].forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;$('#dsCategory').append(o);});on('dsCategory','change',catalog);
 for(const [key,f]of Object.entries(PS.designFormats)){const o=document.createElement('option');o.value=key;o.textContent=f.name;$('#dsFormat').append(o);}$('#dsFormat').value=format;on('dsSearch','input',catalog);catalog();
})();
