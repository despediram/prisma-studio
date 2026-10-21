# Pôster com encaixe preciso

Atualização incremental de 21/10/2026. Funciona offline abrindo `index.html`, inclusive via `file://`. Não foram adicionadas bibliotecas de execução.

## Como usar

1. Abra a imagem no editor e entre em **Pôster**. O montador usa a composição das camadas, máscaras, opacidades e ajustes, não apenas a camada selecionada.
2. Escolha papel, orientação, margem branca e sobreposição. Confira o tamanho final exibido. **Preencher** pode cortar as bordas externas da imagem; **Inteira** conserva a imagem inteira.
3. Abra **Folhas sobrepostas**. Aguarde a preparação na resolução de impressão. O controle **Montagem passo a passo** retira/coloca as folhas na ordem A1, A2… B1, B2… As folhas são efetivamente rasterizadas, não substituídas por uma imagem contínua ilustrativa.
4. Use o **Zoom de conferência** e arraste a montagem para conferir olhos, linhas e outros detalhes. Esse zoom não altera a escala nem o enquadramento de impressão. Desmarque **Mostrar emendas e códigos** para ver a arte sem guias. As guias coloridas da tela não são impressas sobre a arte.
5. Em **Calibrar a escala da impressora**, baixe o teste de **100 × 100 mm**. A folha de teste é A4, não recebe correções anteriores e permite medir os dois eixos. Imprima em **100% / Tamanho real**, meça entre 0 e 100 e informe as medidas reais nos campos horizontal e vertical.
6. Exporte o pôster em **PDF**, com **PNG sem perdas**. Imprima no papel escolhido, em **100% / Tamanho real**, sem Ajustar à página, Reduzir para caber ou ampliação automática sem bordas. Reserve uma margem branca maior que a área não imprimível da impressora (em geral, comece com 5 mm). Margem zero exige impressão sem bordas e sem ampliação automática; não serve para toda impressora.
7. Corte **somente a margem branca esquerda e/ou superior** das folhas que entram por cima das anteriores. Não corte a faixa de imagem repetida. Sobreponha a quantidade indicada, faça os desenhos coincidirem nos dois extremos da emenda e só então cole. Sem sobreposição, corte as margens dos lados que se encostam. Apare as sobras externas ao contorno final depois da montagem.

Uma emenda pode atravessar um olho, mas suas duas partes devem coincidir. O programa não desloca automaticamente as emendas para longe de rostos. Se quiser mudar o lugar das emendas, altere o enquadramento, a orientação ou a grade e confira novamente.

## O que foi corrigido

- **Fonte do pôster:** passa a usar a composição final das camadas, inclusive quando uma máscara estiver selecionada. Antes, sem ajustes pendentes, era usado `doc.base`, que podia conter apenas a camada ativa ou sua máscara.
- **Uma única grade de pixels:** toda folha usa a mesma origem e a mesma escala. A nitidez e o clareamento são aplicados em blocos globais compartilhados, com halo, em vez de ampliar um recorte independente para cada folha.
- **PDF sem reescala individual:** o arredondamento dos limites gera até um pixel extra de cobertura em cada borda. O PDF posiciona esse raster com sua escala física original e o recorta vetorialmente na área útil; não estica cada imagem para caber no retângulo da folha.
- **Faixas de cola visíveis:** a opção Faixas de cola e guias de sobreposição adiciona no PDF uma faixa clara, linha pontilhada e instrução com a folha vizinha. Elas ficam somente na imagem repetida à direita/embaixo e são totalmente cobertas na montagem. Funcionam também com margem branca zero. O raster original e os PNGs do ZIP continuam limpos; as guias do PDF são vetoriais. Códigos gerais e marcas de corte continuam na margem branca quando há espaço.
- **PNG sem perdas como padrão:** a primeira abertura desta atualização migra a compressão antiga para PNG; uma escolha posterior de JPG continua sendo respeitada. JPG pode introduzir diferenças de compressão na área repetida e não fornece a mesma garantia de igualdade dos pixels.
- **Precisão de medidas:** os campos de centímetros aceitam incrementos de 0,01 cm; trocas de modo não arredondam o tamanho final para milímetros inteiros. Pedidos que excedem 30 × 30 folhas são avisados e não são exportados silenciosamente com outro tamanho.
- **Montagem e escala da impressora:** nova vista com folhas sobrepostas e folha independente de calibração nos eixos horizontal/vertical.

