/* Prisma Studio — reconstrução por exemplos de textura, sem difusão da imagem.
 * Busca blocos compatíveis, propaga contornos e transfere detalhes na resolução original.
 * Implementação própria inspirada em Criminisi et al. (2004); não usa rede neural ou servidor.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PrismaTextureFill=api;api.workerSource='('+factory.toString()+')()';})(typeof self!=='undefined'?self:this,function(){
 'use strict';
 function run(img,mask,opts={},progress=()=>{}){
  const {w:W,h:H,d:original}=img,N=W*H;
  if(!Number.isInteger(W)||!Number.isInteger(H)||W<1||H<1||original?.length!==N*4||mask?.length!==N)throw Error('Imagem ou área de remoção inválida.');
  const output=new Uint8ClampedArray(original);let total=0;for(let i=0;i<N;i++)if(mask[i])total++;
  if(!total)return {w:W,h:H,d:output};if(total===N)throw Error('Deixe uma parte do fundo sem pintar para servir de referência.');
  const stride=Math.max(1,Math.ceil(Math.max(W,H)/(opts.detail?960:640))),w=Math.ceil(W/stride),h=Math.ceil(H/stride),n=w*h;
  const source=new Uint8ClampedArray(n*4),hole=new Uint8Array(n),initial=new Uint8Array(n);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let rr=0,gg=0,bb=0,count=0,bad=0;for(let dy=0;dy<stride&&y*stride+dy<H;dy++)for(let dx=0;dx<stride&&x*stride+dx<W;dx++){const i=(y*stride+dy)*W+x*stride+dx;if(mask[i])bad=1;else if(original[i*4+3]>250){rr+=original[i*4];gg+=original[i*4+1];bb+=original[i*4+2];count++;}}const i=y*w+x;initial[i]=hole[i]=bad;source[i*4]=count?rr/count:0;source[i*4+1]=count?gg/count:0;source[i*4+2]=count?bb/count:0;source[i*4+3]=count?255:0;}
  let radius=opts.detail?4:3;radius=Math.min(radius,Math.floor((Math.min(w,h)-1)/2));if(radius<1)throw Error('A área é estreita demais para reconstruir. Inclua mais fundo ao redor.');
  const integral=new Int32Array((w+1)*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=y*w+x;row+=initial[i]||source[i*4+3]<250?1:0;integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+row;}}
  const candidates=[];let valid;
  function donors(r){candidates.length=0;valid=new Uint8Array(n);for(let y=r;y<h-r;y++)for(let x=r;x<w-r;x++){const a=(y-r)*(w+1)+x-r,b=(y+r+1)*(w+1)+x+r+1;const sum=integral[b]-integral[(y-r)*(w+1)+x+r+1]-integral[(y+r+1)*(w+1)+x-r]+integral[a];if(!sum){const i=y*w+x;valid[i]=1;candidates.push(i);}}}
  donors(radius);while(candidates.length<8&&radius>1)donors(--radius);if(!candidates.length)throw Error('Não há fundo suficiente fora da marcação. Use um pincel menor ou inclua mais contexto.');
  const data=new Uint8ClampedArray(source),mapping=new Int32Array(n).fill(-1),front=new Set(),pending=[];
  const neighbors=(i,fn)=>{const x=i%w,y=Math.floor(i/w);if(x)fn(i-1);if(x<w-1)fn(i+1);if(y)fn(i-w);if(y<h-1)fn(i+w);};
  let remain=0;for(let i=0;i<n;i++)if(hole[i]){remain++;neighbors(i,j=>{if(!hole[j])front.add(i);});}
  const start=remain;let state=(opts.seed||1)>>>0,round=0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
  const lum=i=>.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2];
  function priority(i){const x=i%w,y=Math.floor(i/w);let known=0,all=0,gx=0,gy=0,grad=0;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;all++;const j=yy*w+xx;if(hole[j])continue;known+=initial[j]?.55:1;if(xx>0&&xx<w-1&&yy>0&&yy<h-1&&!hole[j-1]&&!hole[j+1]&&!hole[j-w]&&!hole[j+w]){const ax=lum(j+1)-lum(j-1),ay=lum(j+w)-lum(j-w),g=ax*ax+ay*ay;if(g>grad){grad=g;gx=ax;gy=ay;}}}
   const nx=(x<w-1?hole[i+1]:1)-(x?hole[i-1]:1),ny=(y<h-1?hole[i+w]:1)-(y?hole[i-w]:1),norm=Math.hypot(nx,ny)||1;return known/all*(.05+Math.abs(-gy*nx+gx*ny)/norm/255);}
  while(remain){
   // Mantém somente a frente de preenchimento; avalia uma amostra distribuída dela.
   pending.length=0;for(const i of front){if(!hole[i]){front.delete(i);continue;}if(pending.length<48)pending.push(i);else{const j=Math.floor(random()*(front.size+1));if(j<48)pending[j]=i;}}
   if(!pending.length)throw Error('Não foi possível alcançar toda a área marcada.');let target=pending[0],p=-1;for(const i of pending){const v=priority(i);if(v>p){p=v;target=i;}}
   const tx=target%w,ty=Math.floor(target/w),samples=[];
   for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=tx+dx,yy=ty+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const i=yy*w+xx;if(!hole[i]&&data[i*4+3]>250)samples.push([dx,dy,i*4,initial[i]?.65:1]);}
   if(!samples.length){front.delete(target);continue;}
   let best=-1,bestScore=Infinity;
   function consider(si){if(si<0||si>=n||!valid[si])return;const sx=si%w,sy=Math.floor(si/w);let score=0;for(const [dx,dy,q,weight]of samples){const v=((sy+dy)*w+sx+dx)*4;const r=data[q]-source[v],g=data[q+1]-source[v+1],b=data[q+2]-source[v+2];score+=weight*(r*r+g*g+b*b);if(score>=bestScore)return;}if(score<bestScore){bestScore=score;best=si;}}
   // Continuidade: tenta primeiro os deslocamentos já aceitos nos blocos vizinhos.
   for(let dy=-radius*2;dy<=radius*2;dy+=radius)for(let dx=-radius*2;dx<=radius*2;dx+=radius){const x=tx+dx,y=ty+dy;if(x<0||y<0||x>=w||y>=h)continue;const i=y*w+x,s=mapping[i];if(s>=0)consider(s-dy*w-dx);}
   const tries=opts.detail?1024:384;for(let k=0;k<tries&&bestScore>0;k++)consider(candidates[Math.floor(random()*candidates.length)]);
   // Refina a posição do exemplo para encaixar os contornos pixel a pixel.
   for(let step=16;step>=1;step=Math.floor(step/2)){if(best<0)break;const bx=best%w,by=Math.floor(best/w);for(let dy=-step;dy<=step;dy+=step)for(let dx=-step;dx<=step;dx+=step){const x=bx+dx,y=by+dy;if(x>=radius&&y>=radius&&x<w-radius&&y<h-radius)consider(y*w+x);}}
   if(best<0)throw Error('Não foi encontrado um trecho de fundo compatível.');const sx=best%w,sy=Math.floor(best/w),changed=[];
   for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const x=tx+dx,y=ty+dy;if(x<0||y<0||x>=w||y>=h)continue;const i=y*w+x;if(!hole[i])continue;const si=(sy+dy)*w+sx+dx;data.set(source.subarray(si*4,si*4+4),i*4);mapping[i]=si;hole[i]=0;remain--;front.delete(i);changed.push(i);}
   for(const i of changed)neighbors(i,j=>{if(hole[j])front.add(j);});if(++round%16===0)progress(.1+.8*(1-remain/start));
  }
  // Usa somente o deslocamento dos exemplos. Os pixels finais nunca são a prévia ampliada.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!mask[i])continue;const ax=Math.floor(x/stride),ay=Math.floor(y/stride),si=mapping[ay*w+ax];if(si<0)throw Error('Reconstrução incompleta.');const xx=Math.max(0,Math.min(W-1,x+(si%w-ax)*stride)),yy=Math.max(0,Math.min(H-1,y+(Math.floor(si/w)-ay)*stride)),j=yy*W+xx;if(mask[j]||original[j*4+3]<250)throw Error('O fundo de referência ficou incompleto. Reduza a área marcada.');output.set(original.subarray(j*4,j*4+4),i*4);}
  progress(1);return {w:W,h:H,d:output};
 }
 return {run};
});
