# Correção do molde A4 e comparação com a versão antiga

## Referência examinada

O HTML antigo `a4_split_poster_studio_melhorado-1.html` usa uma geometria global com escala única. Calcula `passo = dimensão da folha − sobreposição`, renderiza cada recorte num canvas de tamanho fixo A4 e coloca o canvas inteiro na página PDF. A opção padrão `cover` desse arquivo pode cortar a imagem para preencher o retângulo.

O PDF de referência enviado tem quatro páginas A4, com imagens de 2480 × 3508 px cobrindo a página inteira. A medição das regiões repetidas localizou 118 px em ambas as direções, aproximadamente 10 mm a 300 DPI. As fotos ajudam a observar a montagem; não permitem medir sozinhas a escala aplicada pelo driver ou a inclinação do papel com precisão.

## Problemas encontrados no Prisma atual

- O PNG exportava a célula útil, enquanto o PDF posicionava um raster de cobertura com até um pixel extra em cada borda e o recortava vetorialmente. Isso criava arquivos com moldes distintos conforme o caminho de exportação.
- Guias e abas do PDF eram desenhadas depois do raster; a montagem visual e os PNGs tinham outros caminhos de composição.
- A exportação do PDF continuava lendo geometria e opções globais após operações assíncronas. Uma mudança de documento ou controles durante o processamento podia misturar estados entre folhas.
- O prompt arredondava a proporção em uma razão curta e não explicava que borda/colagem são calculadas pelo editor.

## Alteração incremental

O novo `posterSheetPlan` fixa antes da renderização: recorte global, recorte da imagem original, posição dentro do molde, área de colagem, dimensões físicas e dimensões de pixels. Regiões sem arte são representadas explicitamente como vazias. O planejador rejeita arte/abas fora da folha.

`createPosterSheetRenderer` captura geometria e opções uma vez e produz uma folha completa. A4 a 300 DPI = **2480 × 3508 px**, colocada no PDF exatamente em **210 × 297 mm**, com origem **0,0**. Margens, guias, abas e compensação manual são desenhadas dentro desse canvas. PDF, PNG do ZIP e montagem folha a folha usam esse mesmo resultado. A quantidade de folhas e os recortes não mudam se os controles forem alterados durante a exportação.

A arte continua usando um raster global de escala única. Não é feito um ajuste independente de cada pedaço para preencher a folha. O arredondamento necessário para produzir pixels inteiros não altera a caixa física da página PDF. Em 300 DPI, um pixel mede aproximadamente 0,085 mm.

A tela informa a soma das folhas lado a lado antes da sobreposição e a medida líquida da arte depois das reservas. O prompt usa a razão inteira dos pixels ideais, informa que as reservas já foram descontadas, pede uma imagem contínua sem abas desenhadas e sugere evitar olhos/textos nas faixas de emenda. Isso ajuda a composição; não substitui o cálculo do editor nem garante que uma IA gere a proporção pedida.

## Arquivos

- `js/poster/poster-page.js`: planejador e compositor compartilhado da folha física.
- `js/poster/poster.js`: PDF e PNG usando o mesmo molde, opções fixadas no início, dimensões líquidas e prompt revisado.
- `js/poster/poster-assembly.js`: montagem das folhas completas produzidas pelo mesmo compositor.
- `index.html`: atualização das versões dos três scripts alterados para evitar cache antigo.
- `testes/poster-sheet.cjs`: validação pura de 192 moldes, com margens, abas e orientações diferentes.
- `testes/poster-molde.html`: integração com o motor real, arquivo local opcional e alteração dos controles durante a exportação.
- `testes/run.cjs`: inclui o novo teste puro na execução geral.
- `docs/molde-a4.md`: este relatório.

Os arquivos enviados pelo usuário permanecem intactos. Fotos e arte de referência não são adicionadas ao repositório público. Nenhuma biblioteca nova é necessária para o aplicativo.

## Mudanças de comportamento

Os PNGs do módulo de pôster agora representam a folha completa, incluindo suas margens e guias configuradas, em vez de somente a área útil. O PDF incorpora essa mesma folha em vez de posicionar um raster maior e recortá-lo depois. O motor de recorte bruto `renderTile` continua disponível por compatibilidade. As opções de tamanho, margens, borda, montagem, orientação, DPI e qualidade permanecem disponíveis. Nenhum modo de montagem novo foi acrescentado nesta correção.

A borda física da impressora e uma eventual alteração de escala pelo aplicativo do celular continuam externas ao arquivo. Todas as folhas precisam sair com a mesma opção de impressão e os lados brancos da folha superior precisam ser aparados na montagem. Não há promessa de validação física em uma impressora específica.


## Testes executados nesta correção

- `node testes/poster-sheet.cjs`: 192 moldes, incluindo margens fracionárias, três estilos de montagem, retrato/paisagem e até 30 colunas. Arte, clip e abas dentro da caixa física; dimensões A4 em 300 DPI conferidas.
- `node testes/poster-phone.cjs`: 150 geometrias e combinações de margem/escala existentes continuam passando.
- `node --check`: todos os módulos de pôster com sintaxe válida.
- `testes/poster-molde.html`, em editor de 390 px de largura, com arte recuperada do PDF enviado: 2 × 2 a 300 DPI sem guias brancas e 3 × 4 a 72 DPI com margens, abas, marcas e identificação. Ambos concluídos. O teste alterou colunas, linhas, margem, sobreposição e DPI enquanto o PDF estava sendo gerado; o renderizador capturado manteve exatamente os mesmos pixels e as mesmas dimensões.
- A inspeção de impressão é digital. Não foi feita uma impressão física no aparelho do usuário.

- Inspeção independente com PyMuPDF do PDF novo de 12 folhas: **12 páginas de 210 × 297 mm**, uma imagem completa de 595 × 842 px por página (72 DPI neste caso), todas com origem 0,0 e caixa idêntica à página. Todas as páginas foram renderizadas e revisadas visualmente; margens, abas e marcas ficaram dentro do papel. A conferência de 300 DPI foi feita no compositor real com saída de 2480 × 3508 px e no PDF de quatro folhas gerado pelo editor; a inspeção independente acima usa o arquivo de 72 DPI.
