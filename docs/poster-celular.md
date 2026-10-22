# Pôster para imprimir pelo celular — correção de montagem

O modo anterior substituía quase toda a região repetida por uma aba branca e mantinha apenas 1 mm de imagem junto à emenda. O novo padrão usa 25 mm da mesma imagem em ambas as folhas, sem pintar branco, linhas ou códigos na arte. Os modos avançados anteriores continuam disponíveis.

## Uso

1. Abra a imagem e entre em Pôster.
2. Toque em **A4 para celular: sem abas brancas**. Escolha a quantidade de colunas e linhas; não precisa ser 2 × 2.
3. Gere um **novo PDF**. PDFs exportados anteriormente não recebem a correção.
4. Imprima todas as páginas juntas pelo mesmo aplicativo, no mesmo papel e com a mesma opção. Não é necessário escolher uma medida de compensação no site.
5. Na folha que entra por cima, apare a borda branca esquerda se houver folha à esquerda e a superior se houver folha acima, até começar a imagem.
6. Deslize por cima da folha anterior e faça os detalhes da imagem coincidirem nas duas pontas da emenda. Não alinhe pela borda do papel, nem use uma distância fixa depois da impressão. Só então cole.
7. Apare o contorno externo seguindo a arte final da prévia. O preenchimento estendido fora desse contorno é sangria, não parte nova da ilustração.

A borda física que a impressora deixa **não pode ser eliminada por um site**. Para a montagem não exibi-la, é preciso recortar os lados da folha superior. Ajustes automáticos iguais nas páginas mantêm a correspondência da arte e podem reduzir o tamanho final. Escalas diferentes entre páginas, rotação, alimentação torta, margens maiores que a área repetida e ajustes de preenchimento/corte não uniformes não podem ser corrigidos automaticamente sem conhecer a impressão real.

## Cálculo

A4 retrato: 210 × 297 mm, passo de 185 × 272 mm, repetição de 25 mm. A área nominal da grade é 210 + (colunas − 1) × 185 por 297 + (linhas − 1) × 272 mm. A imagem inteira é encaixada uniformemente, com proteção de pelo menos 12 mm no contorno externo. A proteção é preenchida pela extensão dos pixels da borda, sem branco nem alteração da escala por folha. A arte final fica menor que a área das folhas; o site informa essa medida.

Todos os recortes saem de um raster global com a mesma origem, escala e fase dos pixels. A sobreposição não é produzida ampliando cada folha separadamente. Nenhuma biblioteca ou dependência foi acrescentada.

## Arquivos alterados e criados

- `index.html`: opção para celular, instruções corretas e versões dos scripts para atualizar o cache.
- `js/poster/poster.js`: padrão e migração das preferências antigas, preset A4, instruções e chave do cache incluindo o tipo de montagem.
- `js/poster/poster-geometry.js`: proteção externa da arte original com escala uniforme.
- `js/poster/poster-page.js`: extensão da borda em toda a sobra da folha, sem pintar branco nem recortar a arte final.
- `js/poster/poster-raster.js`: aplica o mesmo preenchimento ao raster usado no PDF e nas folhas.
- `js/poster/poster-marks.js`: modo de imagem sem fundo, texto ou pontilhado sobre os pixels repetidos.
- `js/poster/poster-assembly.js`: instruções da montagem visual compatíveis com as bordas físicas da impressão.
- `testes/poster-phone.cjs`: teste puro das geometrias, margens e escalas, incluindo grades de até 30 × 30.
- `testes/poster-celular.html`: teste de integração executável no próprio navegador, com exportação dos PDFs reais de 4 e 12 folhas.
- `testes/poster-phone-pdf.py`: inspeção independente do PDF renderizado e simulação de recorte/montagem.
- `testes/run.cjs`: inclui o novo teste puro na execução geral.
- `docs/poster-celular.md`: este relatório de mudanças, testes e limites.

## Validação

- `node testes/poster-phone.cjs`: 150 geometrias com 16 combinações de margem/escala por geometria; proporção e imagem inteira preservadas; comportamento geométrico do modo avançado mantido.
- `testes/poster-celular.html`, no navegador com editor de 390 px de largura: 2 × 2 retrato, 3 × 4 retrato e 4 × 3 paisagem; 4/12/12 folhas; pixels da imagem preservados; nenhuma faixa branca adicionada na imagem sintética de teste.
- PDFs reais exportados em 101,6 DPI: 4 e 12 páginas A4. Renderização independente com PyMuPDF: nenhum pixel branco acrescentado, sobreposições com erro de **zero pixels** e zero diferença de canais.
- Simulação dos PDFs com margens físicas de 3, 5, 8 e 10 mm, retirando a borda esquerda/superior da folha sobreposta: nenhuma lacuna ou emenda branca na região protegida, erro médio zero em relação à montagem sem margens.
- Verificação geométrica de ajustes comuns de 90%, 94%, 97% e 100% com as mesmas margens: cobertura contínua e arte original protegida. Não é teste físico em impressora nem simulação de drivers que alteram a escala de uma folha para outra.
- Sintaxe de todos os módulos de pôster conferida com `node --check`.

Para repetir a inspeção independente, salve os dois PDFs oferecidos pelo teste HTML numa pasta e execute `python testes/poster-phone-pdf.py CAMINHO_DA_PASTA` com PyMuPDF, NumPy e Pillow instalados. As dependências pertencem somente à validação, não ao aplicativo.

## Comportamentos que mudaram

O padrão antigo de abas brancas passa para imagem repetida, inclusive para preferências salvas em versões antigas. A sobreposição padrão aumenta de 10 para 25 mm. A proteção externa reduz um pouco a medida da arte final; ela não é esticada ou cortada. A página de instruções e as marcas impressas ficam desativadas inicialmente; as instruções e códigos continuam disponíveis no site. A montagem exibida mostra o arquivo nominal, não promete prever margens e escala do driver do celular. O modo avançado de abas brancas permanece selecionável.
