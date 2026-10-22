/* Prisma Studio Desktop — ponte isolada com operações específicas.
 * Não expõe Node.js, caminhos livres, eval nem o objeto ipcRenderer ao editor.
 * Subquadros, incluindo o ampliador, não recebem a ponte de arquivos.
 */
'use strict';
const {contextBridge,ipcRenderer}=require('electron');
if(process.isMainFrame){
 contextBridge.exposeInMainWorld('PrismaDesktop',Object.freeze({
  info:()=>ipcRenderer.invoke('prisma:info'),
  open:()=>ipcRenderer.invoke('prisma:open'),
  save:payload=>ipcRenderer.invoke('prisma:save',payload),
  autosave:payload=>ipcRenderer.invoke('prisma:autosave',payload),
  recoveries:()=>ipcRenderer.invoke('prisma:recoveries'),
  recover:id=>ipcRenderer.invoke('prisma:recover',id),
  ready:()=>ipcRenderer.send('prisma:ready'),
  state:payload=>ipcRenderer.send('prisma:state',payload),
  closed:ok=>ipcRenderer.send('prisma:closed',ok===true),
  onCommand:callback=>{const listener=(_event,payload)=>callback(payload);ipcRenderer.on('prisma:command',listener);return()=>ipcRenderer.removeListener('prisma:command',listener);}
 }));
}
