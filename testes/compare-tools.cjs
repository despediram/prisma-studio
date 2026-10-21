/* Comparação de regressão entre o ZIP original e os módulos. */
const {chromium}=require('playwright'),path=require('path');
(async()=>{if(!process.env.PRISMA_BASELINE)throw Error('Defina PRISMA_BASELINE como a pasta do projeto original descompactado.');const b=await chromium.launch({headless:true,executablePath:process.env.PRISMA_CHROMIUM||undefined,args:['--no-sandbox']});let all=[];
for(const dir of [process.env.PRISMA_BASELINE,path.resolve(__dirname,'..')]){const p=await b.newPage({viewport:{width:1400,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+path.resolve(dir+'/index.html'));await p.waitForFunction(()=>window.PS?.tools);const results=await p.evaluate(async()=>{
const d=PS.doc,T=PS.tools,res={},wait=()=>new Promise(r=>setTimeout(r,250));const e={pointerType:'mouse',pressure:1,clientX:250,clientY:150,altKey:false,shiftKey:false};
const setup=()=>{const c=PS.canvas(128,96),x=PS.ctx(c);x.fillStyle='#8e9aaf';x.fillRect(0,0,128,96);x.fillStyle='#e6007e';x.fillRect(30,25,50,50);d.load(c,'Teste');};const hash=c=>{let h=2166136261;for(const v of PS.ctx(c).getImageData(0,0,c.width,c.height).data)h=Math.imul(h^v,16777619);return h>>>0;};
for(const tool of ['hand','zoom','move','marquee','wand','crop','perspective','transform','brush','eraser','bucket','gradient','clone','heal','retouch','tone','liquify','text','shape','picker']){await T.set('hand');setup();await T.set(tool);const ids=[...document.querySelectorAll('#toolOptions [id]')].map(e=>e.id).sort();
if(tool==='clone'){T.pointer('down',{...e,altKey:true},{x:40,y:40});T.pointer('up',e,{x:40,y:40});}
T.pointer('down',e,{x:35,y:35});T.pointer('drag',e,{x:65,y:55});T.pointer('up',e,{x:65,y:55});await wait();
if(tool==='text')T.commitText();if(tool==='crop')await T.applyCrop();if(tool==='transform')T.applyTransform();await wait();
res[tool]={ids,pixels:hash(d.composite()),size:[d.w,d.h],layers:d.layers.map(l=>({name:l.name,x:l.x,y:l.y,type:l.type}))};}
return res;});await p.waitForTimeout(100);all.push({dir,results,errors});await p.close();}
const diffs=[];for(const k of Object.keys(all[0].results))if(!['brush','eraser'].includes(k)&&JSON.stringify(all[0].results[k])!==JSON.stringify(all[1].results[k]))diffs.push({tool:k,before:all[0].results[k],after:all[1].results[k]});console.log(JSON.stringify({diffs,errors:all.map(x=>({dir:x.dir,errors:x.errors}))},null,2));await b.close();if(diffs.length||all.some(x=>x.errors.length))process.exit(1);})().catch(e=>{console.error(e);process.exit(1)});
