/* Regressão do limite móvel: ampliações fracionárias e recuperação de medidas. */
'use strict';
const assert=require('node:assert/strict'),P=require('../js/core/upscale-plan.js');
const photo=P.recommend(6000,4000,32);
assert(P.valid(photo.w,photo.h,32));assert(photo.w>6000&&photo.w<12000);assert(Math.abs(photo.w/photo.h-1.5)<.001);
assert(!P.valid(12000,8000,32));assert(P.valid(6000,4000,32));
const large=P.recommend(8000,6000,32);assert(large.reduced);assert(P.valid(large.w,large.h,32));
const small=P.recommend(160,120,32);assert.deepEqual([small.w,small.h],[320,240]);
assert(!P.valid(40000,2,32));assert(P.valid(...Object.values(P.recommend(40000,2,32)).slice(0,2),32));
for(let i=1;i<=5000;i++){const w=13+i*7,h=17+(i*31)%25000;for(const mp of [32,100]){const r=P.recommend(w,h,mp);assert(P.valid(r.w,r.h,mp));assert(r.w<=w*2&&r.h<=h*2);}}
assert.throws(()=>P.recommend(0,4000,32));assert(!P.valid(Infinity,20,32));assert(!P.valid(-1,20,32));
console.log('Ampliação: 10.000 planos válidos; foto de 24 MP pode ampliar sem pedir 96 MP.');
