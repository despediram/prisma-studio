/* Prisma Studio Desktop — rasteriza a marca geométrica própria e gera ICO/PNG.
 * Apenas módulos nativos do Node; amostragem 4× suaviza os traços de assets/icone.svg.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const size=256,ss=4,raw=Buffer.alloc((size*4+1)*size),ink=[24,23,30],violet=[169,154,255],peach=[255,186,133];
const lines=[[24,8,42,39,2.6,violet],[42,39,6,39,2.6,violet],[6,39,24,8,2.6,violet],[24,8,27,28,1.8,violet],[27,28,42,39,1.8,violet],[6,39,27,28,1.8,violet],[15,24,27,28,2.2,peach],[27,28,22,39,2.2,peach]];
function distance(x,y,a,b,c,d){const dx=c-a,dy=d-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a-t*dx,y-b-t*dy);}
for(let y=0;y<size;y++)for(let x=0;x<size;x++){const sum=[0,0,0,0];for(let sy=0;sy<ss;sy++)for(let sx=0;sx<ss;sx++){const px=(x+(sx+.5)/ss)*48/size,py=(y+(sy+.5)/ss)*48/size,dx=Math.max(12-px,px-36,0),dy=Math.max(12-py,py-36,0);if(dx*dx+dy*dy>144)continue;let color=ink;for(const [a,b,c,d,w,rgb]of lines)if(distance(px,py,a,b,c,d)<w/2)color=rgb;for(let ch=0;ch<3;ch++)sum[ch]+=color[ch];sum[3]+=255;}const i=y*(size*4+1)+1+x*4;for(let ch=0;ch<3;ch++)raw[i+ch]=sum[3]?Math.round(sum[ch]/(sum[3]/255)):0;raw[i+3]=Math.round(sum[3]/(ss*ss));}
const crc=b=>{let c=-1;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^-1)>>>0;};
function chunk(type,data){const t=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([t,data])),data.length+8);return out;}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
fs.writeFileSync(path.join(__dirname,'icon.ico'),Buffer.concat([header,png]));
