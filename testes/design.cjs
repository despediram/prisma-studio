/* Prisma Studio — valida Design em file://, serialização e exportações reais. */
const {chromium}=require('playwright'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_CHROMIUM||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));await page.evaluate(()=>PS.setMode('design'));
 const results=await page.evaluate(async()=>{
  const D=PS.design,c=D.canvas,ok=(v,m)=>{if(!v)throw Error(m);};
  for(const t of PS.designTemplates){await D.applyTemplate(t.id);ok(c.getObjects().length>=4,'Modelo '+t.id);}
  await D.applyTemplate('wedding');let saved;const downloads=[];PS.download=(blob,name)=>{downloads.push({blob,name});};D.save();saved=JSON.parse(await downloads.at(-1).blob.text());
  ok(saved.pages[0].scene.objects.some(o=>o.type==='Ellipse'),'Folhas não serializadas');await D.load(saved);
  D.addText();const before=c.getObjects().length;await D.undo();ok(c.getObjects().length===before-1,'Undo');await D.redo();ok(c.getObjects().length===before,'Redo');
  c.setActiveObject(c.getObjects().at(-1));await D.duplicate();ok(c.getObjects().length===before+1,'Duplicar');
  const a=c.getObjects().slice(-2),positions=a.map(o=>[o.getBoundingRect().left,o.getBoundingRect().top]);c.setActiveObject(new fabric.ActiveSelection(a,{canvas:c}));document.querySelector('#dsGroup').click();await new Promise(r=>setTimeout(r,50));ok(c.getActiveObject() instanceof fabric.Group,'Agrupar');document.querySelector('#dsUngroup').click();await new Promise(r=>setTimeout(r,50));
  const ungrouped=c.getObjects().slice(-2);ungrouped.forEach((o,i)=>{const box=o.getBoundingRect();ok(Math.abs(box.left-positions[i][0])<.01&&Math.abs(box.top-positions[i][1])<.01,'Posição ao desagrupar');});
  c.setActiveObject(ungrouped[0]);document.querySelector('#dsLock').click();await new Promise(r=>setTimeout(r,20));ok(c.getActiveObject().prismaLocked,'Bloqueio');D.save();const locked=JSON.parse(await downloads.at(-1).blob.text());await D.load(locked);ok(c.getObjects().some(o=>o.prismaLocked),'Persistência do bloqueio');
  await D.exportPng();let png=downloads.at(-1),bitmap=await createImageBitmap(png.blob);ok(bitmap.width===1748&&bitmap.height===2480,'PNG resolução');bitmap.close();
  document.querySelector('#dsDuplicatePage').click();await new Promise(r=>setTimeout(r,100));ok(D.pages.length===2&&D.active===1,'Duplicar página');
  await D.exportPdf();const pdf=await PDFLib.PDFDocument.load(await downloads.at(-1).blob.arrayBuffer());ok(pdf.getPageCount()===2,'Páginas PDF');const size=pdf.getPage(0).getSize();ok(Math.abs(size.width/PS.PT_PER_MM-148)<.001&&Math.abs(size.height/PS.PT_PER_MM-210)<.001,'PDF físico');
  D.save();const valid=JSON.parse(await downloads.at(-1).blob.text());await D.load(valid);const bad=JSON.parse(JSON.stringify(valid));bad.pages[0].scene.objects.push({type:'Image',src:'https://example.com/a.png'});let rejected=false;try{await D.load(bad);}catch{rejected=true;}ok(rejected,'URL externa');
  return {templates:PS.designTemplates.length,png:'1748 × 2480',pdfPages:pdf.getPageCount(),pdfMm:[148,210],groupPosition:true,lock:true,externalImageRejected:rejected};
 });
 await page.locator('#dsFormat').selectOption('square');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>PS.design.toCanvas().width),1080);
 await page.locator('#dsToEditor').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>PS.doc.w),1080);
 await page.evaluate(()=>PS.setMode('design'));await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert(await page.locator('#dsCanvas').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log(JSON.stringify({...results,mobile:true,errors,network},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
