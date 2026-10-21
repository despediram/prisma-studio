/* Prisma Studio — encaixe: pixels repetidos, coordenadas físicas, PDF e montagem. */
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_CHROMIUM||undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 const result=await page.evaluate(async()=>{
  const PS=window.PS,P=PS.poster,d=PS.doc,assert=(v,m)=>{if(!v)throw Error(m)},wait=ms=>new Promise(r=>setTimeout(r,ms));
  const source=PS.canvas(517,379),x=PS.ctx(source),id=x.createImageData(517,379);
  // Grade e curvas de alto contraste representam olhos/detalhes sobre emendas.
  for(let y=0;y<379;y++)for(let xx=0;xx<517;xx++){const i=(y*517+xx)*4;id.data[i]=(xx*7+y*13)%256;id.data[i+1]=(xx*11+y*3)%256;id.data[i+2]=(xx+y)%256;id.data[i+3]=255;}x.putImageData(id,0,0);
  const defaults={paperW:210,paperH:297,orient:'portrait',margin:5,overlap:10,mode:'grid',cols:2,rows:2,fit:'cover',zoom:1,panX:0,panY:0,border:0,skipBlank:false,enhance:0,lift:0};
  let pairs=0,pixels=0,maxPhysicalError=0;
  for(const settings of [{dpi:150,enhance:0,margin:5,overlap:10},{dpi:200,enhance:45,lift:15,margin:7.5,overlap:12.5},{dpi:300,enhance:85,margin:3.5,overlap:8.5},{dpi:400,enhance:0,margin:5.5,overlap:9.5}]){
   // Petit papier pour tester tous les DPI sans faire un test de charge de 500 MP.
   const cfg={...defaults,...settings,paperW:67.3,paperH:89.7},g=PS.posterGeometry(cfg,source.width,source.height),renderer=PS.createPosterRaster(source,g,cfg),tiles=[];
   for(const t of g.tiles){const out=await renderer.render({x:t.x0,y:t.y0,w:g.cw,h:g.ch},cfg.dpi);tiles.push({...out,tile:t});}
   for(const joint of PS.posterJoints(g)){
    const a=tiles.find(t=>t.tile.code===joint.a),b=tiles.find(t=>t.tile.code===joint.b),ag=a.placement.grid,bg=b.placement.grid;
    const ix=Math.max(ag.x,bg.x),iy=Math.max(ag.y,bg.y),iw=Math.min(ag.x+ag.w,bg.x+bg.w)-ix,ih=Math.min(ag.y+ag.h,bg.y+bg.h)-iy;
    const aa=PS.getImg(a.c,ix-ag.x,iy-ag.y,iw,ih).d,bb=PS.getImg(b.c,ix-bg.x,iy-bg.y,iw,ih).d;
    for(let i=0;i<aa.length;i++)assert(aa[i]===bb[i],`Pixels diferentes em ${joint.a}/${joint.b} a ${cfg.dpi} DPI, byte ${i}`);
    pixels+=aa.length/4;pairs++;
    for(const rotate of [false,true]){
     const ap=PS.posterPrintPlacement(g,a.tile,a.placement,rotate),bp=PS.posterPrintPlacement(g,b.tile,b.placement,rotate);
     // Em coordenadas anteriores à rotação, mesma amostra deve cair no mesmo mm do pôster.
     const globalA=a.tile.x0+g.margin+a.placement.x-a.tile.x0-g.margin+(ix-ag.x)/(cfg.dpi/25.4);
     const globalB=b.tile.x0+g.margin+b.placement.x-b.tile.x0-g.margin+(ix-bg.x)/(cfg.dpi/25.4);
     maxPhysicalError=Math.max(maxPhysicalError,Math.abs(globalA-globalB));
     assert(ap.clip.w===(rotate?g.ch:g.cw)&&bp.pageW===(rotate?g.pageH:g.pageW),'Rotação/clip');
    }
   }
   assert(renderer.cacheBytes<=64*1024*1024,'Cache ultrapassou orçamento');
  }
  // Folhas A4 completas em resolução de impressão, com nitidez ligada.
  {const cfg={...defaults,dpi:300,enhance:45,lift:10},g=PS.posterGeometry(cfg,source.width,source.height),renderer=PS.createPosterRaster(source,g,cfg),outs=[];
   for(const index of [0,1,2]){const t=g.tiles[index];outs.push({...await renderer.render({x:t.x0,y:t.y0,w:g.cw,h:g.ch},300),tile:t});}
   for(const b of [outs[1],outs[2]]){const a=outs[0],aa=a.placement.grid,bb=b.placement.grid,ix=Math.max(aa.x,bb.x),iy=Math.max(aa.y,bb.y),w=Math.min(aa.x+aa.w,bb.x+bb.w)-ix,h=Math.min(aa.y+aa.h,bb.y+bb.h)-iy;
    const ad=PS.getImg(a.c,ix-aa.x,iy-aa.y,w,h).d,bd=PS.getImg(b.c,ix-bb.x,iy-bb.y,w,h).d;for(let i=0;i<ad.length;i++)assert(ad[i]===bd[i],'A4 300 DPI com emenda divergente');pairs++;pixels+=ad.length/4;}
  }
  assert(maxPhysicalError<1e-9,'Erro de posição física');
  const exact=PS.posterGeometry({...defaults,mode:'size',targetW:770,targetH:1118,lock:false},9094,13205);
  assert(Math.abs(exact.finalW-770)<1e-9&&Math.abs(exact.finalH-1118)<1e-9,'Medidas finais');assert(exact.cols===4&&exact.rows===4,'Grade 770 × 1118');
  // A fonte do pôster deve ser a composição, inclusive durante edição da máscara.
  d.load(source,'Teste de emendas');const overlay=PS.canvas(517,379);PS.ctx(overlay).fillStyle='#ff007e';PS.ctx(overlay).fillRect(180,100,150,150);d.addLayer(overlay,'Olhos/detalhes');d.addMask();
  Object.assign(P.cfg,defaults,{paper:'A4',paperW:210,paperH:297,mode:'grid',cols:2,rows:2,margin:5,overlap:10,dpi:72,enhance:0,format:'png',guidePage:true,view:'plan'});
  await PS.setMode('poster');P.update();const sample=await P.renderRegion({x:P.geometry.img.x+5,y:P.geometry.img.y+5,w:10,h:10},72);assert(PS.getImg(sample.c).d[1]>0,'Pôster usou máscara/camada ativa');
  const pdf=await P.buildPdf(()=>{}),loaded=await PDFLib.PDFDocument.load(await pdf.arrayBuffer());assert(loaded.getPageCount()===5,'PDF mapa + 4 folhas');
  const pngs=[];for(const pg of loaded.getPages().slice(1)){assert(Math.abs(pg.getWidth()-210*PS.PT_PER_MM)<1e-6,'Papel PDF largura');assert(Math.abs(pg.getHeight()-297*PS.PT_PER_MM)<1e-6,'Papel PDF altura');}
  Object.assign(P.cfg,{orient:'landscape',pdfOrient:'portrait',guidePage:false});P.update();const rotated=await PDFLib.PDFDocument.load(await (await P.buildPdf(()=>{})).arrayBuffer());assert(rotated.getPages().every(pg=>pg.getWidth()<pg.getHeight()),'Sempre retrato');
  const calibration=await PDFLib.PDFDocument.load(await (await P.buildCalibrationPdf()).arrayBuffer());assert(calibration.getPageCount()===1,'Folha calibração');
  Object.assign(P.cfg,{orient:'portrait',pdfOrient:'auto',view:'assembly',dpi:72});P.update();await P.assembly.prepare();for(let i=0;i<200&&!P.assembly.ready;i++)await wait(50);assert(P.assembly.ready&&P.assembly.sheets.length===4,'Montagem real incompleta');
  PS.$('#pAssemblyStep').value=2;PS.$('#pAssemblyStep').dispatchEvent(new Event('input'));await wait(50);assert(PS.$('#pAssemblyCount').textContent.startsWith('2 /'),'Passo a passo');
  PS.$('#pAssemblyZoom').value=300;PS.$('#pAssemblyZoom').dispatchEvent(new Event('input'));await wait(50);assert(P.cfg.zoom===1,'Zoom de conferência mudou enquadramento');
  PS.$('#pAssemblyStep').value=4;PS.$('#pAssemblyStep').dispatchEvent(new Event('input'));await wait(50);
  return {pairs,pixelsCompared:pixels,maxPhysicalErrorMm:maxPhysicalError,size770x1118:{cols:exact.cols,rows:exact.rows,width:exact.finalW,height:exact.finalH},pdfPages:loaded.getPageCount(),assemblySheets:P.assembly.sheets.length};
 });
 await page.screenshot({path:process.env.PRISMA_QA_SCREENSHOT||path.join(require('node:os').tmpdir(),'prisma-poster-qa.png')});console.log(JSON.stringify({result,errors},null,2));await browser.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
