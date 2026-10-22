/* Prisma Studio — validação do molde físico antes de renderizar os pixels.
 * Compara A4/300 DPI com a versão antiga e cobre margens, abas e orientação.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const PS={clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),PT_PER_MM:72/25.4},ctx={window:{PS}};vm.createContext(ctx);
for(const f of ['poster-geometry','poster-marks','poster-page'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/poster/'+f+'.js'),'utf8'),ctx);
let total=0;
for(const orient of ['portrait','landscape'])for(const glueStyle of ['image','tabs','overlap'])for(const margin of [0,3.5,5,12])for(const cols of [1,2,3,30]){
 const cfg={mode:'grid',paperW:210,paperH:297,orient,cols,rows:3,margin,overlap:15,glueStyle,bleed:true,fit:'contain',border:4};
 const g=PS.posterGeometry(cfg,3400,5100);
 for(const tile of [g.tiles[0],g.tiles.at(-1)]){
  const p=PS.posterSheetPlan(g,tile,cfg,300);
  assert.equal(p.width,orient==='portrait'?2480:3508);assert.equal(p.height,orient==='portrait'?3508:2480);
  assert.equal(p.placement.w,g.pageW);assert.equal(p.placement.h,g.pageH);
  if(p.artInside){assert(p.artInside.x>=-1e-7&&p.artInside.y>=-1e-7&&p.artInside.x+p.artInside.w<=g.pageW+1e-7&&p.artInside.y+p.artInside.h<=g.pageH+1e-7);}
  assert.equal(p.crop.x,tile.x0-g.margin);assert.equal(p.crop.y,tile.y0-g.margin);
  assert(p.clip.x>=0&&p.clip.y>=0&&p.clip.x+p.clip.w<=g.pageW+1e-7&&p.clip.y+p.clip.h<=g.pageH+1e-7);
  total++;
 }
}
assert.throws(()=>PS.posterSheetPlan({},null,{},NaN));
console.log(`${total} moldes: arte e guias dentro do papel; A4 a 300 DPI = 2480 × 3508 px.`);
