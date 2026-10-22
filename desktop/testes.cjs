/* Prisma Studio Desktop — valida recuperação, isolamento de projetos e integridade em disco. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Storage,atomicWrite,safeName}=require('./storage.cjs');
test('escrita atômica mantém original quando a substituição falha',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'prisma-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const file=path.join(root,'projeto.prisma');await atomicWrite(file,Buffer.from('anterior'));
 await assert.rejects(atomicWrite(file,{}));assert.equal(await fs.readFile(file,'utf8'),'anterior');assert.deepEqual(await fs.readdir(root),['projeto.prisma']);
 await atomicWrite(file,Buffer.from('novo'));assert.equal(await fs.readFile(file,'utf8'),'novo');
});
test('recuperação concorrente mantém as duas últimas gerações de cada área',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'prisma-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const store=new Storage(root);
 await Promise.all(Array.from({length:6},(_,i)=>store.save(i%2?'design':'editor','C:\\pasta\\nome.prisma',Buffer.from('dados '+i))));
 const list=await store.list();assert.equal(list.length,4);assert.deepEqual(list.filter(x=>x.kind==='editor').map(x=>x.name),['nome.prisma','nome.prisma']);
 for(const [kind,expected] of [['editor','dados 4'],['design','dados 5']]){const item=list.find(x=>x.kind===kind);assert.equal(Buffer.from((await store.recover(item.id)).bytes).toString(),expected);}
 assert.equal((await fs.readdir(path.join(root,'recuperacao'))).length,4);await assert.rejects(store.recover('../preferencias.json'));
 await assert.rejects(async()=>store.save('invalido','x',Buffer.from('x')));await assert.rejects(async()=>store.save('editor','vazio',new Uint8Array()));
});
test('nomes não podem escapar da pasta e preferências sobrevivem à reabertura',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'prisma-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const store=new Storage(root);
 assert.equal(safeName('../../foto.png'),'foto.png');assert.equal(safeName('C:\\Users\\foto.png'),'foto.png');assert.equal(safeName(''),'projeto');
 await store.setPreferences({bounds:{width:1440,height:900},recent:['foto.png']});assert.equal((await new Storage(root).preferences()).bounds.width,1440);
});
test('a compilação mantém sandbox e exclui fontes de teste',async()=>{
 const fsSync=require('node:fs'),root=path.join(__dirname,'..'),main=fsSync.readFileSync(path.join(__dirname,'main.cjs'),'utf8'),preload=fsSync.readFileSync(path.join(__dirname,'preload.cjs'),'utf8'),config=require('../package.json');
 assert.match(main,/nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true/);assert.match(main,/event.senderFrame===win.webContents.mainFrame/);assert.match(preload,/if\(process.isMainFrame\)/);
 assert(config.build.files.includes('licencas/**/*'));assert(config.build.files.includes('!desktop/smoke.cjs'));assert(fsSync.existsSync(path.join(root,'vendor/onnxruntime/ort.webgpu.min.js')));
});
