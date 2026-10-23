/* Prisma Studio Android — integração real do WebView com arquivos locais e recuperação.
 * O CI executa este teste num emulador com a rede desligada.
 */
package br.prismastudio.android;

import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.*;
import android.webkit.WebView;

@RunWith(AndroidJUnit4.class)
public final class EditorTest {
 @Rule public ActivityScenarioRule<MainActivity> rule=new ActivityScenarioRule<>(MainActivity.class);
 private String evaluate(String script)throws Exception{CountDownLatch latch=new CountDownLatch(1);String[] value={null};rule.getScenario().onActivity(a->a.webForTest().evaluateJavascript(script,result->{value[0]=result;latch.countDown();}));assertTrue("JavaScript não respondeu",latch.await(15,TimeUnit.SECONDS));return value[0];}
 @Test public void editorOfflineRecoveryAndWorker()throws Exception{
  long deadline=System.currentTimeMillis()+90000;String ready="";
  while(System.currentTimeMillis()<deadline){ready=evaluate("Boolean(window.PS&&PS.android&&PS.doc)");if("true".equals(ready))break;Thread.sleep(250);}assertEquals("O editor Android não carregou","true",ready);
  try(var input=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("editor-interactions.js")){
   evaluate(new String(input.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));
  }
  evaluate("window.__prismaAndroidTest='rodando';(async()=>{try{const check=(v,m)=>{if(!v)throw Error(m)},P=PS,d=P.doc;await window.prismaTestInteractions(P);check(document.body.classList.contains('ps-android'),'Interface Android ausente');for(const [id,value] of Object.entries({pMargin:'0',pOverlap:'10',pBorder:'0',pGlueStyle:'tabs',pFormat:'png',pPdfOrient:'auto'}))check(document.getElementById(id).value===value,'Padrão incorreto: '+id);for(const [id,value] of Object.entries({pBleed:true,pMarkGlue:true,pMarkCut:false,pMarkLabels:true,pGuidePage:false,pSkipBlank:true,pSafePrint:false}))check(document.getElementById(id).checked===value,'Padrão incorreto: '+id);d.newDocument(320,240,'transparent','Teste Android');P.afterOpen();P.ctx(d.base).fillStyle='#e6007e';P.ctx(d.base).fillRect(15,20,50,40);d.commit('Pintura');d.addMask();d.setParam('exposure',.35);const blob=await P.createProjectBlob({background:true}),zip=await JSZip.loadAsync(blob),meta=JSON.parse(await zip.file('projeto.json').async('string'));check(meta.params.exposure===.35&&!!zip.file('camadas/0_mascara.png'),'Projeto incompleto');await P.android.checkpoint(true);const list=await P.android.request('recovery-list');check(list.length===1,'Cópia local ausente');const entry=await P.android.request('recovery-open',{key:list[0].id}),file=await PrismaAndroidTransfer.read(entry,P.android.request);await P.openProject(file);check(d.w===320&&d.h===240&&!!d.layer.mask&&d.params.exposure===.35,'Recuperação divergiu');const image=P.getImg(d.layer.canvas),resized=await P.run('resize',{img:image,w:480,h:360});check(resized.w===480&&resized.h===360,'Worker não redimensionou');await P.setMode('design');await P.design.ready;P.design.addText('heading');await P.android.checkpoint(true);check((await P.android.request('recovery-list')).some(x=>x.kind==='design'),'Design sem recuperação');await P.setMode('poster');await P.poster.refreshSource();await P.setMode('editor');await P.openUpscaler();const f=document.querySelector('#upscalerDialog iframe');await new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(f.contentDocument?.querySelector('#go')&&!f.contentDocument.querySelector('#go').disabled){clearInterval(t);resolve();}else if(++n>200){clearInterval(t);reject(Error('Ampliador ausente'));}},100);});check(P.android.back(),'Voltar não fechou ampliador');check(!document.querySelector('#upscalerDialog').open,'Ampliador continuou aberto');window.__prismaAndroidTest='APROVADO';}catch(e){window.__prismaAndroidTest='FALHA: '+e.message;}})();");
  String status="";deadline=System.currentTimeMillis()+120000;
  while(System.currentTimeMillis()<deadline){status=evaluate("window.__prismaAndroidTest");if(status.contains("APROVADO")||status.contains("FALHA"))break;Thread.sleep(400);}
  assertEquals("Integração Android: "+status,"\"APROVADO\"",status);
  assertEquals("Origem local inesperada","\"https://appassets.androidplatform.net\"",evaluate("location.origin"));
 }
}
