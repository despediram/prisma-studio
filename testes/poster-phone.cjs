/* Prisma Studio — geometria de montagem após margens e ajuste automático comuns.
 * Teste puro: não presume acesso ao driver nem elimina a margem física do papel.
 */
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const PS={clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},sandbox={window:{PS}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/poster/poster-geometry.js'),'utf8'),sandbox);
let cases=0;
for(const cols of [1,2,3,7,30])for(const rows of [1,2,4,9,30])for(const orient of ['portrait','landscape'])for(const aspect of [.3,1,1.8]){
 const cfg={paperW:210,paperH:297,orient,mode:'grid',cols,rows,margin:0,overlap:25,glueStyle:'image',fit:'contain',zoom:1,border:0};
 const g=PS.posterGeometry(cfg,1000*aspect,1000),eps=1e-7;
 assert(Math.abs(g.img.w-g.visible.w)<eps&&Math.abs(g.img.h-g.visible.h)<eps);
 assert(Math.abs(g.img.w/g.img.h-aspect)<eps);
 assert(g.visible.x>=12-eps&&g.visible.y>=12-eps);
 assert(g.visible.x+g.visible.w<=g.areaW-12+eps&&g.visible.y+g.visible.h<=g.areaH-12+eps);
 for(const scale of [.9,.94,.97,1])for(const margin of [3,5,8,10])for(const [count,side,step] of [[cols,g.pageW,g.stepX],[rows,g.pageH,g.stepY]]){
  const pad=(1-scale)*side/2,start=Math.max(pad,margin),end=Math.min(pad+scale*side,side-margin);
  assert(start<=scale*12+pad+eps&&end>=scale*(side-12)+pad-eps,'Proteção original');
  for(let n=0;n<count-1;n++)assert(n*step*scale+end>=(n+1)*step*scale+start,'Lacuna entre folhas');
 }
 cases++;
}
const legacy=PS.posterGeometry({paperW:210,paperH:297,orient:'portrait',mode:'grid',cols:2,rows:2,margin:5,overlap:10,glueStyle:'tabs',fit:'contain'},390,564);
assert.equal(legacy.edgeGuard,0);assert.equal(legacy.areaW,390);assert.equal(legacy.areaH,564);
console.log(`${cases} geometrias; 16 combinações de margem/escala por geometria; modo avançado preservado.`);
