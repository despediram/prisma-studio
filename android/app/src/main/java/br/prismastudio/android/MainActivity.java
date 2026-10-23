/* Prisma Studio Android — janela nativa, arquivos SAF e ponte restrita à origem local.
 * Os recursos do APK usam HTTPS virtual, sem servidor e sem depender de file://.
 * Não pede acesso geral ao armazenamento, câmera ou microfone.
 */
package br.prismastudio.android;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.*;
import org.json.*;
import java.util.*;
import java.util.concurrent.*;

public final class MainActivity extends Activity {
 static final String ORIGIN="https://appassets.androidplatform.net";
 static final String HOME=ORIGIN+"/assets/www/index.html";
 private WebView web;
 private TransferStore store;
 private final ExecutorService io=Executors.newSingleThreadExecutor();
 private ValueCallback<Uri[]> chooser;
 private Uri incoming;
 private boolean ready=false;
 private JSONObject pendingSave;
 private JavaScriptReplyProxy pendingReply;
 private static final int CHOOSE=10,SAVE=11;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);store=new TransferStore(this);takeIncoming(getIntent());
  LinearLayout root=new LinearLayout(this);root.setBackgroundColor(Color.rgb(31,34,38));root.setOrientation(LinearLayout.VERTICAL);
  if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  root.setOnApplyWindowInsetsListener((view,insets)->{
   int left,top,right,bottom;
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()),keyboard=insets.getInsets(WindowInsets.Type.ime());left=bars.left;top=bars.top;right=bars.right;bottom=Math.max(bars.bottom,keyboard.bottom);}
   else{left=insets.getSystemWindowInsetLeft();top=0;right=insets.getSystemWindowInsetRight();bottom=0;}
   view.setPadding(left,top,right,bottom);return insets;
  });
  web=new WebView(this);web.setBackgroundColor(Color.rgb(21,23,26));root.addView(web,new LinearLayout.LayoutParams(-1,-1));setContentView(root);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);settings.setUseWideViewPort(true);settings.setLoadWithOverviewMode(false);settings.setTextZoom(100);settings.setBuiltInZoomControls(false);settings.setMediaPlaybackRequiresUserGesture(true);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return resource(loader,request);}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !local(request.getUrl());}
   @Override public void onPageFinished(WebView view,String url){if(HOME.equals(url))web.evaluateJavascript("window.dispatchEvent(new Event('prisma:android-ready'))",null);}
   @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){view.destroy();new AlertDialog.Builder(MainActivity.this).setTitle("Prisma Studio").setMessage("O motor de imagem foi encerrado. Reabra o aplicativo e use Recuperar trabalho para retomar a última cópia concluída.").setPositiveButton("Fechar",(d,w)->finish()).setCancelable(false).show();return true;}
  });
  ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){@Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request){return resource(loader,request);}});
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams parameters){
    if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;
    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,parameters.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);
    try{startActivityForResult(intent,CHOOSE);}catch(ActivityNotFoundException e){chooser.onReceiveValue(null);chooser=null;Toast.makeText(MainActivity.this,"Nenhum seletor de arquivos disponível.",Toast.LENGTH_LONG).show();}return true;
   }
   @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
  });
  web.setDownloadListener((url,agent,disposition,mime,length)->Toast.makeText(this,"Use Exportar ou Salvar no Prisma para escolher o destino do arquivo.",Toast.LENGTH_LONG).show());
  if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
   new AlertDialog.Builder(this).setTitle("Atualize o motor do Android").setMessage("Atualize o Android System WebView ou o Chrome para abrir esta versão do Prisma.").setPositiveButton("Fechar",(d,w)->finish()).setCancelable(false).show();return;
  }
  WebViewCompat.addWebMessageListener(web,"PrismaAndroidHost",Collections.singleton(ORIGIN),(view,message,origin,isMainFrame,reply)->{
   if(!isMainFrame||!ORIGIN.equals(origin.toString())||!local(Uri.parse(view.getUrl()==null?"":view.getUrl())))return;
   try{String data=message.getData();if(data==null||data.length()>100000)throw new IllegalArgumentException("Mensagem de arquivo inválida.");handle(new JSONObject(data),reply);}catch(Exception e){Toast.makeText(this,"Não foi possível receber a operação: "+e.getMessage(),Toast.LENGTH_LONG).show();}
  });
  if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
  web.loadUrl(HOME);
 }
 static boolean local(Uri uri){return "https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443)&&uri.getPath()!=null&&uri.getPath().startsWith("/assets/www/");}
 private WebResourceResponse resource(WebViewAssetLoader loader,WebResourceRequest request){
  Uri uri=request.getUrl();if(!"appassets.androidplatform.net".equals(uri.getHost()))return null;
  WebResourceResponse result=loader.shouldInterceptRequest(uri);
  if(result==null)return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new java.io.ByteArrayInputStream(new byte[0]));
  Map<String,String> headers=new HashMap<>();headers.put("Content-Security-Policy","default-src 'self' data: blob:; script-src 'self' blob: 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob: https://huggingface.co https://*.huggingface.co https://*.hf.co; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'");result.setResponseHeaders(headers);return result;
 }
 private void handle(JSONObject message,JavaScriptReplyProxy reply)throws Exception{
  String op=message.getString("op");int id=message.getInt("id");
  if(op.equals("ready")){ready=true;respond(reply,id,new JSONObject().put("version","0.1.2").put("incoming",incoming!=null),null);return;}
  if(op.equals("close-app")){respond(reply,id,new JSONObject(),null);finish();return;}
  if(op.equals("save-start")){
   if(pendingSave!=null){respond(reply,id,null,"Termine o salvamento anterior.");return;}
   pendingSave=message;pendingReply=reply;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(message.optString("mime","application/octet-stream"));intent.putExtra(Intent.EXTRA_TITLE,TransferStore.safeName(message.optString("name","arquivo")));
   try{startActivityForResult(intent,SAVE);}catch(ActivityNotFoundException e){pendingSave=null;pendingReply=null;respond(reply,id,null,"Nenhum seletor de destino disponível.");}return;
  }
  final Uri available=incoming;
  if(op.equals("read-open"))incoming=null;
  io.execute(()->{try{
   Object result;
   switch(op){
    case "write-chunk":result=store.chunk(message.getString("token"),message.getString("data"));break;
    case "share-start":result=store.beginShare(message.getString("name"),message.getString("mime"));break;
    case "write-finish":result=store.finish(message.getString("token"));if(((JSONObject)result).has("shareUri")){JSONObject shared=(JSONObject)result;runOnUiThread(()->{try{Intent send=new Intent(Intent.ACTION_SEND).setType(shared.optString("mime")).putExtra(Intent.EXTRA_STREAM,Uri.parse(shared.optString("shareUri"))).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(Intent.createChooser(send,"Compartilhar com"));}catch(Exception e){Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();}});}break;
    case "abort":store.abort(message.getString("token"));result=new JSONObject();break;
    case "recovery-start":result=store.beginRecovery(message.getString("kind"),message.getString("name"));break;
    case "recovery-list":result=store.list();break;
    case "recovery-open":result=store.openRecovery(message.getString("key"));break;
    case "read-open":result=store.openIncoming(available);break;
    case "read-next":result=store.read(message.getString("token"));break;
    default:throw new IllegalArgumentException("Operação não suportada.");
   }
   respond(reply,id,result,null);
  }catch(Exception e){respond(reply,id,null,e.getMessage());}});
 }
 private void respond(JavaScriptReplyProxy reply,int id,Object value,String error){runOnUiThread(()->{if(isFinishing()||isDestroyed())return;try{JSONObject response=new JSONObject().put("id",id);if(error==null)response.put("value",value==null?JSONObject.NULL:value);else response.put("error",error);reply.postMessage(response.toString());}catch(Exception ignored){}});}
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==CHOOSE){if(chooser!=null){List<Uri> files=new ArrayList<>();if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){for(int i=0;i<data.getClipData().getItemCount();i++)files.add(data.getClipData().getItemAt(i).getUri());}else if(data.getData()!=null)files.add(data.getData());}chooser.onReceiveValue(files.isEmpty()?null:files.toArray(new Uri[0]));chooser=null;}return;}
  if(request==SAVE&&pendingSave!=null){JSONObject message=pendingSave;JavaScriptReplyProxy reply=pendingReply;pendingSave=null;pendingReply=null;int id=message.optInt("id");if(result!=RESULT_OK||data==null||data.getData()==null){try{respond(reply,id,new JSONObject().put("canceled",true),null);}catch(JSONException ignored){}return;}Uri uri=data.getData();io.execute(()->{try{respond(reply,id,store.beginSave(uri,message.optString("name"),message.optString("mime")),null);}catch(Exception e){respond(reply,id,null,e.getMessage());}});}
 }
 private void takeIncoming(Intent intent){if(intent==null)return;Uri uri=null;if(Intent.ACTION_SEND.equals(intent.getAction()))uri=intent.getParcelableExtra(Intent.EXTRA_STREAM);else if(Intent.ACTION_VIEW.equals(intent.getAction()))uri=intent.getData();if(uri!=null&&"content".equals(uri.getScheme()))incoming=uri;}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);takeIncoming(intent);if(ready&&incoming!=null)web.evaluateJavascript("window.dispatchEvent(new Event('prisma:android-incoming'))",null);}
 @Override public void onBackPressed(){handleBack();}
 private void handleBack(){if(web==null){finish();return;}web.evaluateJavascript("Boolean(window.PS&&PS.android&&PS.android.back())",handled->{if("true".equals(handled))return;new AlertDialog.Builder(this).setTitle("Sair do Prisma?").setMessage("Use Salvar projeto para escolher o arquivo definitivo. Ao sair, o Prisma tentará concluir uma cópia de recuperação local.").setNegativeButton("Continuar editando",null).setPositiveButton("Sair",(d,w)->web.evaluateJavascript("window.PS&&PS.android&&PS.android.prepareExit()",null)).show();});}
 @Override protected void onPause(){if(web!=null&&ready)web.evaluateJavascript("window.dispatchEvent(new Event('prisma:android-background'))",null);super.onPause();}
 @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);io.execute(()->store.close());io.shutdown();if(web!=null)web.destroy();super.onDestroy();}
 WebView webForTest(){return web;}
 TransferStore storeForTest(){return store;}
}
