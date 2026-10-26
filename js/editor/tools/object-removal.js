/* Reconstrução offline em worker descartável; o original só muda após Aplicar. */
(function () {
  'use strict';
  const C = PS.toolContext, doc = PS.doc;
  C.removeObject = async function (st) {
    if (C.objectRemovalBusy) return;
    C.objectRemovalBusy = true;
    const target = doc.base, layer = doc.layer, version = doc.version;
    let worker, url, closed = false, result = null;
    const body = document.createElement('div');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Reconstruindo o fundo neste aparelho…';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;max-width:100%;max-height:55vh;margin:auto;object-fit:contain';
    const compare = document.createElement('button');
    compare.className = 'btn';compare.textContent = 'Ver original';compare.disabled = true;
    body.append(status, canvas, compare);
    const pad = Math.max(32, Math.ceil(st.size * 3)), b = st.bbox;
    const x = Math.max(0, Math.floor(b.x0-pad)), y = Math.max(0, Math.floor(b.y0-pad));
    const w = Math.min(target.width, Math.ceil(b.x1+pad))-x;
    const h = Math.min(target.height, Math.ceil(b.y1+pad))-y;
    try {
      const original = PS.getImg(target,x,y,w,h), paint = PS.getImg(st.layer,x,y,w,h);
      const selection = st.selMask ? PS.getImg(st.selMask,x,y,w,h) : null;
      const mask = new Uint8Array(w*h);
      for(let i=0;i<mask.length;i++)mask[i]=paint.d[i*4+3]>20&&(!selection||selection.d[i*4+3]>0)?1:0;
      canvas.width=w;canvas.height=h;
      const show = img => PS.ctx(canvas).putImageData(new ImageData(img.d,w,h),0,0);
      show(original);
      let before=false;
      compare.onclick=()=>{before=!before;show(before?original:result);compare.textContent=before?'Ver resultado':'Ver original';};
      const accepted = await PS.dialog({title:'Remover objetos • prévia',body,okText:'Aplicar',onOpen:()=>{
        const apply = PS.$('#dialogOk');apply.disabled=true;
        try {
          url=URL.createObjectURL(new Blob(['const engine='+PrismaTextureFill.workerSource+';onmessage=e=>{try{const result=engine.run(e.data.img,e.data.mask,{detail:true},progress=>postMessage({progress}));postMessage({result},[result.d.buffer]);}catch(e){postMessage({error:e.message});}}'],{type:'text/javascript'}));
          worker=new Worker(url);
          worker.onmessage=e=>{
            if(closed)return;
            if(e.data.error){status.textContent=e.data.error;return;}
            if(e.data.progress!=null){status.textContent='Reconstruindo o fundo… '+Math.round(e.data.progress*100)+'%';return;}
            result=e.data.result;
            if(selection)for(let i=0;i<mask.length;i++)if(mask[i]){const alpha=selection.d[i*4+3]/255;if(alpha<1)for(let k=0;k<4;k++)result.d[i*4+k]=original.d[i*4+k]*(1-alpha)+result.d[i*4+k]*alpha;}
            show(result);compare.disabled=false;apply.disabled=false;
            status.textContent='Confira as texturas e contornos. Aplicar permite desfazer pelo histórico.';
          };
          worker.onerror=()=>{status.textContent='O processamento falhou. Cancele e tente uma área menor.';};
          worker.postMessage({img:original,mask});
        }catch(e){status.textContent='Não foi possível iniciar a reconstrução: '+e.message;}
      }});
      if(accepted&&result){
        if(doc.base!==target||doc.layer!==layer||doc.version!==version){PS.toast('A imagem mudou. Faça uma nova prévia.','warning');return;}
        PS.ctx(target).putImageData(new ImageData(result.d,w,h),x,y);
        doc.commit('Remover objeto','fa-bandage');
      }
    }catch(e){PS.toast('Não foi possível remover: '+e.message,'error');}
    finally{closed=true;worker?.terminate();if(url)URL.revokeObjectURL(url);PS.$('#dialogOk').disabled=false;C.objectRemovalBusy=false;PS.view.render();}
  };
})();
