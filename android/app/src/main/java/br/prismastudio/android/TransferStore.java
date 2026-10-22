/* Prisma Studio Android — transferências em blocos e recuperação privada em disco.
 * Não recebe caminhos livres do JavaScript; cada operação usa um token aleatório.
 * O índice de recuperação é atômico e mantém duas gerações por área do editor.
 */
package br.prismastudio.android;

import android.content.Context;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.util.AtomicFile;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.util.*;

final class TransferStore implements Closeable {
 static final int CHUNK=65536;
 private final Context context;
 private final File directory;
 private final Map<String,Transfer> transfers=new HashMap<>();
 private final AtomicFile index;
 static final class Transfer {
  InputStream input; FileOutputStream output; File temporary; String kind,name,mime; Uri shareUri; long bytes;
 }
 TransferStore(Context context){this.context=context;directory=new File(context.getFilesDir(),"recuperacao");directory.mkdirs();index=new AtomicFile(new File(directory,"indice.json"));}
 static String safeName(String raw){String s=raw==null?"projeto":raw.replace('\\','/');s=s.substring(s.lastIndexOf('/')+1).replaceAll("[\\x00-\\x1f<>:\"|?*]","_");return s.trim().isEmpty()?"projeto":s.substring(0,Math.min(180,s.length()));}
 static String validKind(String kind){if(!kind.equals("editor")&&!kind.equals("design"))throw new IllegalArgumentException("Tipo de projeto inválido.");return kind;}
 synchronized JSONObject beginSave(Uri uri,String name,String mime)throws Exception{
  String token=UUID.randomUUID().toString();Transfer t=new Transfer();t.name=safeName(name);t.mime=mime;// Mantém o descritor do provedor vivo durante a transferência.
  android.os.ParcelFileDescriptor descriptor=context.getContentResolver().openFileDescriptor(uri,"w");
  if(descriptor==null)throw new IOException("Não foi possível abrir o destino.");
  t.output=new android.os.ParcelFileDescriptor.AutoCloseOutputStream(descriptor);
  transfers.put(token,t);return new JSONObject().put("token",token);
 }
 synchronized JSONObject beginShare(String name,String mime)throws Exception{
  String token=UUID.randomUUID().toString();Transfer t=new Transfer();t.name=safeName(name);t.mime=mime;
  File folder=new File(context.getCacheDir(),"compartilhar/"+token);folder.mkdirs();File file=new File(folder,t.name);t.output=new FileOutputStream(file);t.shareUri=androidx.core.content.FileProvider.getUriForFile(context,context.getPackageName()+".files",file);transfers.put(token,t);return new JSONObject().put("token",token);
 }
 synchronized JSONObject beginRecovery(String kind,String name)throws Exception{
  validKind(kind);String token=UUID.randomUUID().toString();Transfer t=new Transfer();t.kind=kind;t.name=safeName(name);t.temporary=new File(directory,token+".part");t.output=new FileOutputStream(t.temporary);transfers.put(token,t);return new JSONObject().put("token",token);
 }
 synchronized JSONObject chunk(String token,String encoded)throws Exception{
  Transfer t=writeTransfer(token);if(encoded.length()>90000)throw new IOException("Bloco de arquivo inválido.");byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);if(bytes.length>CHUNK)throw new IOException("Bloco grande demais.");t.output.write(bytes);t.bytes+=bytes.length;return new JSONObject().put("written",t.bytes);
 }
 private Transfer writeTransfer(String token)throws IOException{Transfer t=transfers.get(token);if(t==null||t.output==null)throw new IOException("Transferência não encontrada.");return t;}
 synchronized JSONObject finish(String token)throws Exception{
  Transfer t=writeTransfer(token);t.output.flush();if(t.kind!=null)t.output.getFD().sync();t.output.close();t.output=null;
  try{
   if(t.kind!=null){
    File finalFile=new File(directory,token+".data");if(!t.temporary.renameTo(finalFile))throw new IOException("Não foi possível concluir a recuperação.");
    JSONObject item=new JSONObject().put("id",token).put("kind",t.kind).put("name",t.name).put("date",System.currentTimeMillis()).put("size",t.bytes);
    JSONArray old=list(),next=new JSONArray();next.put(item);int editor=t.kind.equals("editor")?1:0,design=t.kind.equals("design")?1:0;
    for(int i=0;i<old.length();i++){JSONObject row=old.getJSONObject(i);String kind=row.optString("kind");if(kind.equals("editor")&&editor++<2||kind.equals("design")&&design++<2)next.put(row);}
    FileOutputStream out=index.startWrite();try{out.write(next.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));index.finishWrite(out);}catch(Exception e){index.failWrite(out);throw e;}
    Set<String> keep=new HashSet<>();for(int i=0;i<next.length();i++)keep.add(next.getJSONObject(i).getString("id"));for(int i=0;i<old.length();i++){String id=old.getJSONObject(i).getString("id");if(!keep.contains(id))new File(directory,id+".data").delete();}
   }
   JSONObject result=new JSONObject().put("name",t.name).put("bytes",t.bytes);if(t.shareUri!=null)result.put("shareUri",t.shareUri.toString()).put("mime",t.mime);return result;
  }finally{transfers.remove(token);}
 }
 private static byte[] readBytes(InputStream input)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1)out.write(buffer,0,count);return out.toByteArray();}
 synchronized JSONArray list(){try(FileInputStream in=index.openRead()){return new JSONArray(new String(readBytes(in),java.nio.charset.StandardCharsets.UTF_8));}catch(Exception e){return new JSONArray();}}
 synchronized JSONObject openRecovery(String id)throws Exception{
  if(!id.matches("[a-f0-9-]{36}"))throw new IOException("Recuperação inválida.");JSONArray list=list();for(int i=0;i<list.length();i++){JSONObject item=list.getJSONObject(i);if(item.getString("id").equals(id)){Transfer t=new Transfer();t.input=new FileInputStream(new File(directory,id+".data"));t.name=item.getString("name");t.mime="application/octet-stream";String token=UUID.randomUUID().toString();transfers.put(token,t);return new JSONObject(item.toString()).put("token",token).put("mime",t.mime);}}
  throw new IOException("Recuperação não encontrada.");
 }
 synchronized JSONObject openIncoming(Uri uri)throws Exception{
  if(uri==null||!"content".equals(uri.getScheme()))throw new IOException("Nenhum arquivo compartilhado disponível.");
  String name="imagem",mime=context.getContentResolver().getType(uri);long size=-1;
  try(Cursor cursor=context.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE},null,null,null)){if(cursor!=null&&cursor.moveToFirst()){name=cursor.getString(0);if(!cursor.isNull(1))size=cursor.getLong(1);}}
  Transfer t=new Transfer();t.name=safeName(name);t.mime=mime==null?"application/octet-stream":mime;t.input=context.getContentResolver().openInputStream(uri);if(t.input==null)throw new IOException("Arquivo indisponível.");String token=UUID.randomUUID().toString();transfers.put(token,t);return new JSONObject().put("token",token).put("name",t.name).put("mime",t.mime).put("size",size);
 }
 synchronized JSONObject read(String token)throws Exception{
  Transfer t=transfers.get(token);if(t==null||t.input==null)throw new IOException("Leitura não encontrada.");byte[] block=new byte[CHUNK];int count=t.input.read(block);if(count<0){t.input.close();transfers.remove(token);return new JSONObject().put("done",true);}
  return new JSONObject().put("done",false).put("data",Base64.encodeToString(block,0,count,Base64.NO_WRAP));
 }
 synchronized void abort(String token){Transfer t=transfers.remove(token);if(t==null)return;try{if(t.input!=null)t.input.close();if(t.output!=null)t.output.close();}catch(IOException ignored){}if(t.temporary!=null)t.temporary.delete();}
 public synchronized void close(){for(String token:new ArrayList<>(transfers.keySet()))abort(token);}
}
