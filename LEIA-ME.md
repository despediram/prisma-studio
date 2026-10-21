# Prisma Studio

Editor de imagens completo e montador de pôsteres em várias folhas, que roda inteiro no navegador. Nenhuma imagem sai do seu computador.

## Como abrir

- **Mais simples:** dê dois cliques em `index.html`. Funciona offline — todas as bibliotecas estão na pasta `vendor/`.
- **Publicar na internet:** envie a pasta inteira para qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Hostinger…). Não precisa de servidor nem banco de dados.
- **Servidor local (opcional):** `iniciar-servidor.bat` (Windows) ou `./iniciar-servidor.sh` (macOS/Linux) e acesse `http://localhost:8080`.

## O que tem

### Editor (estilo Photoshop)
- **Barra de menus completa:** Arquivo, Editar, Imagem, Camada, Seleção, Filtro e Exibir, com os atalhos de teclado do Photoshop (Ctrl+J, Ctrl+T, Ctrl+L, Ctrl+U, Ctrl+M…).
- **Camadas:** criar, duplicar, excluir, reordenar arrastando, renomear, ocultar, opacidade e 16 modos de mesclagem (multiplicação, tela, sobrepor, luz suave, cor, luminosidade…). Mesclar abaixo, mesclar visíveis e achatar.
- **Máscaras de camada:** revelar tudo, a partir da seleção, pintar na máscara com pincel/borracha/degradê/balde, inverter, aplicar, desativar (Shift + clique).
- **Seleções:** retangular, elíptica, laço, laço poligonal e varinha mágica, com adicionar/subtrair/interseção, difusão, expandir, contrair, suavizar, borda, inverter e gama de cores. Pintura, filtros e ajustes respeitam a seleção.
- **Camadas de texto editáveis** (clique no texto para editar de novo), com fontes próprias, contorno, sombra, entrelinha e espaçamento.
- **Ferramentas:** mover (camada ou só a seleção), mão, zoom, recortar, perspectiva, transformação livre (escala, rotação, espelhar), pincel com pressão de caneta e estabilizador, borracha e borracha mágica, balde, degradê (linear, radial, angular, refletido), carimbo, corretor de manchas, olhos vermelhos, desfocar/nitidez/borrar, clarear/escurecer/esponja, liquefazer (empurrar, inflar, contrair, girar, restaurar), formas (retângulo arredondado, elipse, hexágono, estrela, linha, seta) e conta-gotas. Cores principal/secundária com X e D.
- **Ajustes (Imagem › Ajustes):** níveis, curvas, brilho/contraste, exposição, vibração, matiz/saturação com colorir, equilíbrio de cores, preto e branco com mistura por cor, filtro de foto, mixer de canais, mapa de degradê, cor seletiva, substituir cor, sombras/realces, limiar, posterizar, inverter, dessaturar, equalizar, tom/contraste/cor automáticos.
- **Ajustes ao vivo no painel:** exposição em luz linear, realces/sombras locais, claridade, remover névoa, curvas por canal, mistura HSL de 8 cores, 12 estilos prontos.
- **39 filtros com prévia ao vivo:** desfoque gaussiano, de caixa, de movimento, radial (zoom/giro), de superfície, miniatura (tilt-shift); máscara de nitidez e passa-alta; ruído, mediana, poeira e arranhões, granulação; mosaico, cristalizar, pontilhar, meio-tom P&B e CMYK; pintura a óleo, aquarela, desenho a lápis, desenho animado, duotone; arestas brilhantes, contornos, relevo, solarizar, aberração cromática, glitch, vinheta, documento escaneado; redemoinho, comprimir/inflar, esferizar, onda, ondulação, coordenadas polares, correção de lente e deslocamento para texturas contínuas.
- **Editar:** copiar, recortar, colar como camada (também da área de transferência do sistema), copiar mesclado, preencher (inclusive **preenchimento inteligente** que reconstrói a área a partir do entorno), contornar seleção, limpar.
- **Imagem:** tamanho da imagem (px, %, cm), tamanho da tela com âncora, girar/espelhar tela, cortar para a seleção, aparar bordas.
- **Arquivos:** novo documento com modelos (A4, A3, Instagram, Stories, Full HD, 4K…), abrir como camada, **abrir e exportar PSD com camadas**, salvar/abrir projeto `.prisma` sem perdas, exportar PNG/JPG/WEBP com DPI gravado.
- Histórico de comandos limitado por memória (900 MB de dados retidos), comparação antes/depois, grade, grade de pixels e informações do cursor (posição e cor).

### Melhorar qualidade
- **Super-resolução** (1,5× a 4×): amplia em etapas de 2× com controle anti-halo, filtro de choque nas bordas (Osher–Rudin) e realce de detalhes por filtro guiado. Também há o modo Lanczos-3 fiel.
- Redução de ruído, nitidez inteligente, remoção de artefatos de JPG e “Auto melhorar”.

> Observação honesta: tudo é feito com algoritmos clássicos que rodam no navegador, sem rede neural. O resultado fica bem mais nítido que um redimensionamento comum, mas detalhes que não existem na foto não são inventados.

