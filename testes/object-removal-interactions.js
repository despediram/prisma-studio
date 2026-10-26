/* Aceite compartilhado pelo Electron e WebView reais, com rede desligada. */
window.prismaTestObjectRemoval=async function(P){
 const d=P.doc,T=P.tools,C=P.toolContext,$=P.$,check=(v,m)=>{if(!v)throw Error(m)},wait=async fn=>{for(let i=0;i<300;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Tempo esgotado na prévia de remoção');};
 await P.setMode('editor');d.newDocument(120,120,'#808080','Remoção offline');P.afterOpen();
 await T.set('marquee');T.pointer('down',{},{x:5,y:5});await T.set('tone');check(!C.sel,'Seleção transitória presa');
 $('#oMode [data-k=burn]').click();check(T.S.tone.mode==='burn','Opções de Luz local não responderam');
 T.pointer('down',{},{x:20,y:20});check(C.stroke.tiled&&!C.stroke.snapshot&&!C.stroke.effect,'Luz local não usou blocos');T.pointer('up',{},{x:20,y:20});d.undo();
 const x=P.ctx(d.base);x.fillStyle='#ff00ff';x.fillRect(50,50,12,12);d.commit('Objeto');
 const before=Array.from(P.getImg(d.base).d),same=()=>JSON.stringify(Array.from(P.getImg(d.base).d))===JSON.stringify(before);
 await T.set('heal');T.S.heal.mode='objects';T.renderOptions();
 const start=()=>{const layer=P.canvas(120,120),c=P.ctx(layer);c.fillStyle='white';c.fillRect(48,48,16,16);return C.removeObject({layer,size:16,bbox:{x0:48,y0:48,x1:64,y1:64}});};
 let pending=start();$('#dialogCancel').click();await pending;check(same()&&!C.objectRemovalBusy,'Cancelar alterou o original');
 pending=start();await wait(()=>$('#dialog').open&&!$('#dialogOk').disabled);$('#dialogOk').click();await pending;
 check(P.ctx(d.base).getImageData(55,55,1,1).data[1]===128,'Fundo não reconstruído');d.undo();check(same(),'Desfazer remoção falhou');d.redo();check(P.ctx(d.base).getImageData(55,55,1,1).data[1]===128,'Refazer remoção falhou');
 P.mobile.close();await T.set('hand');return{offline:true,localLight:true,cancel:true,preview:true,undoRedo:true};
};
