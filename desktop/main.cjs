/* Prisma Studio Desktop — janela Windows, menus, arquivos e ciclo de vida.
 * A interface continua local, com sandbox e contexto isolado. IPC aceita só
 * a janela principal; arquivos são escolhidos em diálogos ou recentes aprovados.
 */
'use strict';
const {app,BrowserWindow,Menu,dialog,ipcMain,session,screen,shell}=require('electron');
const {randomUUID}=require('node:crypto');
const path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os'),{pathToFileURL}=require('node:url');
const {Storage,atomicWrite,safeName,validKind}=require('./storage.cjs');
const ROOT=path.resolve(__dirname,'..'),APP_URL=pathToFileURL(path.join(ROOT,'index.html')).href;
const SMOKE=!app.isPackaged&&process.argv.includes('--smoke-test');
let win,store,prefs={},ready=false,dirty=false,allowClose=false,closing=false,pendingFile=null;
const projectPaths=new Map();
const EXT=['png','jpg','jpeg','webp','gif','bmp','avif','svg','psd','prisma','prismadesign'];
const mime=name=>({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',avif:'image/avif',gif:'image/gif',bmp:'image/bmp'}[path.extname(name).slice(1).toLowerCase()]||'application/octet-stream');
const accepted=name=>EXT.includes(path.extname(name).slice(1).toLowerCase());
function trusted(event){return !!win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame&&event.senderFrame.url===APP_URL;}
function assertTrusted(e){if(!trusted(e))throw Error('Origem não autorizada.');}
function command(action,extra={}){if(ready)win.webContents.send('prisma:command',{action,...extra});}
function report(e){dialog.showErrorBox('Prisma Studio',e.message||String(e));}
let prefsQueue=Promise.resolve();
function persist(){const snapshot=structuredClone(prefs);prefsQueue=prefsQueue.catch(()=>{}).then(()=>store.setPreferences(snapshot));return prefsQueue;}
async function recent(file){prefs.recent=[file,...(prefs.recent||[]).filter(p=>p!==file)].slice(0,10);await persist();menus();}
async function readFile(file){if(!accepted(file)||!(await fs.stat(file)).isFile())throw Error('Escolha uma imagem, PSD ou projeto Prisma.');const bytes=new Uint8Array(await fs.readFile(file)),documentKey=randomUUID();if(/\.prisma(design)?$/i.test(file))projectPaths.set(documentKey,file);return {name:path.basename(file),type:mime(file),bytes,documentKey};}
async function sendFile(file){try{const data=await readFile(file);await recent(file);command('open-file',{file:data});}catch(e){report(e);}}
function menus(){
 const send=action=>()=>command(action);
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:'Arquivo',submenu:[{label:'Novo documento…',accelerator:'CmdOrCtrl+N',click:send('new')},{label:'Abrir…',accelerator:'CmdOrCtrl+O',click:send('open')},
   {label:'Arquivos recentes',submenu:(prefs.recent||[]).length?(prefs.recent||[]).map(file=>({label:path.basename(file),sublabel:file,click:()=>sendFile(file)})):[{label:'Nenhum arquivo recente',enabled:false}]},
   {type:'separator'},{label:'Salvar projeto…',accelerator:'CmdOrCtrl+Alt+S',click:send('save')},{label:'Salvar projeto como…',click:send('save-as')},{label:'Exportar imagem…',accelerator:'CmdOrCtrl+Shift+E',click:send('export')},{label:'Exportar PSD…',click:send('psd')},
   {type:'separator'},{label:'Recuperar trabalho…',click:send('recovery')},{label:'Sair',accelerator:'Alt+F4',click:()=>win.close()}]},
  {label:'Editar',submenu:[{label:'Desfazer',accelerator:'CmdOrCtrl+Z',click:send('undo')},{label:'Refazer',accelerator:'CmdOrCtrl+Shift+Z',click:send('redo')},{type:'separator'},{role:'cut',label:'Recortar texto'},{role:'copy',label:'Copiar texto'},{role:'paste',label:'Colar'}]},
  {label:'Área de trabalho',submenu:[{label:'Editor de imagens',click:send('editor')},{label:'Design e convites',click:send('design')},{label:'Pôsteres em A4',click:send('poster')},{type:'separator'},{label:'Ampliar e restaurar…',click:send('upscale')},{label:'Enquadrar imagem',accelerator:'CmdOrCtrl+0',click:send('fit')},{role:'togglefullscreen',label:'Tela cheia'}]},
  {label:'Ajuda',submenu:[{label:'Atalhos de teclado',click:send('help')},{label:'Sobre e armazenamento…',click:send('about')},{label:'Versões e atualizações',click:()=>shell.openExternal('https://github.com/despediram/prisma-studio/releases')}]}]));
}
async function chooseSave(payload){
 const name=safeName(payload?.name),kind=payload?.kind;
 if(kind!==undefined)validKind(kind);
 if(!(payload?.bytes instanceof Uint8Array)||!payload.bytes.byteLength)throw Error('Arquivo vazio ou inválido.');
 let file=kind&&!payload.saveAs?projectPaths.get(payload.documentKey):null;
 if(!file){
  if(SMOKE)file=path.join(app.getPath('userData'),'teste',name);
  else{const result=await dialog.showSaveDialog(win,{title:'Salvar '+name,defaultPath:path.join(prefs.exportDirectory||app.getPath('documents'),name),filters:[{name:'Arquivo '+path.extname(name),extensions:[path.extname(name).slice(1)||'prisma']}]});if(result.canceled||!result.filePath)return {canceled:true};file=result.filePath;}
 }
 await atomicWrite(file,payload.bytes);prefs.exportDirectory=path.dirname(file);
 if(kind){projectPaths.set(payload.documentKey,file);await recent(file);}else await persist();
 return {canceled:false,name:path.basename(file)};
}
function setupIPC(){
 const handle=(channel,fn)=>ipcMain.handle('prisma:'+channel,async(e,arg)=>{assertTrusted(e);return fn(arg);});
 handle('info',()=>({version:app.getVersion(),platform:process.platform,totalMemory:os.totalmem(),recoveryDirectory:path.join(app.getPath('userData'),'recuperacao')}));
 handle('open',async()=>{const result=await dialog.showOpenDialog(win,{title:'Abrir no Prisma Studio',properties:['openFile'],filters:[{name:'Imagens e projetos Prisma',extensions:EXT}]});if(result.canceled)return null;const file=result.filePaths[0],data=await readFile(file);await recent(file);return data;});
 handle('save',chooseSave);
 handle('autosave',p=>store.save(p?.kind,p?.name,p?.bytes));
 handle('recoveries',()=>store.list());handle('recover',id=>store.recover(id));
 ipcMain.on('prisma:ready',e=>{if(!trusted(e))return;ready=true;if(pendingFile){sendFile(pendingFile);pendingFile=null;}});
 ipcMain.on('prisma:state',(e,p)=>{if(!trusted(e))return;dirty=!!p?.dirty;const name=String(p?.name||'Sem documento').slice(0,140);win.setTitle((dirty?'● ':'')+name+' — Prisma Studio');});
 ipcMain.on('prisma:closed',async(e,ok)=>{if(!trusted(e))return;closing=false;if(ok===true){try{prefs.bounds=win.getNormalBounds();prefs.maximized=win.isMaximized();await persist();allowClose=true;win.close();}catch(error){report(error);}}});
}
async function createWindow(){
 const b=prefs.bounds||{},display=screen.getPrimaryDisplay().workArea;
 win=new BrowserWindow({width:Math.max(900,Math.min(b.width||1440,display.width)),height:Math.max(650,Math.min(b.height||960,display.height)),minWidth:900,minHeight:650,show:false,title:'Prisma Studio',backgroundColor:'#18171e',icon:path.join(__dirname,'icon.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false}});
 if(prefs.maximized&&!SMOKE)win.maximize();
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(e,url)=>{if(url!==APP_URL)e.preventDefault();});
 win.webContents.on('will-attach-webview',e=>e.preventDefault());
 win.webContents.on('will-prevent-unload',e=>{if(allowClose)e.preventDefault();});
 win.on('close',async e=>{
  if(allowClose)return;e.preventDefault();if(closing)return;closing=true;
  try{
   if(dirty){const result=await dialog.showMessageBox(win,{type:'question',title:'Salvar antes de sair?',message:'Há projetos com alterações não salvas.',detail:'Salvar grava os projetos modificados do Editor e do Design. As cópias de recuperação ficam no computador.',buttons:['Salvar projetos e sair','Cancelar','Sair sem salvar'],defaultId:0,cancelId:1,noLink:true});if(result.response===1){closing=false;return;}if(result.response===0){command('save-and-close');return;}}
   prefs.bounds=win.getNormalBounds();prefs.maximized=win.isMaximized();await persist();allowClose=true;win.close();
  }catch(e){closing=false;report(e);}
 });
 win.webContents.on('render-process-gone',(_e,details)=>{if(!SMOKE)dialog.showErrorBox('Prisma Studio','O editor foi encerrado ('+details.reason+'). Reabra o aplicativo e use Recuperar trabalho para retomar a última cópia concluída.');});
 win.once('ready-to-show',()=>{if(!SMOKE)win.show();});menus();await win.loadURL(APP_URL);
 if(SMOKE){try{await require('./smoke.cjs')(win,store);console.log('PRISMA_DESKTOP_SMOKE_OK');app.exit(0);}catch(e){console.error(e);app.exit(1);}}
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',(_e,args)=>{const file=args.find(x=>!x.startsWith('-')&&accepted(x));if(file&&win){win.restore();win.focus();if(ready)sendFile(file);else pendingFile=file;}});
 app.on('open-file',(e,file)=>{e.preventDefault();if(ready)sendFile(file);else pendingFile=file;});
 pendingFile=process.argv.slice(1).find(x=>!x.startsWith('-')&&accepted(x))||null;
 app.whenReady().then(async()=>{
  if(SMOKE)app.setPath('userData',await fs.mkdtemp(path.join(os.tmpdir(),'prisma-desktop-test-')));
  app.setAppUserModelId('br.prismastudio.desktop');store=new Storage(app.getPath('userData'));prefs=await store.preferences();
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onHeadersReceived((details,callback)=>callback({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':["default-src 'self' file: data: blob:; script-src 'self' file: blob: 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' file: data: blob:; connect-src 'self' file: blob: https://huggingface.co https://*.huggingface.co https://*.hf.co; worker-src 'self' blob:; frame-src 'self' file: blob:; object-src 'none'; base-uri 'self'"]}}));
  session.defaultSession.on('will-download',(_e,item)=>{const name=safeName(item.getFilename());item.setSaveDialogOptions({title:'Salvar '+name,defaultPath:path.join(prefs.exportDirectory||app.getPath('downloads'),name)});item.on('done',(_e,state)=>{if(state==='completed'){prefs.exportDirectory=path.dirname(item.getSavePath());persist().catch(report);}else if(state!=='cancelled')report(Error('Não foi possível salvar o arquivo.'));});});
  setupIPC();await createWindow();
 }).catch(e=>{console.error(e);report(e);app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
