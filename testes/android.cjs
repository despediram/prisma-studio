/* Prisma Studio Android — testa blocos de arquivos e as restrições da ponte nativa. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),T=require('../js/core/android-transfer.js');
(async()=>{
 const bytes=Uint8Array.from({length:2*1024*1024+173},(_,i)=>(i*37+11)%256),blob=new Blob([bytes],{type:'image/png'}),chunks=[];let finished=false,aborted=false;
 const request=async(op,p)=>{if(op==='save-start')return{token:'token'};if(op==='write-chunk'){const block=T.decode(p.data);assert(block.length<=65536);assert(p.data.length<=90000);chunks.push(block);return{written:block.length};}if(op==='write-finish'){finished=true;return{name:'teste.png'};}if(op==='abort'){aborted=true;return{};}throw Error(op);};
 assert.equal((await T.write(blob,{op:'save-start',name:'teste.png',mime:'image/png'},request)).name,'teste.png');assert(finished);assert.equal(chunks.length,33);assert.deepEqual(Buffer.concat(chunks),Buffer.from(bytes));
 let index=0;const file=await T.read({token:'read',name:'aberta.png',mime:'image/png'},async(op)=>{assert.equal(op,'read-next');return index<chunks.length?{done:false,data:T.encode(chunks[index++])}:{done:true};});assert.equal(file.name,'aberta.png');assert.deepEqual(Buffer.from(await file.arrayBuffer()),Buffer.from(bytes));
 assert.equal(await T.write(blob,{op:'save-start'},async()=>({canceled:true})),false);
 await assert.rejects(T.write(blob,{op:'save-start'},async(op,p)=>{if(op==='save-start')return{token:'err'};if(op==='abort'){aborted=true;return{};}throw Error('Sem espaço');}),/Sem espaço/);assert(aborted);
 const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),java=read('android/app/src/main/java/br/prismastudio/android/MainActivity.java'),manifest=read('android/app/src/main/AndroidManifest.xml');
 assert.match(java,/!isMainFrame/);assert.match(java,/Collections.singleton\(ORIGIN\)/);assert.match(java,/setAllowFileAccess\(false\)/);assert.match(java,/ACTION_CREATE_DOCUMENT/);assert.match(java,/ACTION_OPEN_DOCUMENT/);assert(!java.includes('addJavascriptInterface'));
 assert(!/MANAGE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|CAMERA|RECORD_AUDIO/.test(manifest));assert.match(manifest,/android:usesCleartextTraffic="false"/);
 const html=read('index.html');assert(html.includes('js/core/android-transfer.js'));assert(html.includes('js/ui/android.js'));assert(read('android/app/build.gradle').includes("include 'index.html'"));
 console.log('Android: 2 MB preservados em 33 blocos; abertura, cancelamento e abortar validados; ponte restrita e sem acesso geral ao armazenamento.');
})().catch(e=>{console.error(e);process.exit(1)});
