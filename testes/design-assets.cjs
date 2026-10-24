/* Prisma Studio — referências de fotos, restauração e liberação do histórico. */
const assert=require('node:assert/strict'),Assets=require('../js/design/history-assets.js'),H=new Assets(),source='data:image/png;base64,'+'a'.repeat(4*1024*1024),states=[];
for(let i=0;i<100;i++)states.push(H.capture({pages:[{objects:[{type:'Image',src:source,left:i}]}]}));
assert.equal(H.sources.size,1);assert(H.bytes(states)<100000);for(let i=0;i<100;i++){const restored=H.restore(states[i]);assert.equal(restored.pages[0].objects[0].src,source);assert.equal(restored.pages[0].objects[0].left,i);}
const replacement=H.capture({pages:[{objects:[{type:'Image',src:'data:image/png;base64,b',left:0}]}]});assert(H.bytes([...states,replacement])>8*1024*1024);H.collect([replacement]);assert.equal(H.sources.size,1);assert.equal(H.ids.size,1);assert.throws(()=>H.restore(states[0]));H.clear();assert.equal(H.sources.size,0);
console.log('Design: 100 alterações compartilham uma única foto; restauração e liberação de fontes aprovadas.');
