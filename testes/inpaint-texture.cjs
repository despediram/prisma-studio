/* Prisma Studio — garante transferência de textura, contornos e preservação dos pixels não marcados. */
'use strict';const assert=require('node:assert/strict'),T=require('../js/core/inpaint-texture.js');
function image(w,h,fn){const d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)d.set([...fn(x,y),255],(y*w+x)*4);return {w,h,d};}
for(const edge of [false,true]){const img=image(96,80,(x,y)=>{const b=(Math.floor(x/4)+Math.floor(y/4))%2?210:45;return edge?(y<40?[b,20,30]:[20,b,30]):[b,b,b];}),mask=new Uint8Array(96*80);for(let y=25;y<55;y++)for(let x=edge?0:35;x<(edge?18:62);x++)mask[y*96+x]=1;const truth=img.d.slice();for(let i=0;i<mask.length;i++)if(mask[i])img.d.set([255,0,255,255],i*4);const before=img.d.slice(),out=T.run(img,mask,{detail:true});let sharp=0,marked=0;for(let i=0;i<mask.length;i++){if(!mask[i])assert.deepEqual(out.d.subarray(i*4,i*4+4),before.subarray(i*4,i*4+4));else{marked++;if([45,210].includes(Math.max(out.d[i*4],out.d[i*4+1])))sharp++;assert.notEqual(out.d[i*4+2],255);if(edge)assert.equal(out.d[i*4+(Math.floor(i/96)<40?1:0)],20,'Contorno horizontal foi perdido');}}assert(sharp/marked>.95);assert.deepEqual(img.d,before);console.log('Textura nítida e pixels externos preservados; borda='+edge);}
const blank=image(12,12,()=>[30,40,50]);assert.throws(()=>T.run(blank,new Uint8Array(144).fill(1)),/referência/);assert.deepEqual(T.run(blank,new Uint8Array(144)).d,blank.d);assert.throws(()=>T.run(blank,new Uint8Array(2)),/inválida/);
// Caminho de análise reduzida (>960 px): a saída deve manter a textura original nítida.
{
 const img=image(1400,1000,(x,y)=>{const v=(Math.floor(x/8)+Math.floor(y/8))%2?210:45;return[v,v,v];}),mask=new Uint8Array(1400000);
 for(let y=440;y<560;y++)for(let x=640;x<760;x++){const i=y*1400+x;mask[i]=1;img.d.set([255,0,255,255],i*4);}
 const out=T.run(img,mask,{detail:true});
 for(let i=0;i<mask.length;i++){if(!mask[i])assert.deepEqual(out.d.subarray(i*4,i*4+4),img.d.subarray(i*4,i*4+4));else{assert([45,210].includes(out.d[i*4]));assert.equal(out.d[i*4],out.d[i*4+1]);assert.equal(out.d[i*4+2],out.d[i*4]);}}
 console.log('1,4 MP: textura em resolução original preservada após análise reduzida.');
}
