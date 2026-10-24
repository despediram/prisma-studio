/* Prisma Studio — retoques da máscara em coordenadas normalizadas.
 * A prévia e o arquivo final usam os mesmos traços, sem reduzir a foto original.
 */
(function(){
 'use strict';PS.paintMaskEdits=(canvas,strokes)=>{const x=PS.ctx(canvas),w=canvas.width,h=canvas.height;x.save();x.lineCap=x.lineJoin='round';x.fillStyle=x.strokeStyle='#ffffff';for(const stroke of strokes){if(!stroke.points.length)continue;const r=stroke.radius*Math.min(w,h);x.globalCompositeOperation=stroke.mode==='erase'?'destination-out':'source-over';x.lineWidth=r*2;x.beginPath();x.arc(stroke.points[0].x*w,stroke.points[0].y*h,r,0,Math.PI*2);x.fill();if(stroke.points.length>1){x.beginPath();stroke.points.forEach((p,i)=>x[i?'lineTo':'moveTo'](p.x*w,p.y*h));x.stroke();}}x.restore();return canvas;};
})();
