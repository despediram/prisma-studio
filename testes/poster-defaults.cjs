/* Prisma Studio — regressão dos padrões de impressão e migração das preferências.
 * Executa a inicialização real do montador sem exigir Canvas, rede ou impressora.
 */
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/poster/poster.js'), 'utf8');
const startup = source.slice(0, source.indexOf('  const src =')) + '\nwindow.result = cfg;})();';
const expected = {margin:0, overlap:10, bleed:true, border:0, glueStyle:'tabs', safePrint:false,
  markGlue:true, markCut:false, markLabels:true, guidePage:false, skipBlank:true, format:'png', pdfOrient:'auto'};
function boot(raw, blocked = false) {
  let stored = raw;
  const sandbox = {window:{PS:{doc:{}}}, localStorage:{
    getItem(key) { assert.equal(key, 'prisma.poster'); if (blocked) throw Error('bloqueado'); return stored; },
    setItem(key, value) { assert.equal(key, 'prisma.poster'); if (blocked) throw Error('bloqueado'); stored = value; }
  }};
  vm.runInNewContext(startup, sandbox);
  return {cfg:JSON.parse(JSON.stringify(sandbox.window.result)), stored};
}
function checkDefaults(cfg) { for (const [key, value] of Object.entries(expected)) assert.equal(cfg[key], value, key); }
for (const raw of [undefined, '{inválido', 'null', '[]', 'false']) checkDefaults(boot(raw).cfg);
checkDefaults(boot(undefined, true).cfg);
for (const mountingVersion of [undefined, 1, 2, 3, 4]) {
  const previous = {mountingVersion, margin:5, overlap:25, glueStyle:'image', markLabels:false,
    cols:7, rows:5, dpi:600, calX:98.3, calY:101.2, paper:'A3', targetW:1730, theme:'light'};
  const migrated = boot(JSON.stringify(previous));
  checkDefaults(migrated.cfg);
  for (const key of ['cols','rows','dpi','calX','calY','paper','targetW','theme']) assert.equal(migrated.cfg[key], previous[key], key);
  assert.equal(JSON.parse(migrated.stored).mountingVersion, 5, 'Migração deve ser persistida imediatamente');
  checkDefaults(boot(migrated.stored).cfg);
  const edited = {...migrated.cfg, margin:3, overlap:16, glueStyle:'overlap', markCut:true, format:'jpeg', pdfOrient:'portrait'};
  const reopened = boot(JSON.stringify(edited));
  for (const key of ['margin','overlap','glueStyle','markCut','format','pdfOrient']) assert.equal(reopened.cfg[key], edited[key], 'Reabertura: '+key);
}
// O mesmo arquivo HTML e o mesmo motor são empacotados no EXE e no APK.
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [id, checked] of Object.entries({pSafePrint:false,pBleed:true,pMarkGlue:true,pMarkCut:false,pMarkLabels:true,pGuidePage:false,pSkipBlank:true})) {
  const input = html.match(new RegExp('<input\\b[^>]*id="'+id+'"[^>]*>'));
  assert(input, id); assert.equal(/\bchecked\b/.test(input[0]), checked, id);
}
assert.match(html, /id="pMargin"[^>]*value="0"/);
assert.match(html, /id="pOverlap"[^>]*value="10"/);
assert.match(html, /<option value="tabs" selected>/);
assert.match(html, /<option value="auto" selected>Igual à das folhas/);
const PS = {clamp:(v,a,b)=>Math.max(a, Math.min(b,v))};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/poster/poster-geometry.js'),'utf8'), {window:{PS}});
const geometry = PS.posterGeometry(boot().cfg, 410, 584);
assert.equal(geometry.finalW, 410); assert.equal(geometry.finalH, 584);
console.log('Padrões aprovados; migração única; preferências preservadas; A4 2×2 = 410×584 mm.');
