/* Prisma Studio — regressão das restrições artificiais e do planejamento móvel.
 * Superfícies enormes são simuladas; alocação real depende de cada navegador.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const S=require('../js/core/image-size.js'),P=require('../js/core/upscale-plan.js');
for(const [w,h] of [[12000,8000],[16000,12000],[40000,2]])assert(S.valid(w,h));
for(const [w,h] of [[0,1],[-1,2],[Infinity,1],[NaN,1],[1.5,10],[Number.MAX_SAFE_INTEGER,2]])assert(!S.valid(w,h));
assert.deepEqual(P.automatic(8000,6000,32),{w:8000,h:6000,factor:1,reduced:false});
assert.deepEqual(P.automatic(16000,12000,100),{w:16000,h:12000,factor:1,reduced:false});
assert.equal(P.automatic(40000,2,32).w,40000);
assert.equal(P.automatic(160,120,32).factor,2);
const ctx={fillRect(){},clearRect(){},getImageData(){return{data:[19,87,149,255]}}};
let last;global.document={createElement(){return last={width:0,height:0,getContext(){return ctx}}}};
assert.equal(S.create(16000,12000).width,16000);
ctx.getImageData=()=>({data:[0,0,0,0]});
assert.throws(()=>S.create(16000,12000),e=>e.code==='CANVAS_CAPACITY');assert.equal(last.width,1);
delete global.document;
// Executa as funções reais do painel com uma imagem de 48 MP sem alocá-la.
const html=fs.readFileSync(path.join(__dirname,'../upscaler/index.html'),'utf8');
const controls=new Map(),$=id=>{if(!controls.has(id))controls.set(id,{value:'',className:'',textContent:'',hidden:false,checked:false});return controls.get(id)};
const values={mode:'mul',scale:'2',model:'auto'};
$('upEngine').value='classic';
const sandbox={srcImage:{naturalWidth:8000,naturalHeight:6000},RECOMMENDED_MP:32,PrismaImageSize:S,PrismaUpscalePlan:P,$,val:k=>values[k],abort:null,analysis:null,MODELS:{photo:{name:'Foto'}},RATIO_TOL:.000001,parseSize:()=>({W:8000,H:6000})};
vm.createContext(sandbox);
vm.runInContext(html.slice(html.indexOf('function makePlan()'),html.indexOf('/* ================= arquivo ================= */')),sandbox);
sandbox.refreshPlan();assert.equal($('go').disabled,false);assert.match($('outputSummary').textContent,/16000 × 12000/);
values.scale='auto';sandbox.refreshPlan();assert.match($('outputSummary').textContent,/saída: 8000 × 6000/);assert.equal($('go').disabled,false);
values.scale='8';sandbox.refreshPlan();assert.equal($('go').disabled,false);assert.match($('outputSummary').textContent,/64000 × 48000/);
console.log('OK: sem teto de MP/lado; Auto preserva original; falha real detectada; painel móvel permite 192 MP e 8×. Alocações enormes simuladas.');
