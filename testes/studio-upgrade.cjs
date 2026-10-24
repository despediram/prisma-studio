/* Prisma Studio — modelos, controles contextuais, recorte, máscaras e celular. */
const{chromium}=require('playwright'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.PRISMA_CHROMIUM||undefined,args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1500,height:1000},hasTouch:true}),errors=[],network=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.evaluate(()=>PS.setMode('design'));await p.waitForFunction(()=>document.querySelectorAll('#dsTemplates img[src]').length===PS.designTemplates.length);
 const models=await p.evaluate(()=>{
  const src=[...document.querySelectorAll('#dsTemplates img')].map(e=>e.src);if(new Set(src).size!==PS.designTemplates.length)throw Error('Miniaturas repetidas');
  let scenes=0;for(const t of PS.designTemplates)for(const f of Object.values(PS.designFormats)){const scene=PS.designTemplateScene(t,f.w,f.h);for(const o of scene.objects)if(o instanceof fabric.Textbox&&(o.left<0||o.top<0||o.left+o.width>f.w+1||o.top+o.height>f.h+1))throw Error('Texto fora da página '+t.id+' '+f.name);scenes++;}return{uniqueTemplates:new Set(src).size,scenes};
 });
 await p.locator('#dsCategory').selectOption('Casamento');assert.equal(await p.locator('#dsTemplates button').count(),await p.evaluate(()=>PS.designTemplates.filter(t=>t.category==='Casamento').length));await p.locator('#dsCategory').selectOption('');
 await p.locator('[data-ds-library=text]').click();await p.locator('[data-ds-text=heading]').click();
 await p.locator('#dsText').fill('Título com acentuação');await p.locator('#dsText').dispatchEvent('input');await p.locator('#dsLineHeight').fill('1.8');await p.locator('#dsLineHeight').dispatchEvent('input');await p.locator('#dsCharSpacing').fill('150');await p.locator('#dsCharSpacing').dispatchEvent('input');
 await p.locator('#dsFontSize').focus();await p.locator('#dsFontSize').press('ControlOrMeta+A');await p.locator('#dsFontSize').pressSequentially('128');assert.equal(await p.locator('#dsFontSize').inputValue(),'128');
 await p.locator('#dsUnderline').click();await p.locator('#dsShadow').fill('20');await p.locator('#dsShadow').dispatchEvent('input');await p.waitForTimeout(300);
 assert.deepEqual(await p.evaluate(()=>{const o=PS.design.canvas.getActiveObject();return[o.text,o.lineHeight,o.charSpacing,o.underline,o.shadow.blur]}),['Título com acentuação',1.8,150,true,20]);
 await p.locator('#dsLock').click();assert.equal(await p.locator('#dsFontSize').isDisabled(),true);await p.locator('#dsLock').click();
 await p.evaluate(()=>{const c=PS.design.canvas;PS.design.addShape('rect');PS.design.addShape('circle');PS.design.addShape('star');const os=c.getObjects().slice(-3);c.discardActiveObject();os.forEach((o,i)=>o.set({left:[50,500,1200][i],top:500}));c.setActiveObject(new fabric.ActiveSelection(os,{canvas:c}));});
 await p.locator('#dsDistributeX').click();assert(await p.evaluate(()=>{const c=PS.design.canvas,os=c.getActiveObjects();c.discardActiveObject();const a=os.map(o=>o.getBoundingRect()).sort((a,b)=>a.left-b.left);return Math.abs((a[1].left-a[0].left-a[0].width)-(a[2].left-a[1].left-a[1].width))<.01;}));
 const png=await p.evaluate(()=>{const c=PS.canvas(160,100),x=PS.ctx(c);x.fillStyle='#f08877';x.fillRect(0,0,160,100);x.fillStyle='#1288bb';x.fillRect(40,20,80,60);return c.toDataURL().split(',')[1];});
 await p.locator('#dsImageInput').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await p.waitForFunction(()=>PS.design.canvas.getActiveObject() instanceof fabric.FabricImage);
 assert.equal(await p.locator('[data-ds-context=image]').isVisible(),true);assert.equal(await p.locator('[data-ds-context=text]').isVisible(),false);
 await p.locator('[data-ds-crop=square]').click();await p.locator('[data-ds-photo-effect=mono]').click();
 assert(await p.evaluate(()=>{const o=PS.design.canvas.getActiveObject();return o.width===o.height&&o.cropX>0&&o.scaleX===o.scaleY&&o.filters.length===1;}));
 const exports=await p.evaluate(async()=>{const D=PS.design,downloads=[];PS.download=(blob,name)=>downloads.push({blob,name});D.save();const data=JSON.parse(await downloads.at(-1).blob.text());await D.load(data);const image=D.canvas.getObjects().find(o=>o instanceof fabric.FabricImage);if(image.cropX<=0||image.filters.length!==1)throw Error('Foto não reabriu com recorte/efeito');document.querySelector('#dsExportSvg').click();await new Promise(r=>setTimeout(r,20));const s=downloads.at(-1);if(!s.name.endsWith('.svg')||!(await s.blob.text()).includes('<svg'))throw Error('SVG');return{cropSaved:true,svg:true};});
 await p.evaluate(()=>PS.setMode('editor'));
 const engine=await p.evaluate(async()=>{
  const d=PS.doc,ok=(v,m)=>{if(!v)throw Error(m)},c=PS.canvas(64,64),x=PS.ctx(c);x.fillStyle='#fff';x.fillRect(0,0,64,64);x.fillStyle='#e64372';x.fillRect(16,16,32,32);x.fillStyle='#fff';x.fillRect(28,28,8,8);d.load(c,'Fundo uniforme');
  const before=PS.getImg(d.layer.canvas).d.slice();await PS.removeUniformBackground({tolerance:5,softness:0});const mask=d.layer.mask;ok(PS.ctx(mask).getImageData(1,1,1,1).data[3]===0,'Fundo não removeu');ok(PS.ctx(mask).getImageData(30,30,1,1).data[3]===255,'Região fechada foi apagada');const after=PS.getImg(d.layer.canvas).d;ok(before.every((v,i)=>v===after[i]),'Imagem original mudou');d.undo();ok(!d.layer.mask,'Undo máscara');d.redo();ok(!!d.layer.mask,'Redo máscara');
  const pixels=PS.canvas(20,20),a=PS.ctx(pixels);a.fillStyle='red';a.fillRect(3,6,5,7);d.addLayer(pixels,'Objeto');await PS.alignLayer('center');await PS.alignLayer('middle');ok(d.layer.x+3===30&&d.layer.y+6===29,'Alinhamento pelo conteúdo');ok(d.history.at(-1).patches.length===0,'Alinhamento guardou pixels');d.undo();d.redo();
  const worker=await PS.run('backgroundMask',{img:PS.getImg(c),opts:{color:'#ffffff',tolerance:5,softness:0}});const main=PrismaImgExtra.backgroundMask(PS.getImg(c),{color:'#ffffff',tolerance:5,softness:0});ok(worker.d.every((v,i)=>v===main.d[i]),'Worker/fallback divergiram');return{maskUndoRedo:true,closedRegionPreserved:true,metadataAlignment:true,workerFallbackExact:true};
 });
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:740,height:390}]){
  await p.setViewportSize(viewport);await p.evaluate(()=>PS.setMode('design'));assert(await p.locator('#dsCanvas').isVisible());assert(await p.locator('.design-mobile-dock').isVisible());
  await p.locator('[data-ds-mobile=models]').click();assert(await p.locator('.design-library').isVisible());await p.locator('#dsPanelBackdrop').click({position:{x:5,y:5}}).catch(async()=>{await p.evaluate(()=>PS.design.closePanel())});
  await p.locator('[data-ds-mobile=properties]').click();assert(await p.locator('.design-inspector').isVisible());await p.locator('#dsClosePanel').click();
  await p.evaluate(()=>PS.setMode('editor'));await p.locator('[data-mobile-action=layers]').click();assert(await p.locator('#layersDock').isVisible());await p.locator('#inspector .mobile-sheet-title button').click();
  await p.evaluate(()=>PS.setMode('poster'));await p.locator('[data-mobile-action=settings]').click();assert(await p.locator('#pSafeA4').isVisible());await p.locator('.pside.left .mobile-sheet-title button').click();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await p.setViewportSize({width:390,height:844});await p.evaluate(async()=>{await PS.setMode('design');PS.design.canvas.clear();PS.design.addShape('rect');PS.design.canvas.discardActiveObject();PS.design.canvas.requestRenderAll();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const touch=await p.evaluate(()=>{const c=PS.design.canvas,o=c.getObjects()[0],point=o.getCenterPoint(),r=c.upperCanvasEl.getBoundingClientRect(),v=c.viewportTransform;return{x:r.x+point.x*v[0]+v[4],y:r.y+point.y*v[3]+v[5]};});await p.touchscreen.tap(touch.x,touch.y);assert(await p.evaluate(()=>!!PS.design.canvas.getActiveObject()));
 const originalX=await p.evaluate(()=>PS.design.canvas.getObjects()[0].left);const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:1}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x+4*i,y:touch.y+3*i,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await p.evaluate(()=>PS.design.canvas.getObjects()[0].left),originalX);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log(JSON.stringify({...models,...exports,...engine,mobileViewports:4,errors,network},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