A ampliação do montador agora usa interpolação de alta qualidade com nitidez local consistente na grade global. O processamento anterior de super-resolução por folha foi substituído nesse módulo para impedir diferenças de fase e processamento entre vizinhas. O motor original de super-resolução continua disponível para as outras funções do editor. Nitidez não recupera detalhes que não existem na imagem de origem.

## Cálculo físico

Tudo é calculado em milímetros, sem arredondar o passo entre folhas:

- Área útil: `largura do papel − 2 × margem` e `altura do papel − 2 × margem`.
- Passo: `área útil − sobreposição`.
- Cobertura de N folhas: `área útil + (N − 1) × passo`.
- Origem da folha: `(coluna × passo horizontal, linha × passo vertical)`.
- Escala do raster: `DPI / 25,4` pixels por mm; escala no PDF: `72 / DPI` pontos por pixel.

Exemplo: A4 em pé, margem de 5 mm e sobreposição de 10 mm resultam em área útil de **200 × 287 mm** e passo de **190 × 277 mm**. Uma grade **4 × 4** cobre exatamente **770 × 1118 mm**, isto é, **77 × 111,8 cm**.

O cache do raster é limitado a 64 MiB; os blocos têm 768 × 768 px, com halo de 24 px para o processamento local. Não é necessário criar um canvas com o pôster inteiro em resolução de impressão. A montagem prepara as folhas nessa resolução e conserva miniaturas de até 1100 px no maior lado para a navegação. Elas não substituem o raster completo no PDF. Cada região individual é limitada a 60 MP para evitar alocações excessivas em papéis muito grandes; o arquivo PDF e as imagens atuais também consomem memória.

No ZIP de folhas, `medidas_e_encaixes.json` registra origens, medidas e limites de pixels. Os PNGs podem ter cobertura fracionária extra; não se deve ajustá-los individualmente à página. O **PDF é o formato indicado para imprimir com as posições e recortes exatos**.

## Arquivos alterados e criados

| Arquivo | Motivo |
| --- | --- |
| `js/poster/poster.js` | Composição final como fonte, integração com raster global, posicionamento e clip no PDF, códigos nas margens, precisão dos campos, instruções e proteção de tamanho. |
| `js/poster/poster-geometry.js` | Correção da unidade mm/px, indicação de tamanho limitado, juntas de montagem e transformação física do raster para o PDF, inclusive girado. |
| `js/poster/poster-raster.js` — novo | Grade única, blocos com halo, nitidez/clareamento consistentes, cache limitado e cobertura fracionária sem esticar a imagem. |
| `js/poster/poster-assembly.js` — novo | Montagem das folhas geradas, progresso, ordem, zoom, pan, guias e cancelamento de revisões antigas. |
| `js/poster/poster-calibration.js` — novo | PDF independente A4 com quadrado/réguas de 100 mm em ambos os eixos. |
| `index.html` | Opção Folhas sobrepostas, controles de conferência, calibração e explicações de margem/PNG. IDs anteriores mantidos. |
| `css/app.css` | Layout dos controles de montagem e área de prévia. |
| `testes/poster.cjs` — novo | Comparação exata de emendas, medidas, PDFs e controles da montagem. |
| `testes/run.cjs`, `testes/README.md` | Integração do teste de pôster na suíte existente. |
| `LEIA-ME.md`, `VALIDACAO.md` e este documento | Uso, mudanças, resultados e limites da validação. |

## Validação

Em Chromium headless 153 no Linux, por `file://`:

