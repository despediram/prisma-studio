/* Prisma Studio — folha de calibração independente, sem correção aplicada.
 * As duas réguas de 100 mm permitem medir a escala horizontal e vertical.
 * O valor medido alimenta os controles existentes calX/calY do PDF final.
 */
(function () {
  'use strict';
  const PS=window.PS,K=PS.PT_PER_MM;
  PS.poster.buildCalibrationPdf=async()=>{
    const {PDFDocument,StandardFonts,rgb}=window.PDFLib,pdf=await PDFDocument.create();
    const page=pdf.addPage([210*K,297*K]),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),ink=rgb(.08,.1,.13);
    const text=(s,x,y,size=10,f=font)=>page.drawText(s,{x:x*K,y:(297-y)*K,size,font:f,color:ink});
    const line=(x1,y1,x2,y2,width=.6)=>page.drawLine({start:{x:x1*K,y:(297-y1)*K},end:{x:x2*K,y:(297-y2)*K},thickness:width,color:ink});
    text('Teste de escala - Prisma Studio',20,24,17,bold);
    text('Papel A4. Imprima em Tamanho real / 100%.',20,34);
    text('Desative Ajustar a pagina e qualquer ampliacao automatica.',20,41);
    text('Esta folha nao recebe a correcao de escala do poster.',20,48);
    const ox=45,oy=75;
    line(ox,oy,ox+100,oy);line(ox,oy,ox,oy+100);line(ox+100,oy,ox+100,oy+100);line(ox,oy+100,ox+100,oy+100);
    for(let i=0;i<=100;i++){
      const tick=i%10===0?4:i%5===0?2.5:1.2;
      line(ox+i,oy-tick,ox+i,oy+tick,.35);line(ox-tick,oy+i,ox+tick,oy+i,.35);
      if(i%10===0){text(String(i),ox+i-2,oy-7,7);text(String(i),ox-13,oy+i+1,7);}
    }
    text('100 mm na horizontal',64,188,11,bold);
    text('100 mm na vertical',64,195,11,bold);
    text('Meca entre as marcas de 0 e 100, sem incluir as pontas dos tracos.',20,213,9);
    text('Digite as medidas reais nos campos horizontal e vertical do site.',20,221,9);
    text('Exemplo: se a regua horizontal mediu 98 mm, informe 98.',20,229,9);
    text('Se o desvio variar entre folhas, confira o driver e a alimentacao do papel.',20,240,9);
    return new Blob([await pdf.save()],{type:'application/pdf'});
  };
  PS.$('#pCalibrationPdf').addEventListener('click',async()=>{
    try{PS.download(await PS.poster.buildCalibrationPdf(),'prisma_teste_100x100mm_A4.pdf');PS.toast('Imprima a folha em 100% e meça as duas réguas.','success');}
    catch(e){PS.toast('Não foi possível gerar a folha de teste: '+e.message,'error');}
  });
})();
