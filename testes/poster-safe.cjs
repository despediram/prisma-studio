/* Prisma Studio — montagem A4 após margens da impressora e recorte das folhas.
 * Simula impressão com bordas brancas de 5 mm, abas opacas e montagem física.
 */
const{chromium}=require('playwright'),path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.PRISMA_CHROMIUM||undefined,args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1450,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+path.resolve(__dirname,'../index.html'));
const result=await p.evaluate(async()=>{
 const P=PS.poster,ok=(v,m)=>{if(!v)throw Error(m)},source=PS.canvas(160,320),x=PS.ctx(source),d=x.createImageData(160,320);
 for(let y=0;y<320;y++)for(let xx=0;xx<160;xx++){const n=(y*160+xx)*4;d.data[n]=xx*13%256;d.data[n+1]=y*7%256;d.data[n+2]=(xx+y)*11%256;d.data[n+3]=255;}x.putImageData(d,0,0);PS.doc.load(source,'Grade de encaixe');
 Object.assign(P.cfg,{mode:'grid',paper:'A4',paperW:210,paperH:297,cols:2,rows:2,orient:'portrait',safePrint:true,margin:0,overlap:10,glueStyle:'tabs',fit:'contain',zoom:1,panX:0,panY:0,border:0,dpi:72,enhance:0,lift:0,format:'png',skipBlank:false,guidePage:false,markGlue:true,markCut:true,markLabels:true});await PS.setMode('poster');P.update();const g=P.geometry;
 ok(g.margin===5,'Margem segura');ok(g.areaW===390&&g.areaH===564,'Área útil da grade');ok(g.finalW===282&&g.finalH===564,'Arte não preservou proporção');ok(Math.abs(g.img.w-160*g.mmPerPx)<1e-9&&Math.abs(g.img.h-320*g.mmPerPx)<1e-9,'Escala não uniforme');ok(g.visible.w===g.img.w&&g.visible.h===g.img.h,'Imagem foi cortada');
 const assembled=PS.canvas(g.areaW,g.areaH),ax=PS.ctx(assembled);ax.fillStyle='white';ax.fillRect(0,0,g.areaW,g.areaH);
 const printed=[];
 for(const t of g.tiles){const out=await P.getRaster().render({x:t.x0,y:t.y0,w:g.cw,h:g.ch},25.4),paper=PS.canvas(210,297),px=PS.ctx(paper),core=PS.posterCoreRect(g,t);px.fillStyle='white';px.fillRect(0,0,210,297);px.save();px.beginPath();px.rect(core.x,core.y,core.w,core.h);px.clip();px.drawImage(out.c,g.margin+out.placement.x-t.x0,g.margin+out.placement.y-t.y0);px.restore();PS.posterDrawGlueCanvas(px,g,t,0,0,1,undefined,'tabs');
  // Recorte da impressora: não imprime nos 5 mm exteriores do papel.
  px.fillStyle='white';px.fillRect(0,0,210,5);px.fillRect(0,292,210,5);px.fillRect(0,0,5,297);px.fillRect(205,0,5,297);
  // As folhas internas entram com a margem esquerda/superior removida.
  ax.drawImage(paper,5,5,200,287,t.x0,t.y0,200,287);printed.push(paper.toDataURL());
 }
 const clean=await P.getRaster().render({x:0,y:0,w:g.areaW,h:g.areaH},25.4),aa=PS.getImg(assembled).d,bb=PS.getImg(clean.c).d;ok(aa.length===bb.length,'Grade de pixels');for(let i=0;i<aa.length;i++)ok(aa[i]===bb[i],'Impressão/montagem perdeu pixel '+i);
 const pdf=await P.buildPdf(()=>{}),portrait=Array.from(new Uint8Array(await pdf.arrayBuffer()));Object.assign(P.cfg,{orient:'landscape',pdfOrient:'portrait'});P.update();const rotated=Array.from(new Uint8Array(await(await P.buildPdf(()=>{})).arrayBuffer()));
 return{portrait,rotated,printed,assembled:assembled.toDataURL(),physicalMm:[g.finalW,g.finalH],a4GridMm:[g.areaW,g.areaH],comparedPixels:aa.length/4,errors:[]};
});
const dir=process.env.PRISMA_SAFE_OUTPUT||require('node:os').tmpdir();fs.mkdirSync(dir,{recursive:true});for(const key of ['portrait','rotated']){fs.writeFileSync(path.join(dir,'prisma-safe-'+key+'.pdf'),Buffer.from(result[key]));delete result[key];}for(let i=0;i<result.printed.length;i++)fs.writeFileSync(path.join(dir,'prisma-safe-folha-'+(i+1)+'.png'),Buffer.from(result.printed[i].split(',')[1],'base64'));delete result.printed;fs.writeFileSync(path.join(dir,'prisma-safe-montado.png'),Buffer.from(result.assembled.split(',')[1],'base64'));delete result.assembled;
console.log(JSON.stringify({...result,errors},null,2));await b.close();if(errors.length)process.exit(1);})().catch(e=>{console.error(e);process.exit(1)});
