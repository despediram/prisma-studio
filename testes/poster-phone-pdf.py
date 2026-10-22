# Prisma Studio — conferência independente do PDF exportado e simulação de margens físicas.
from pathlib import Path
import fitz,numpy as np,json,sys
from PIL import Image,ImageDraw
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('.');results=[]
for cols,rows in [(2,2),(3,4)]:
 pdf=fitz.open(root/f'teste-celular-{cols}x{rows}.pdf');assert len(pdf)==cols*rows
 pages=[]
 for i,page in enumerate(pdf):
  assert abs(page.rect.width*25.4/72-210)<1e-4 and abs(page.rect.height*25.4/72-297)<1e-4
  pix=page.get_pixmap(matrix=fitz.Matrix(101.6/72,101.6/72),alpha=False)
  a=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3);pages.append(a)
  assert not np.any(np.all(a>245,axis=2)),f'Branco acrescentado na página {i}'
 errors=[]
 for r in range(rows):
  for c in range(cols):
   n=r*cols+c
   if c+1<cols:errors.append(np.abs(pages[n][:,-100:].astype(float)-pages[n+1][:,:100].astype(float)))
   if r+1<rows:errors.append(np.abs(pages[n][-100:].astype(float)-pages[n+cols][:100].astype(float)))
 maxerr=max(float(e.max()) for e in errors);meanerr=max(float(e.mean()) for e in errors)
 assert meanerr<.12,(maxerr,meanerr)
 W=840+(cols-1)*740;H=1188+(rows-1)*1088
 original=np.zeros((H,W,3),np.uint8)
 for i,a in enumerate(pages):
  x=i%cols*740;y=i//cols*1088;original[y:y+1188,x:x+840]=a
 # O recuo de 12 mm protege a arte original de até 10 mm de recorte físico.
 marginCases=[]
 for mm in [3,5,8,10]:
  m=mm*4;assembled=np.full((H,W,3),255,np.uint8);covered=np.zeros((H,W),bool)
  for i,a in enumerate(pages):
   x=i%cols*740;y=i//cols*1088
   # Remove borda branca esquerda/superior da folha de cima. Deixa as outras por baixo.
   paper=np.full_like(a,255);paper[m:-m,m:-m]=a[m:-m,m:-m]
   assembled[y+m:y+1188,x+m:x+840]=paper[m:,m:]
   covered[y+m:y+1188-m,x+m:x+840-m]=True
  safe=covered[48:H-48,48:W-48];assert safe.all(),f'Lacuna física com margem {mm}'
  assert not np.any(np.all(assembled[48:H-48,48:W-48]>245,axis=2)),f'Emenda branca com margem {mm}'
  e=np.abs(assembled[48:H-48,48:W-48].astype(float)-original[48:H-48,48:W-48].astype(float))
  assert e.mean()<.1,e.mean()
  marginCases.append({'margem_mm':mm,'erro_medio':float(e.mean())})
  if cols==2 and mm==8:Image.fromarray(assembled).save(root/'simulado-margem-8mm.png')
 # Intervalos físicos após ajuste automático comum: toda a área original protegida
 # continua coberta. O tamanho é reduzido, a correspondência dos pixels é preservada.
 for scale in [.9,.94,.97,1]:
  for mm in [3,5,8,10]:
   for count,side,step in [(cols,210,185),(rows,297,272)]:
    pad=(1-scale)*side/2
    start=max(pad,mm);end=min(pad+scale*side,side-mm)
    assert start<=scale*12+pad+1e-8
    assert end>=scale*(side-12)+pad-1e-8
    assert all(i*step*scale+end>=(i+1)*step*scale+start for i in range(count-1)),(scale,mm,side)
 Image.fromarray(pages[0]).save(root/f'pdf-{cols}-primeira-folha.png')
 results.append({'grade':[cols,rows],'paginas':len(pdf),'A4':True,'branco_adicionado':False,'erro_medio_maximo_sobreposicoes':meanerr,'erro_maximo_pixel':maxerr,'simulacoes_margens':marginCases,'escalas':[.9,.94,.97,1]})
(root/'resultado.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
