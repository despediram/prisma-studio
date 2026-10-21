/* Prisma Studio — raster único do pôster, calculado sob demanda em blocos.
 * Todas as folhas usam a mesma origem, escala e centros de pixels. Blocos de
 * 768 px + halo são independentes das bordas das folhas: a área repetida tem
 * exatamente os mesmos bytes, inclusive com nitidez/clareamento ligados.
 * O cache é limitado; não precisa alocar o pôster inteiro em resolução final.
 */
(function () {
  'use strict';
  const PS=window.PS, BLOCK=768, HALO=24, LIMIT=64*1024*1024;
  PS.posterPixelRect=(rect,dpi)=>{
    const k=dpi/25.4,epsilon=1e-8;
    const x=Math.floor(rect.x*k+epsilon),y=Math.floor(rect.y*k+epsilon);
    const right=Math.ceil((rect.x+rect.w)*k-epsilon),bottom=Math.ceil((rect.y+rect.h)*k-epsilon);
    return {x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y),ppm:k};
  };
  PS.createPosterRaster=(source,geometry,settings)=>{
    // Nunca consulta cfg/g mutáveis depois de iniciar uma renderização assíncrona.
    const g=JSON.parse(JSON.stringify(geometry)),cfg={...settings},cache=new Map(),pending=new Map();let bytes=0;
    const liftLut=new Uint8ClampedArray(256),gamma=1/(1+(cfg.lift||0)/100*.9);
    for(let i=0;i<256;i++)liftLut[i]=Math.round(255*Math.pow(i/255,gamma));
    async function block(bx,by,dpi,enhance){
      const key=[bx,by,dpi,enhance].join(':');
      if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
      if(pending.has(key))return pending.get(key);
      const job=(async()=>{
        const ppm=dpi/25.4,size=BLOCK+2*HALO,ox=bx*BLOCK-HALO,oy=by*BLOCK-HALO;
        const c=PS.canvas(size,size),ctx=PS.ctx(c);ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
        ctx.save();ctx.beginPath();ctx.rect(g.visible.x*ppm-ox,g.visible.y*ppm-oy,g.visible.w*ppm,g.visible.h*ppm);ctx.clip();
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
        ctx.drawImage(source,g.img.x*ppm-ox,g.img.y*ppm-oy,g.img.w*ppm,g.img.h*ppm);ctx.restore();
        let img=PS.getImg(c);
        // Nitidez local no mesmo raster de saída. O halo não aparece na arte.
        // Evita que upscalers por folha criem fases/contornos diferentes na emenda.
        if(enhance>0&&g.effDpi<dpi*.85)img=await PS.run('enhanceDetail',{img,amount:25+35*enhance/100,radius:1});
        if(cfg.lift>0)for(let i=0;i<img.d.length;i+=4){img.d[i]=liftLut[img.d[i]];img.d[i+1]=liftLut[img.d[i+1]];img.d[i+2]=liftLut[img.d[i+2]];}
        PS.ctx(c).putImageData(new ImageData(img.d,img.w,img.h),0,0);
        const tile=PS.canvas(BLOCK,BLOCK);PS.ctx(tile).drawImage(c,HALO,HALO,BLOCK,BLOCK,0,0,BLOCK,BLOCK);
        cache.set(key,tile);bytes+=BLOCK*BLOCK*4;
        while(bytes>LIMIT&&cache.size>1){const first=cache.keys().next().value;cache.delete(first);bytes-=BLOCK*BLOCK*4;}
        return tile;
      })();pending.set(key,job);try{return await job;}finally{pending.delete(key);}
    }
    return {
      geometry:g,
      async render(rect,dpi,opts={}){
        if(!Number.isFinite(dpi)||dpi<=0)throw Error('Resolução de impressão inválida.');
        const grid=PS.posterPixelRect(rect,dpi);
        if(grid.w*grid.h>60e6)throw Error('A região de impressão excede 60 MP. Reduza o DPI ou o tamanho do papel.');
        const c=PS.canvas(grid.w,grid.h),x=PS.ctx(c);
        const firstX=Math.floor(grid.x/BLOCK),firstY=Math.floor(grid.y/BLOCK),lastX=Math.floor((grid.x+grid.w-1)/BLOCK),lastY=Math.floor((grid.y+grid.h-1)/BLOCK);
        const total=(lastX-firstX+1)*(lastY-firstY+1);let n=0;
        for(let by=firstY;by<=lastY;by++)for(let bx=firstX;bx<=lastX;bx++){
          const b=await block(bx,by,dpi,opts.enhance??cfg.enhance);
          x.drawImage(b,bx*BLOCK-grid.x,by*BLOCK-grid.y);opts.onProgress?.(++n/total);
          if(n%4===0)await PS.nextFrame();
        }
        const placement={x:grid.x/grid.ppm,y:grid.y/grid.ppm,w:grid.w/grid.ppm,h:grid.h/grid.ppm,grid};
        c.posterPlacement=placement;
        if(opts.pxW||opts.pxH){
          const out=PS.canvas(opts.pxW||grid.w,opts.pxH||grid.h),ctx=PS.ctx(out);
          ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.imageSmoothingQuality='high';
          ctx.drawImage(c,(placement.x-rect.x)*out.width/rect.w,(placement.y-rect.y)*out.height/rect.h,placement.w*out.width/rect.w,placement.h*out.height/rect.h);
          return {c:out,x:ctx,pxW:out.width,pxH:out.height,sx:out.width/rect.w,sy:out.height/rect.h,placement};
        }
        return {c,x,pxW:c.width,pxH:c.height,sx:grid.ppm,sy:grid.ppm,placement};
      },
      get cacheBytes(){return bytes;}
    };
  };
})();
