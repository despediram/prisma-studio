/* Prisma Studio — guias sem margem, ocultação na montagem e PDF orientado. */
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.PRISMA_CHROMIUM||undefined,args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1400,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+path.resolve(__dirname,'../index.html'));
 const result=await p.evaluate(async()=>{
  const assert=(v,m)=>{if(!v)throw Error(m)},P=PS.poster,source=PS.canvas(410,584),x=PS.ctx(source);
  x.fillStyle='#4e9dc9';x.fillRect(0,0,410,584);x.fillStyle='#ed467f';x.fillRect(120,160,160,240);x.fillStyle='#fff';x.fillRect(190,270,60,50);
  PS.doc.load(source,'Guias');Object.assign(P.cfg,{paper:'A4',paperW:210,paperH:297,orient:'portrait',mode:'grid',cols:2,rows:2,margin:0,overlap:10,fit:'cover',zoom:1,panX:0,panY:0,border:0,dpi:72,enhance:0,lift:0,format:'png',guidePage:false,markGlue:true,markCut:true,markLabels:true,skipBlank:false,pdfOrient:'auto'});
  await PS.setMode('poster');P.update();const g=P.geometry;
  assert(g.finalW===410&&g.finalH===584,'Medidas mudaram');
  assert(g.tiles.map(t=>PS.posterGlueGuides(g,t).length).join(',')==='2,1,1,0','Faixas das quatro folhas');
  for(const margin of [0,.5,1,5])for(const orient of ['portrait','landscape']){
   const geo=PS.posterGeometry({...P.cfg,margin,orient},410,584);
   for(const t of geo.tiles)for(const q of PS.posterGlueGuides(geo,t)){
    assert(q.x>=margin&&q.y>=margin&&q.x+q.w<=margin+geo.cw+1e-9&&q.y+q.h<=margin+geo.ch+1e-9,'Guia fora da arte');
    assert(q.axis==='vertical'?q.x>=margin+geo.stepX:q.y>=margin+geo.stepY,'Guia fora da área coberta');
   }
  }
  const filtered=g.tiles.filter(t=>t.code!=='A2');assert(!PS.posterGlueGuides(g,g.tiles[0],filtered).some(q=>q.to==='A2'),'Guia para folha não impressa');
  const clean=PS.canvas(410,584),marked=PS.canvas(410,584);
  for(const t of g.tiles){const out=await P.getRaster().render({x:t.x0,y:t.y0,w:g.cw,h:g.ch},25.4);for(const c of [clean,marked])PS.ctx(c).drawImage(out.c,out.placement.x,out.placement.y);PS.posterDrawGlueCanvas(PS.ctx(marked),g,t,t.x0,t.y0,1);}
  const a=PS.getImg(clean).d,z=PS.getImg(marked).d;for(let i=0;i<a.length;i++)assert(a[i]===z[i],'Guia visível depois de sobrepor: byte '+i);
  const pdf=await P.buildPdf(()=>{}),bytes=Array.from(new Uint8Array(await pdf.arrayBuffer()));
  Object.assign(P.cfg,{orient:'landscape',pdfOrient:'portrait'});P.update();const rotated=await P.buildPdf(()=>{});
  P.cfg.markGlue=false;P.update();const off=await P.buildPdf(()=>{});
  return {bytes,rotated:Array.from(new Uint8Array(await rotated.arrayBuffer())),off:Array.from(new Uint8Array(await off.arrayBuffer())),assembledPixels:a.length/4,dimensions:[g.finalW,g.finalH]};
 });
 const dir=process.env.PRISMA_MARKS_OUTPUT||require('node:os').tmpdir();fs.mkdirSync(dir,{recursive:true});
 for(const [key,name] of [['bytes','prisma-guias-zero.pdf'],['rotated','prisma-guias-girado.pdf'],['off','prisma-guias-desligadas.pdf']]){fs.writeFileSync(path.join(dir,name),Buffer.from(result[key]));delete result[key];}
 console.log(JSON.stringify({...result,errors}));await b.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
