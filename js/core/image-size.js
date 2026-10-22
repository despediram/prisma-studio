/* Prisma Studio — dimensões sem teto artificial e criação verificada de Canvas.
 * Só rejeita dimensões inválidas ou superfícies que o navegador não consegue criar.
 * A verificação usa o próprio canvas solicitado, sem uma segunda cópia da imagem.
 */
(function(root){
 'use strict';
 function valid(w,h){return Number.isSafeInteger(w)&&Number.isSafeInteger(h)&&w>0&&h>0&&Number.isSafeInteger(w*h*4);}
 function create(w,h,options){
  if(!valid(w,h))throw Error('Informe largura e altura válidas em pixels inteiros.');
  const c=document.createElement('canvas');
  try{
   c.width=w;c.height=h;
   const x=c.getContext('2d',options);
   if(c.width!==w||c.height!==h||!x)throw Error('Canvas indisponível');
   x.fillStyle='#135795';x.fillRect(w-1,h-1,1,1);
   const p=x.getImageData(w-1,h-1,1,1).data;
   if(p[0]!==19||p[1]!==87||p[2]!==149||p[3]!==255)throw Error('Superfície indisponível');
   x.clearRect(w-1,h-1,1,1);x.fillStyle='#000000';
   return c;
  }catch(e){
   c.width=c.height=1;
   const error=Error('O navegador não conseguiu criar a imagem de '+w+' × '+h+' px. Tente um tamanho menor ou um aparelho com mais memória.');
   error.code='CANVAS_CAPACITY';throw error;
  }
 }
 const api={valid,create};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrismaImageSize=api;
})(typeof window==='undefined'?globalThis:window);
