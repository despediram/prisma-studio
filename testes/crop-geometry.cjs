/* Prisma Studio — regressão das alças do recorte: limites, proporção e âncora. */
'use strict';
const assert=require('node:assert/strict'),G=require('../js/editor/tools/crop-geometry.js');
let count=0;
function valid(r,W,H,a){for(const v of Object.values(r))assert(Number.isFinite(v));assert(r.x>=-1e-7&&r.y>=-1e-7&&r.w>=0&&r.h>=0);assert(r.x+r.w<=W+1e-7&&r.y+r.h<=H+1e-7);if(a&&r.w>0)assert(Math.abs(r.w/r.h-a)<1e-7);count++;}
for(const [W,H]of [[6000,4000],[320,240],[1,1]])for(const a of [null,1,4/5,16/9,210/297]){
 for(const start of [{x:W*.2,y:H*.3},{x:0,y:0},{x:W,y:H}])for(const end of [{x:-1000,y:-300},{x:W+300,y:H+1000},{x:W*.6,y:H*.7}])valid(G.select(start,end,a,W,H),W,H,a);
 let w=Math.min(W*.6,H*.6*(a||W/H)),h=a?w/a:H*.6;
 const r={x:(W-w)/2,y:(H-h)/2,w,h};
 for(const handle of ['nw','n','ne','e','se','s','sw','w'])for(const dx of [-W*2,-30,0,30,W*2])for(const dy of [-H*2,-30,0,30,H*2]){
  const out=G.resize(r,handle,dx,dy,a,W,H);valid(out,W,H,a);
  if(handle.includes('w'))assert(Math.abs(out.x+out.w-r.x-r.w)<1e-7);
  if(handle.includes('n'))assert(Math.abs(out.y+out.h-r.y-r.h)<1e-7);
 }
}
assert(G.resize({x:50,y:50,w:100,h:100},'se',0,30,1,500,500).w===130,'Arraste vertical de canto deve alterar o recorte');
console.log(count+' recortes válidos; proporção e âncora preservadas inclusive nas bordas.');
