# Pôster sem moldura extra — 21/10/2026

## O que mudou

A margem passou a representar a área que a impressora não imprime, sem ser uma segunda moldura branca desenhada sobre a arte. O novo padrão envia sangria de imagem nessa região, preserva o núcleo visível e mantém as abas de cola brancas à direita/embaixo. A sangria repete somente os pixels externos; não amplia a imagem nem inventa detalhes. Ela fica fora do tamanho final e é descartada no acabamento.

O modo sem bordas aceita 0 mm e não impõe mais o mínimo de 5 mm. Só use 0 quando a impressora realmente imprime até a borda. Em impressora comum, informe a área não imprimível real; se os quatro lados forem diferentes, use o maior valor. A compensação geométrica já desconta essa área: o driver não deve reduzir, preencher, ampliar ou reenquadrar as folhas.

As abas continuam usando a mesma imagem global e o mesmo passo físico: célula = papel − 2 × margem; passo = célula − aba. A vizinha começa exatamente onde termina o núcleo visível da anterior. O cálculo permanece fracionário em milímetros, incluindo a origem dos pixels no PDF.

## Como evitar uma emenda inclinada

Corte a distância indicada **a partir da borda do papel**, não simplesmente a largura da faixa branca que saiu da impressora. Um exemplo: para margem calculada de 5 mm, corte 5 mm da esquerda das folhas que têm vizinha à esquerda e 5 mm do topo das que têm vizinha acima. A faixa branca do equipamento pode ser menor ou assimétrica; ela não redefine a origem da arte.

Alinhe o topo e a base da borda cortada à linha pontilhada da aba; só depois cole. Não sobreponha mais imagem além dessa linha. As abas e suas legendas ficam por baixo da próxima folha. Apare as sobras externas fora do contorno final, especialmente ao manter uma imagem cuja proporção difere da grade de folhas.

Antes de imprimir um pôster inteiro, use a folha de calibração 100 × 100 mm e meça os dois eixos. Imprima todas as páginas em 100%/Tamanho real, sem Ajustar à página, Preencher ou expansão automática de impressão sem bordas. Se a escala variar entre páginas ou o papel entrar inclinado, o arquivo não consegue corrigir essa variação física por conta própria.

## Arquivos

| Arquivo | Alteração e motivo |
| --- | --- |
| `js/poster/poster-page.js` (novo) | Recorte físico da arte e desenho da sangria compartilhados pelas prévias e raster. |
| `js/poster/poster-raster.js` | Desenha a extensão de borda na mesma grade global, preservando fase e nitidez entre folhas. |
| `js/poster/poster.js` | Exporta a área física completa, elimina o mínimo forçado, migra o padrão para sem moldura e mostra distâncias de corte. Corrige as miniaturas para o mesmo modo de abas do PDF. |
| `js/poster/poster-geometry.js` | Usa a margem informada sem impor 5 mm, mantendo cálculo exato e zero permitido. |
| `js/poster/poster-marks.js` | Legendas reforçam alinhamento das duas pontas na linha. |
| `js/poster/poster-assembly.js` | Invalida a montagem ao mudar margem/sangria/abas e informa a distância física de corte. |
| `index.html` | Controles de compensação/sangria, ajuda de impressão e carregamento do módulo novo; IDs existentes preservados. |
| `testes/poster-bleed.cjs` (novo) | Três combinações de margem/orientação, PDFs reais e montagem sem moldura extra. |
| `testes/poster-safe.cjs` | Explicita os 5 mm do cenário de impressora comum, pois zero agora é respeitado. |
| `testes/run.cjs`, `testes/README.md` | Incluem e documentam a nova regressão. |
| `POSTER-SANGRIA.md`, `POSTER-ENCAIXE.md`, `README.md`, `VALIDACAO.md` | Documentam o novo padrão e os resultados. |

## Testes

- Abertura por `file://` e exportação de três PDFs com quatro A4: retrato/5 mm, paisagem girada para páginas retrato/0 mm e retrato/3,5 mm. Sem erros de página.
- A sangria não ocupa as abas; uma amostra a 2 mm da borda confirma imagem no arquivo, em vez de moldura branca adicional. A mesma arte é recomposta após recorte das páginas.
- Os PDFs reais de retrato/5 mm e paisagem/0 mm foram renderizados por PyMuPDF e montados. As diagonais atravessam as emendas sem salto de posição. Diferença absoluta média para a referência Canvas de 1,78/255 e 1,95/255 (reamostragem/antialiasing entre renderizadores).
- Regressões `poster-safe`, `poster-marks` e `poster`: passaram; 219.960 pixels na simulação A4, 239.440 na sobreposição sem margem e 1.964.550 amostras entre pares de folhas, com erro numérico físico máximo de 7,11 × 10⁻¹⁵ mm.
- Inspeção visual da página A4 e da montagem renderizada. Não houve impressão física ou medição da impressora do usuário.

A mudança afeta novas exportações. PDFs já baixados permanecem iguais. O PDF é o formato indicado para imprimir com abas, guias e posicionamento físico; os PNGs do ZIP permanecem rasters limpos para processamento externo.


## Revisão: proteção da emenda

[POSTER-EMENDA.md](POSTER-EMENDA.md) documenta a faixa de imagem repetida e o recuo da tinta branca/pontilhado. Esta revisão substitui a instrução anterior de alinhar a borda à linha pontilhada: faça a imagem coincidir e cubra a linha completamente.