- Comparação de pixels das faixas repetidas em 150, 200, 300 e 400 DPI, com margens/sobreposições fracionárias, nitidez desligada/suave/forte e clareamento.
- No total, **1.964.550 pixels foram comparados em 18 pares de emendas**, sem divergência. Teste adicional com folhas A4 completas em 300 DPI, com nitidez ligada. As regiões horizontais e verticais repetidas coincidem byte a byte.
- Desvio numérico de posicionamento dos pixels compartilhados abaixo de `1e-9 mm` no cálculo digital. Isso é precisão computacional, não uma promessa de tolerância mecânica da impressora.
- Medida de 770 × 1118 mm confirmada numa grade A4 de 4 × 4 com margem 5 mm/sobreposição 10 mm.
- PDF de mapa + 4 folhas aberto e inspecionado, com dimensões A4 corretas. Também conferida a opção Sempre retrato com folhas paisagem.
- Arquivos de QA foram renderizados por Poppler, com olhos e curvas cruzando emendas. Guia, folhas giradas, arte sem texto sobreposto e calibração foram conferidos visualmente.
- Escala efetiva das imagens embutidas verificada no PDF: a 150 DPI, **0,48 ponto por pixel** em ambos os eixos, com desvio de ponto flutuante inferior a `1e-6` ponto/pixel. Os quatro lados do quadrado de calibração medem 100 mm nos vetores do arquivo.
- Montagem com quatro folhas, controle de quantidade e zoom de inspeção independente do zoom de impressão.
- Regressão de abertura, camadas, máscaras, seleção, texto, 39 filtros, 15 ajustes, `.prisma`, PSD e PDF, sem erros JavaScript/console nem requisições de rede na execução offline.

Os testes automatizados estão em `testes/poster.cjs` e na suíte `testes/run.cjs`. Não foi realizada impressão física. A escala escolhida no driver, margens reais, alimentação do papel e recorte/colagem precisam corresponder às medidas do PDF; a folha de calibração e a montagem do site permitem conferir isso antes de produzir o pôster completo.

## Correção das faixas de cola — 21/10/2026

O PDF recebido tinha quatro folhas A4 preenchidas até as bordas, sem texto ou traços de montagem. A faixa de imagem repetida existia (119 pixels em 300 DPI incluindo a cobertura fracionária), mas o código anterior exigia margem branca para imprimir registros. A opção de guias agora desenha apenas dentro da faixa que a próxima folha efetivamente impressa cobre. Sem sobreposição, nenhuma faixa é inventada; vizinhas omitidas não recebem indicação.

Arquivos: `js/poster/poster-marks.js` (novo, geometria e desenho compartilhados), `js/poster/poster.js` (integração PDF/prévia e instruções), `js/poster/poster-assembly.js` (guias na montagem real), `index.html` (dependência e textos), `testes/poster-marks.cjs` (novo teste), `testes/run.cjs`/`testes/README.md` (execução/documentação), este documento e `VALIDACAO.md`.

O teste monta quatro folhas e compara 239.440 pixels da composição marcada com a composição limpa: nenhuma guia aparece no resultado. O teste de emendas anterior continua aprovado com 1.964.550 pixels comparados. PDFs revisados em retrato, paisagem convertida para retrato e com guias desligadas. O PDF recebido também foi corrigido sem redimensionar ou recomprimir as imagens; seus quatro fluxos de imagem têm hash idêntico ao original.

O exemplo 2 × 2 em A4 com sobreposição de 10 mm mede 410 × 584 mm com margem zero. Com 5 mm de margem, a mesma grade mede 390 × 564 mm. Para conservar 410 × 584 mm com essa margem, use o modo por tamanho (sem travar proporção se quiser os dois valores exatos); serão necessárias 3 × 3 folhas. O programa não altera essa escolha silenciosamente.

## Atualização do padrão A4 seguro

A entrega atual separa o núcleo visível da imagem e as abas brancas no PDF. O padrão agora conserva a imagem inteira e reserva pelo menos 5 mm para a impressora. As configurações antigas migram uma vez para esse padrão; a alternativa com imagem repetida continua disponível. Veja [a revisão de Design, celular e A4](ATUALIZACAO-DESIGN-MOBILE.md) para geometria, instruções e a simulação de impressão de quatro folhas.


Atualização de impressão sem moldura extra: [sangria, compensação e corte medido](POSTER-SANGRIA.md). Esta revisão substitui a reserva branca e o mínimo obrigatório de 5 mm descritos nas etapas anteriores.
