/* Prisma Studio — preparação RGB e máscara alfa do modelo U²-NetP.
 * Operações puras, compartilhadas pelo worker e pelos testes. Não altera a foto.
 */
function PrismaSubjectMathFactory(){
 'use strict';const N=320,means=[.485,.456,.406],std=[.229,.224,.225];
 const M={size:N,
  input(rgba){
   if(rgba.length!==N*N*4)throw Error('Entrada da IA deve medir 320 × 320 pixels.');
   let peak=1;for(let i=0;i<rgba.length;i+=4)for(let c=0;c<3;c++)peak=Math.max(peak,rgba[i+c]);
   const out=new Float32Array(N*N*3);
   for(let i=0;i<N*N;i++)for(let c=0;c<3;c++)out[c*N*N+i]=(rgba[i*4+c]/peak-means[c])/std[c];
   return out;
  },
  alpha(pred){
   if(pred.length!==N*N)throw Error('O modelo retornou uma máscara de tamanho inválido.');
   let low=Infinity,high=-Infinity;for(const v of pred){if(!Number.isFinite(v))throw Error('A IA retornou valores inválidos.');low=Math.min(low,v);high=Math.max(high,v);}
   if(high-low<1e-6)throw Error('A IA não encontrou um recorte confiável nesta imagem.');
   const out=new Uint8ClampedArray(pred.length);for(let i=0;i<out.length;i++)out[i]=Math.round((pred[i]-low)/(high-low)*255);return out;
  },
  refine(alpha,edge=0,invert=false){
   const rgba=new Uint8ClampedArray(alpha.length*4),gamma=Math.pow(2,-Math.max(-30,Math.min(30,+edge||0))/20);
   for(let i=0;i<alpha.length;i++){const j=i*4;rgba[j]=rgba[j+1]=rgba[j+2]=255;rgba[j+3]=Math.round(255*Math.pow((invert?255-alpha[i]:alpha[i])/255,gamma));}return rgba;
  }
 };
 return M;
}
(function(root){const M=PrismaSubjectMathFactory();if(typeof module==='object'&&module.exports)module.exports=M;else root.PrismaSubjectMath=M;})(typeof self==='object'?self:globalThis);
