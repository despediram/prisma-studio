/* Prisma Studio — executa a validação sequencial para limitar a memória do navegador. */
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const name of ['poster-sheet','poster-phone','history','paint','preview','toolbar','regression','poster','poster-marks','poster-safe','poster-bleed','poster-seam','design','studio-upgrade']){
  const result=spawnSync(process.execPath,[path.join(__dirname,name+'.cjs')],{stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
