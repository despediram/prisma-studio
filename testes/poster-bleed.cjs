/* Prisma Studio — exportação sem moldura extra: sangria, abas e coordenadas A4.
 * Gera os PDFs reais e referências para conferência visual com renderizador PDF.
 */
const{chromium}=require('playwright'),path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.PRISMA_CHROMIUM||undefined,args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1400,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../index.html'));
 const result=await p.evaluate(async()=>{
  const P=PS.poster,ok=(v,m)=>{if(!v)throw Error(m)},runs=[];
  for(const [orient,margin] of [['portrait',5],['landscape',0],['portrait',3.5]]){
   const cfg={mode:'grid',paper:'A4',paperW:210,paperH:297,cols:2,rows:2,orient,margin,safePrint:margin>0,bleed:true,overlap:10,glueStyle:'tabs',fit:'contain',zoom:1,panX:0,panY:0,border:0,dpi:127,enhance:0,lift:0,format:'png',skipBlank:false,guidePage:false,markGlue:true,markCut:true,markLabels:true,pdfOrient:orient==='landscape'?'portrait':'auto',calX:100,calY:100};
   const g0=PS.posterGeometry(cfg,390,564),source=PS.canvas(Math.round(g0.areaW*2),Math.round(g0.areaH*2)),x=PS.ctx(source);x.fillStyle='#489dbb';x.fillRect(0,0,source.width,source.height);
   x.fillStyle='#ed688e';for(let y=0;y<source.height;y+=80)for(let z=0;z<source.width;z+=80)if((y/80+z/80)%2===0)x.fillRect(z,y,80,80);
   x.strokeStyle='#132339';x.lineWidth=7;x.beginPath();x.moveTo(0,0);x.lineTo(source.width,source.height);x.moveTo(source.width,0);x.lineTo(0,source.height);x.stroke();
   PS.doc.load(source,'Teste de encaixe');Object.assign(P.cfg,cfg);await PS.setMode('poster');P.update();const g=P.geometry;
   ok(g.margin===margin,'Margem foi forçada para outro valor');ok(Math.abs(g.img.w-g.visible.w)<1e-6&&Math.abs(g.img.h-g.visible.h)<1e-6,'Imagem original cortada');
   for(const t of g.tiles){const clip=PS.posterPageArtRect(g,t,cfg),core=PS.posterCoreRect(g,t);ok(clip.x===0&&clip.y===0,'Moldura adicional');ok(t.right?clip.w===core.x+core.w:clip.w===g.pageW,'Clip invade aba direita');ok(t.bottom?clip.h===core.y+core.h:clip.h===g.pageH,'Clip invade aba inferior');}
   const clean=await P.getRaster().render({x:0,y:0,w:g.areaW,h:g.areaH},25.4),out=PS.canvas(clean.c.width,clean.c.height),ox=PS.ctx(out);ox.fillStyle='white';ox.fillRect(0,0,out.width,out.height);
   // Página física completa, corte pelas distâncias calculadas, abas por baixo.
   for(const t of g.tiles){const r=await P.getRaster().render({x:t.x0-margin,y:t.y0-margin,w:g.pageW,h:g.pageH},25.4),paper=PS.canvas(g.pageW,g.pageH),px=PS.ctx(paper),clip=PS.posterPageArtRect(g,t,cfg);px.fillStyle='white';px.fillRect(0,0,paper.width,paper.height);px.save();px.beginPath();px.rect(clip.x,clip.y,clip.w,clip.h);px.clip();px.drawImage(r.c,margin+r.placement.x-t.x0,margin+r.placement.y-t.y0);px.restore();PS.posterDrawGlueCanvas(px,g,t,0,0,1,undefined,'tabs');
    if(margin===5){const edge=px.getImageData(2,90,1,1).data;ok(edge[0]<240||edge[1]<240||edge[2]<240,'Borda branca extra no PDF');}
    if(Number.isInteger(margin)){ox.drawImage(paper,margin,margin,g.cw,g.ch,t.x0,t.y0,g.cw,g.ch);}
   }
   if(Number.isInteger(margin)){const a=PS.getImg(out).d,z=PS.getImg(clean.c).d;for(let i=0;i<a.length;i++)ok(a[i]===z[i],'Emenda divergente '+i);}
   const pdf=await P.buildPdf(()=>{});runs.push({orient,margin,geometry:{...g,tiles:g.tiles},pdf:Array.from(new Uint8Array(await pdf.arrayBuffer())),reference:clean.c.toDataURL()});
  }
  // O controle sem bordas deve aceitar zero e não voltar automaticamente para 5.
  document.querySelector('#pSafePrint').checked=false;document.querySelector('#pSafePrint').dispatchEvent(new Event('change'));ok(P.geometry.margin===0,'Sem bordas não aceitou zero');
  return runs;
 });
 const dir=process.env.PRISMA_BLEED_OUTPUT||require('node:os').tmpdir();fs.mkdirSync(dir,{recursive:true});for(const r of result){const name=`prisma-sangria-${r.orient}-${r.margin}`;fs.writeFileSync(path.join(dir,name+'.pdf'),Buffer.from(r.pdf));fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(r.reference.split(',')[1],'base64'));fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(r.geometry));delete r.pdf;delete r.reference;delete r.geometry;}
 console.log(JSON.stringify({cases:result,errors}));await b.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
