/* Prisma Studio — biblioteca criativa autoral: textos, elementos, fotos, colagens e fundos.
 * Reutiliza objetos, páginas, exportação e histórico do Design. Sem ativos de terceiros.
 */
(function(){
 'use strict';const PS=window.PS,D=PS.design,E=D.edit,F=window.fabric,$=PS.$;
 const safe=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>PS.toast(e.message,'error',6000));
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const button=(label,fn,cls='btn soft')=>{const b=node('button',cls,label);b.type='button';b.onclick=safe(fn);return b;};
 function heading(el,kicker,title,description){el.append(node('small','creative-kicker',kicker),node('h3','creative-title',title),node('p','hint',description));}
 function finish(){D.canvas.requestRenderAll();E.commit();}
 function select(o){o.setCoords();D.canvas.setActiveObject(o);finish();D.closePanel();}
 function replaceBackground(){for(const o of [...D.canvas.getObjects()])if(o.prismaName?.startsWith('Fundo • '))D.canvas.remove(o);}
 const closeLibrary=button('Fechar biblioteca',()=>D.closePanel(),'btn ghost sm creative-close');closeLibrary.setAttribute('aria-label','Fechar biblioteca');$('.design-library').prepend(closeLibrary);
 const photos=$('#dsPhotosLibrary');heading(photos,'SUAS IMAGENS','Fotos que fazem parte da ideia','Adicione fotos do aparelho, use a imagem do Editor ou recorte o fundo da foto selecionada.');
 photos.append(button('+ Adicionar fotos',()=>$('#dsImageInput').click(),'btn primary block'),button('Usar imagem do Editor',async()=>{if(!PS.doc.has)throw Error('Abra uma imagem na aba Editor primeiro.');const c=await PS.doc.finalCanvas(),blob=await PS.canvasToBlob(c);await D.addPhoto(new File([blob],'Imagem do Editor.png',{type:'image/png'}));D.closePanel();}),button('Remover fundo com IA',()=>removePhotoBackground()));
 const recent=node('div','creative-photo-grid');photos.append(node('h4','','Fotos usadas nesta sessão'),recent);const photoFiles=[];
 window.addEventListener('prisma:photoadded',async e=>{const file=e.detail.file,key=file.name+'|'+file.size+'|'+file.lastModified;if(photoFiles.some(p=>p.key===key))return;photoFiles.unshift({key,file});if(photoFiles.length>8)photoFiles.pop();renderPhotos();});
 function renderPhotos(){recent.replaceChildren();for(const entry of photoFiles){const b=button(entry.file.name,async()=>{await D.addPhoto(entry.file);D.closePanel();},'creative-photo');const img=node('img');img.alt=entry.file.name;const url=URL.createObjectURL(entry.file);img.src=url;img.onload=img.onerror=()=>URL.revokeObjectURL(url);b.prepend(img);recent.append(b);}}
 async function removePhotoBackground(){
  const o=E.selected();if(!(o instanceof F.FabricImage)||o.prismaLocked)throw Error('Selecione uma foto desbloqueada na página.');
  const src=o.getSrc();if(!/^data:image\//.test(src))throw Error('Adicione uma foto do aparelho primeiro.');
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível ler essa foto.'));image.src=src;});
  E.commit();const revision=D.revision;
  PS.openBackgroundAI({source:image,name:o.prismaName||'Foto',apply:async mask=>{
   if(!D.canvas.getObjects().includes(o)||D.revision!==revision)throw Error('A página mudou. Reabra o recorte da foto.');
   const c=PS.canvas(image.naturalWidth,image.naturalHeight),x=PS.ctx(c);x.drawImage(image,0,0);x.globalCompositeOperation='destination-in';x.drawImage(mask,0,0);
   const saved={width:o.width,height:o.height,cropX:o.cropX,cropY:o.cropY,scaleX:o.scaleX,scaleY:o.scaleY,left:o.left,top:o.top};
   await o.setSrc(c.toDataURL('image/png'));o.set(saved);o.setCoords();finish();c.width=c.height=1;
  }});
 }
 D.removePhotoBackground=removePhotoBackground;
 const imageTools=$('[data-ds-context=image]');imageTools.prepend(button('Remover fundo com IA',removePhotoBackground,'btn primary block'));

 // Combinações de texto são objetos editáveis independentes, inseridos num único passo.
 const typePanel=$('[data-ds-section=text]'),search=node('input','input');search.id='dsTextSearch';search.type='search';search.placeholder='Buscar fontes e estilos';search.setAttribute('aria-label','Buscar fontes e estilos');typePanel.prepend(search);
 const styles=[
  {id:'editorial',label:'Elegância editorial',font:'Cormorant Garamond',color:'#354238',bg:'#edf1e7',title:'Uma história bonita',sub:'FEITA PARA COMPARTILHAR'},
  {id:'bold',label:'Título em destaque',font:'Bebas Neue',color:'#202029',bg:'#d9f65b',title:'SUA IDEIA\nEM DESTAQUE',sub:'SEU PRÓXIMO GRANDE PASSO'},
  {id:'sale',label:'Oferta irresistível',font:'DM Sans',color:'#ffffff',bg:'#c53768',title:'50% OFF',sub:'UMA OFERTA PARA APROVEITAR'},
  {id:'invite',label:'Convite delicado',font:'Cormorant Garamond',color:'#775274',bg:'#f6eaf3',title:'Você é nosso convidado',sub:'VAMOS CELEBRAR JUNTOS'},
  {id:'clean',label:'Simples e moderno',font:'DM Sans',color:'#0a5a65',bg:'#e6f6f6',title:'Menos pressa.\nMais ideias.',sub:'CADA DETALHE IMPORTA'},
  {id:'night',label:'Noite especial',font:'Bebas Neue',color:'#e7c7ff',bg:'#272137',title:'DEPOIS\nDO PÔR DO SOL',sub:'UMA NOITE PARA GUARDAR'}
 ];
 const styleGrid=node('div','creative-card-grid');typePanel.append(node('h4','','Combinações prontas'),styleGrid);
 D.addTextStyle=async id=>{
  const style=styles.find(s=>s.id===id);if(!style)return;await PS.designFontsReady;
  const f=E.fmt(),u=Math.min(f.w,f.h),title=E.add(new F.Textbox(style.title,{left:f.w*.12,top:f.h*.32,width:f.w*.76,fontFamily:style.font,fontSize:u*.085,fill:style.color,fontWeight:style.font==='DM Sans'?'bold':'normal',textAlign:'center',lineHeight:1.05}),'Título');
  const sub=E.add(new F.Textbox(style.sub,{left:f.w*.12,top:f.h*.32+title.height+u*.035,width:f.w*.76,fontFamily:'DM Sans',fontSize:u*.021,fill:style.color,charSpacing:100,textAlign:'center'}),'Subtítulo');
  D.canvas.discardActiveObject();D.canvas.setActiveObject(title);finish();D.openPanel(matchMedia('(max-width:860px)').matches?'':'properties');
 };
 const fontGrid=node('div','creative-font-grid');typePanel.append(node('h4','','Fontes com prévia'),fontGrid);
 const fontInput=node('input');fontInput.type='file';fontInput.accept='.ttf,.otf,.woff,.woff2';fontInput.hidden=true;fontInput.id='dsLocalFontInput';typePanel.append(button('Importar fonte do aparelho',()=>fontInput.click()),fontInput,node('p','hint','As fontes importadas ficam guardadas neste aparelho quando o armazenamento local está disponível. Leve o arquivo da fonte ao abrir o design em outro dispositivo.'));
 const installed=new Map();let fontDb;
 function db(){return fontDb||=(new Promise((resolve,reject)=>{const r=indexedDB.open('prisma-fontes',1);r.onupgradeneeded=()=>r.result.createObjectStore('fonts',{keyPath:'name'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
 async function installFont(name,bytes){const face=new FontFace(name,bytes);await face.load();if(installed.has(name))document.fonts.delete(installed.get(name));document.fonts.add(face);installed.set(name,face);if(!PS.toolContext.customFonts.includes(name))PS.toolContext.customFonts.push(name);if(![...$('#dsFont').options].some(o=>o.value===name)){const option=node('option','',name);option.value=name;$('#dsFont').append(option);}renderType();}
 fontInput.onchange=safe(async()=>{const file=fontInput.files[0];fontInput.value='';if(!file)return;if(file.size>10*1024*1024)throw Error('Escolha uma fonte com até 10 MB.');const name='Prisma '+file.name.replace(/\.[^.]+$/,'').replace(/[^\w -]/g,'').slice(0,60),bytes=await file.arrayBuffer();await installFont(name,bytes);try{const store=(await db()).transaction('fonts','readwrite').objectStore('fonts');store.put({name,bytes});}catch{}const o=E.selected();if(o instanceof F.Textbox){E.update('fontFamily',name);finish();}PS.toast('Fonte carregada: '+name,'success');});
 D.localFontsReady=(async()=>{try{const request=(await db()).transaction('fonts').objectStore('fonts').getAll();const all=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});for(const item of all.slice(0,30))try{await installFont(item.name,item.bytes);}catch{}}catch{}})();
 function renderType(){const q=search.value.trim().toLocaleLowerCase('pt-BR');styleGrid.replaceChildren();fontGrid.replaceChildren();for(const s of styles.filter(s=>(s.label+' '+s.font).toLocaleLowerCase('pt-BR').includes(q))){const b=button(s.label,()=>D.addTextStyle(s.id),'creative-type-card');b.style.background=s.bg;b.style.color=s.color;const sample=node('strong','',s.title);sample.style.fontFamily=s.font;b.prepend(sample);styleGrid.append(b);}for(const name of [...new Set(['DM Sans','Cormorant Garamond','Bebas Neue','Arial','Georgia','Courier New',...installed.keys()])].filter(n=>n.toLowerCase().includes(q))){const b=button(name,async()=>{let o=E.selected();if(!(o instanceof F.Textbox)){D.addText('heading');o=E.selected();}await document.fonts.load('32px "'+name+'"');E.update('fontFamily',name);finish();D.openPanel(matchMedia('(max-width:860px)').matches?'':'properties');},'creative-font');b.style.fontFamily=name;b.prepend(node('strong','','Sua ideia'));fontGrid.append(b);}}
 search.oninput=renderType;renderType();

 // Formas e adesivos vetoriais próprios, sem dependência de uma biblioteca remota.
 const elements=$('[data-ds-section=elements]'),elementSearch=node('input','input');elementSearch.id='dsElementSearch';elementSearch.type='search';elementSearch.placeholder='Buscar formas, setas e adesivos';elementSearch.setAttribute('aria-label','Buscar elementos');elements.prepend(elementSearch);const elementGrid=node('div','creative-card-grid');elements.append(elementGrid);
 const symbols=[
  ['spark','Brilho','M50 0 L61 38 L100 50 L61 62 L50 100 L39 62 L0 50 L39 38 Z'],
  ['arrow','Seta','M0 36 L62 36 L62 12 L100 50 L62 88 L62 64 L0 64 Z'],
  ['bubble','Balão de fala','M8 8 H92 V74 H40 L15 96 V74 H8 Z'],
  ['tag','Etiqueta','M0 8 H70 L100 50 L70 92 H0 Z'],
  ['crown','Coroa','M8 22 L30 48 L50 8 L70 48 L92 22 L84 86 H16 Z'],
  ['ribbon','Fita','M0 20 H100 L82 50 L100 80 H0 L18 50 Z'],
  ['leaf','Folha','M10 90 C-10 20 45 0 95 5 C95 65 60 110 10 90 Z'],
  ['petal','Flor','M50 32 C20 -20 -15 25 32 50 C-20 80 25 115 50 68 C80 120 115 75 68 50 C120 20 75 -15 50 32 Z'],
  ['bolt','Raio','M55 0 L15 58 H45 L35 100 L88 38 H58 L70 0 Z'],
  ['pin','Localização','M50 100 C35 75 10 55 10 35 C10 -10 90 -10 90 35 C90 55 65 75 50 100 Z']
 ];
 D.addSymbol=id=>{const spec=symbols.find(s=>s[0]===id);if(!spec)return;const f=E.fmt(),s=Math.min(f.w,f.h)*.22,o=E.add(new F.Path(spec[2],{fill:$('#dsFill').value,left:f.w*.4,top:f.h*.4}),spec[1]);o.scaleToWidth(s);select(o);};
 function renderElements(){const q=elementSearch.value.toLocaleLowerCase('pt-BR');elementGrid.replaceChildren();for(const [id,label,path]of symbols.filter(s=>s[1].toLocaleLowerCase('pt-BR').includes(q))){const b=button(label,()=>D.addSymbol(id),'creative-element');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-12 -12 124 124');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);p.setAttribute('fill','currentColor');svg.append(p);b.prepend(svg);elementGrid.append(b);}}elementSearch.oninput=renderElements;renderElements();

 // Colagens usam fotos separadas, preservadas no arquivo e enquadradas em células editáveis.
 const layouts={twoV:[[0,0,.5,1],[.5,0,.5,1]],twoH:[[0,0,1,.5],[0,.5,1,.5]],three:[[0,0,.6,1],[.6,0,.4,.5],[.6,.5,.4,.5]],four:[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]],six:Array.from({length:6},(_,i)=>[i%2/2,Math.floor(i/2)/3,.5,1/3]),nine:Array.from({length:9},(_,i)=>[i%3/3,Math.floor(i/3)/3,1/3,1/3])};
 D.collageLayouts=layouts;
 const collage=$('#dsCollagesLibrary');heading(collage,'FOTOS EM HARMONIA','Monte uma colagem','Escolha uma divisão e adicione as fotos. Depois, toque em Ajustar foto para mover e ampliar a imagem dentro de cada célula. A página atual é preservada.');
 let layout='four',files=[];const layoutGrid=node('div','creative-layout-grid');collage.append(layoutGrid);
 for(const [key,cells]of Object.entries(layouts)){const b=button(cells.length+' fotos',()=>{layout=key;layoutGrid.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));},'creative-layout');b.dataset.collage=key;b.setAttribute('aria-pressed',String(key===layout));const preview=node('div','creative-layout-preview');for(const [x,y,w,h]of cells){const cell=node('i');Object.assign(cell.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%'});preview.append(cell);}b.prepend(preview);layoutGrid.append(b);}
 const collageInput=node('input');collageInput.id='dsCollageInput';collageInput.type='file';collageInput.multiple=true;collageInput.accept='image/png,image/jpeg,image/webp';collageInput.hidden=true;
 const count=node('p','hint','Nenhuma foto selecionada.'),gap=node('input');gap.id='dsCollageGap';gap.type='range';gap.min=0;gap.max=80;gap.value=20;const gapLabel=node('label','sl');gapLabel.append(node('span','','Espaço entre fotos'),gap);const thumbs=node('div','creative-photo-grid');
 collage.append(button('Adicionar fotos à colagem',()=>collageInput.click(),'btn primary block'),collageInput,count,thumbs,button('Limpar fotos',()=>{files=[];count.textContent='Nenhuma foto selecionada.';thumbs.replaceChildren();}),gapLabel);
 collageInput.onchange=()=>{files=[...files,...collageInput.files].slice(0,9);collageInput.value='';count.textContent=files.length+' foto(s) selecionada(s).';thumbs.replaceChildren();for(const file of files){const img=node('img');img.alt=file.name;const url=URL.createObjectURL(file);img.src=url;img.onload=img.onerror=()=>URL.revokeObjectURL(url);thumbs.append(img);}};
 D.createCollage=async(key,images,spacing=20)=>{
  const cells=layouts[key];if(!cells||images.length<cells.length)throw Error('Adicione pelo menos '+(cells?.length||2)+' fotos para esta divisão.');
  const f={...E.fmt()},prepared=[];
  await PS.withBusy('Montando a colagem','Ajustando cada foto à sua célula…',async progress=>{for(let i=0;i<cells.length;i++){
   const [nx,ny,nw,nh]=cells[i],x=spacing+nx*(f.w-spacing),y=spacing+ny*(f.h-spacing),w=Math.round(nw*(f.w-spacing)-spacing),h=Math.round(nh*(f.h-spacing)-spacing);
   if(w<1||h<1)throw Error('Diminua o espaçamento para esse tamanho de página.');
   const o=await D.photoFrom(images[i]);D.fitPhoto(o,w,h);o.set({left:x,top:y,strokeWidth:0,prismaSlot:{w,h}});prepared.push(o);progress((i+1)/cells.length);await PS.nextFrame();
  }});
  await D.addPage();
  prepared.forEach((o,i)=>E.add(o,'Foto '+(i+1)));D.canvas.discardActiveObject();finish();D.closePanel();
 };
 collage.append(button('Criar colagem em nova página',()=>D.createCollage(layout,files,+gap.value),'btn primary block'));

 const backgrounds=$('#dsBackgroundsLibrary');heading(backgrounds,'A BASE DA COMPOSIÇÃO','Fundos e cores','Cores sólidas, degradês e padrões autorais. Alterar o fundo mantém os textos e fotos da página.');const swatches=node('div','creative-swatches');backgrounds.append(swatches);
 for(const color of ['#ffffff','#171a23','#edf1e7','#f7e9f4','#e4f4f4','#ffe9b8','#e6007e','#00a7e1','#d9f65b','#7952b3']){const b=button(color,()=>{replaceBackground();D.canvas.backgroundColor=color;finish();},'creative-swatch');b.style.background=color;b.setAttribute('aria-label','Fundo '+color);swatches.append(b);}
 const backgroundGrid=node('div','creative-card-grid');backgrounds.append(backgroundGrid);
 const bgSpecs=[['sunset','Pôr do sol','#ffb77e','#d66db7'],['ocean','Mar e céu','#123b5d','#5fd0cc'],['lavender','Lavanda','#e9ddff','#9f83d8'],['night','Noite profunda','#132c43','#5666ad'],['dots','Poás suaves','#f5f1e8','#c3b496'],['paper','Papel quadriculado','#f9f8ef','#c5d8d7']];
 D.setCreativeBackground=async id=>{const spec=bgSpecs.find(b=>b[0]===id);if(!spec)return;const f=E.fmt(),s=Math.min(1,1600/Math.max(f.w,f.h)),c=PS.canvas(Math.round(f.w*s),Math.round(f.h*s)),x=PS.ctx(c);if(id==='dots'||id==='paper'){x.fillStyle=spec[2];x.fillRect(0,0,c.width,c.height);x.strokeStyle=x.fillStyle=spec[3];const step=Math.max(16,c.width/22);if(id==='dots'){for(let j=step/2;j<c.height;j+=step)for(let i=step/2;i<c.width;i+=step){x.beginPath();x.arc(i,j,step*.08,0,Math.PI*2);x.fill();}}else{for(let i=0;i<c.width;i+=step){x.beginPath();x.moveTo(i,0);x.lineTo(i,c.height);x.stroke();}for(let j=0;j<c.height;j+=step){x.beginPath();x.moveTo(0,j);x.lineTo(c.width,j);x.stroke();}}}else{const gradient=x.createLinearGradient(0,0,c.width,c.height);gradient.addColorStop(0,spec[2]);gradient.addColorStop(1,spec[3]);x.fillStyle=gradient;x.fillRect(0,0,c.width,c.height);}const o=await F.FabricImage.fromURL(c.toDataURL('image/png'));replaceBackground();o.set({left:0,top:0,scaleX:f.w/o.width,scaleY:f.h/o.height,prismaLocked:true,lockMovementX:true,lockMovementY:true,lockScalingX:true,lockScalingY:true,lockRotation:true});E.add(o,'Fundo • '+spec[1]);D.canvas.sendObjectToBack(o);finish();D.closePanel();};
 for(const spec of bgSpecs){const b=button(spec[1],()=>D.setCreativeBackground(spec[0]),'creative-background');b.style.background='linear-gradient(135deg,'+spec[2]+','+spec[3]+')';backgroundGrid.append(b);}
 $('#dsBackground').addEventListener('input',()=>{if(D.canvas){replaceBackground();finish();}});

 const sizes=$('#dsSizesLibrary');heading(sizes,'COMECE NO FORMATO CERTO','Tamanhos prontos','O conteúdo é redimensionado proporcionalmente e centralizado. O formato do pôster continua independente.');const sizeGrid=node('div','creative-card-grid');sizes.append(sizeGrid);
 for(const [key,f]of Object.entries(PS.designFormats)){const b=button(f.name,async()=>{await D.resizePage(key);D.closePanel();},'creative-size');const preview=node('i');preview.style.aspectRatio=f.w+'/'+f.h;b.prepend(preview);sizeGrid.append(b);}
 const custom=node('div','creative-custom-size');custom.innerHTML='<h4>Tamanho personalizado</h4><div class="grid2"><label class="fld"><span>Largura</span><input class="input" id="dsCustomW" type="number" min="1" value="1080"></label><label class="fld"><span>Altura</span><input class="input" id="dsCustomH" type="number" min="1" value="1080"></label></div><select class="input" id="dsCustomUnit" aria-label="Unidade do tamanho"><option value="px">Pixels</option><option value="mm">Milímetros (300 DPI)</option><option value="cm">Centímetros (300 DPI)</option></select><label class="check"><input id="dsCustomLock" type="checkbox" checked> Manter proporção da página</label>';
 sizes.append(custom,button('Aplicar tamanho personalizado',async()=>{const unit=$('#dsCustomUnit').value,w=+$('#dsCustomW').value,h=+$('#dsCustomH').value,k=unit==='px'?1:300/25.4*(unit==='cm'?10:1);await D.resizePage('custom',{w:Math.round(w*k),h:Math.round(h*k),...(unit!=='px'?{mmW:w*(unit==='cm'?10:1),mmH:h*(unit==='cm'?10:1)}:{})});D.closePanel();},'btn primary block'));
 for(const id of ['dsCustomW','dsCustomH'])$('#'+id).oninput=()=>{if(!D.canvas||!$('#dsCustomLock').checked)return;const f=E.fmt();if(id==='dsCustomW')$('#dsCustomH').value=Math.round(+$('#dsCustomW').value*f.h/f.w*100)/100;else $('#dsCustomW').value=Math.round(+$('#dsCustomH').value*f.w/f.h*100)/100;};
 $('#dsCustomUnit').onchange=()=>{if(!D.canvas)return;const f=E.fmt(),unit=$('#dsCustomUnit').value,k=unit==='px'?1:25.4/300/(unit==='cm'?10:1);$('#dsCustomW').value=Math.round(f.w*k*100)/100;$('#dsCustomH').value=Math.round(f.h*k*100)/100;};
})();