### Pôster e impressão
- Papéis A5, A4, A3, Carta, Ofício, Legal, Tabloide, A2/A1/A0 de plotter, papéis fotográficos e personalizado.
- **Margem não imprimível** configurável: a arte fica dentro da área que a impressora consegue imprimir.
- Tamanho por número de folhas, por medida final ou por DPI; sugestão automática da orientação que gasta menos folhas; borda branca (moldura).
- **Nitidez consistente:** a arte é rasterizada em uma grade global, em blocos com halo e cache limitado. As faixas repetidas usam os mesmos pixels, mesmo com nitidez e clareamento ligados.
- **Lupa de impressão** com comparação antes/depois de um trecho em tamanho de impressão.
- **Clarear para impressão** (compensa jato de tinta que imprime escuro) e **calibração da escala da impressora** a partir da régua de 10 cm.
- PDF com página de instruções, mapa de montagem, marcas de corte vetoriais e códigos/linhas de alinhamento escondidos na faixa de cola; botão para abrir o PDF direto para imprimir; ZIP com folhas PNG.
- Texto pronto para pedir a uma IA de imagens uma arte na proporção certa.

## Design e convites

A aba **Design** oferece 12 modelos autorais, texto e formas editáveis, fotos, múltiplas páginas e exportação PNG/PDF. Veja o [README](README.md) e [as mudanças desta etapa](DESIGN-E-GITHUB.md).

## Atalhos
Pressione `?` (ícone de teclado no topo) dentro do app para ver todos.

## Estrutura
```
index.html
css/app.css
js/core/imgproc.js      motor de processamento (roda em Web Worker)
js/core/imgproc-extra.js ajustes, filtros e super-resolução
js/core/utils.js        utilidades, worker, metadados de DPI
js/editor/              camadas, vista, ferramentas, menus, filtros, PSD
js/poster/              geometria em milímetros e exportação
vendor/                 pdf-lib, JSZip, Font Awesome (código aberto)
licencas/               licenças das bibliotecas
```

## Código aberto usado
- [pdf-lib](https://github.com/Hopding/pdf-lib) — MIT
- [JSZip](https://github.com/Stuk/jszip) — MIT/GPLv3
- [Font Awesome Free](https://github.com/FortAwesome/Font-Awesome) — ícones CC BY 4.0, fontes SIL OFL 1.1

Algoritmos implementados do zero com base em técnicas publicadas: filtro guiado (He et al.), dark channel prior para névoa, Lanczos-3, filtro de choque de Osher–Rudin, Kuwahara, mediana de Huang, pull-push para preenchimento, splines monotônicas de Fritsch–Carlson e o formato PSD a partir da especificação pública da Adobe.


## Atualização incremental do editor

- O histórico usa comandos com `do()`/`undo()` e retângulos antes/depois em blocos de até 256 × 256 px. Nome, opacidade, ordem, visibilidade e mesclagem não guardam pixels.
- As ferramentas estão em `js/editor/tools/`. O painel usa os esquemas declarativos de cada módulo e o renderizador único `js/ui/tool-options.js`.
- Pincel e borracha têm **Espaçamento** e **Fluxo**. O fluxo acumula tinta por carimbo; a opacidade limita o traço inteiro. Um traço continua sendo um passo.
- A prévia de exposição, contraste, temperatura, saturação e curvas pode usar WebGL. Ela continua reduzida a até 1600 px no maior lado; o resultado aplicado/exportado usa o motor original em resolução total. Sem suporte ou em caso de falha, o worker assume automaticamente.
- Use o botão no topo da barra esquerda para destacar/encaixar. Arraste pela alça. O navegador lembra modo e posição quando permite armazenamento local.

Abra `index.html` normalmente. Não há build nem novas dependências de execução. Consulte `VALIDACAO.md` para os arquivos alterados, resultados e limites dos testes. Os testes automatizados opcionais estão em `testes/`.


## Encaixe preciso dos pôsteres

Na aba Pôster, use **Folhas sobrepostas** para conferir as folhas de impressão montadas em ordem. Espere a preparação terminar, avance/recuar uma folha por vez e use o zoom de conferência (até 500%) para olhar as emendas. Esse zoom não altera o tamanho nem o recorte da arte.

O PDF agora preserva uma única escala em milímetros e a fase dos pixels entre páginas. **PNG sem perdas** é o padrão recomendado; códigos, registros e marcas ficam nas margens, sem texto sobre a arte. O pôster usa a composição das camadas, inclusive quando uma máscara estiver selecionada no editor.

Antes de uma impressão grande, baixe a folha de teste de **100 × 100 mm** em **Calibrar a escala da impressora**, imprima em **100% / Tamanho real** e meça os dois eixos. Informe os valores reais, se necessário. A impressão não deve usar Ajustar à página nem ampliação automática sem bordas. Reserve margem suficiente para que as marcas também fiquem na área imprimível.

Leia `POSTER-ENCAIXE.md` para os cálculos, instruções de montagem, testes e mudanças.
