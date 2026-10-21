# Design, celular e montagem A4 — 21/10/2026

## Resultado

O catálogo deixa de repetir a mesma estrutura com cores diferentes: são 12 composições autorais, com miniaturas geradas pelo mesmo motor da página. Os IDs de modelos anteriores continuam válidos. Arquivos `.prismadesign` existentes abrem com os seus objetos originais; a aparência só muda ao escolher um novo modelo.

No celular, a imagem ocupa o centro e as funções ficam em painéis inferiores que podem ser fechados. Editor, Design e Pôster preservam os controles existentes e seus IDs. A barra de ferramentas do editor continua rolável e os menus continuam acessíveis. A tela é dimensionada com `100dvh` e áreas seguras; o meta viewport permite que o teclado redimensione a área no Chrome compatível.

## Design: comportamento dos controles

- Modelos: busca por nome/categoria, filtro de estilos, prévias reais proporcionais ao formato escolhido e resposta de catálogo vazio.
- Biblioteca separada em Modelos, Elementos e Texto; presets de título, subtítulo e corpo com hierarquias diferentes.
- Inspetor contextual: texto mostra tipografia; foto mostra recorte e efeitos; formas mostram preenchimento/contorno. Controles incompatíveis ficam ocultos ou desabilitados.
- Texto: conteúdo, três famílias locais, fontes legadas, tamanho, negrito, itálico, sublinhado, entrelinha, espaço entre letras e alinhamento. A digitação não é sobrescrita pelo sincronismo do painel.
- Fotos: recortes centrados 1:1 / 4:5 / 16:9, restauração da foto inteira, original / preto e branco / sépia / iluminação. O original incorporado fica preservado no arquivo, junto com os parâmetros do recorte e efeitos.
- Objetos: posição X/Y, dimensões proporcionais, rotação, opacidade, sombra, espelhamento, alinhamento aos limites da página, distribuição de três ou mais objetos e encaixe ao mover com guias opcionais.
- Seleção múltipla por nomes também funciona por toque. Agrupamento, bloqueio e histórico existentes são preservados; a seleção múltipla já não é perdida quando o estado é serializado.
- Zoom por botões e Ajustar à tela; PNG/PDF em resolução de documento independentemente do zoom; SVG da página atual.

As fontes DM Sans, Cormorant Garamond e Bebas Neue (pacotes Fontsource 5.3.0, OFL 1.1) foram copiadas para `vendor/fonts/`, com licenças completas em `licencas/`. O app aguarda o carregamento dessas fontes antes de gerar modelos e miniaturas. Não há CDN, consulta a Google Fonts ou dependência de rede durante o uso local.

O SVG referencia nomes de fontes; para editá-lo em outro programa com aparência idêntica é necessário ter as fontes correspondentes. O PDF e PNG preservam a aparência rasterizada. Não foi adicionado importador SVG nem alteração ao formato PSD.

## Editor de imagens

- Alinhamento de camada considera o retângulo dos pixels com alfa, incluindo a máscara habilitada, em vez do tamanho de um canvas transparente grande. Guarda só metadados de posição no histórico.
- Remoção de fundo uniforme cria uma máscara editável. Pode escolher a cor pelos cantos ou informar a cor manualmente; tolerância e suavização são configuráveis. Só remove regiões conectadas às bordas, preservando ilhas fechadas da mesma cor.
- Respeita seleção e máscara anterior habilitada; original permanece intacto. Desfazer/refazer cobre a operação inteira. Operação de pixels roda no worker e tem caminho de fallback idêntico. Aceita imagens de até 40 MP para limitar a alocação da fila.
- Espelhamento da camada, já presente no motor, passa a ter acesso direto no painel, junto ao alinhamento e recorte. Também há acesso pelo menu Camada.

O recorte por cor é um algoritmo clássico para produtos/logotipos/fundos uniformes, não segmentação de pessoas por IA. A qualidade depende do contraste entre objeto e fundo.

## Pôster: área de imagem e abas separadas

O padrão agora é **A4 seguro: imagem inteira + abas**. Preserva a proporção, reserva pelo menos 5 mm da folha para a impressora e produz abas brancas de 10 mm à direita/embaixo das folhas internas. A imagem da próxima folha começa precisamente onde termina a parte visível da anterior. O PDF recorta a imagem ao núcleo visível antes de desenhar a aba; as guias nunca ocupam esse núcleo.

A regra continua em milímetros: célula imprimível = A4 menos duas margens; passo = célula menos aba. O núcleo da folha é o passo quando há vizinha à direita/embaixo; a última coluna/linha pode aproveitar o restante da célula. A arte é calculada uma vez na grade global e distribuída sem esticar cada recorte. A montagem real usa o mesmo núcleo do PDF.

Em A4 retrato com 5 mm de margem e 10 mm de aba, 2 × 2 folhas cobrem no máximo **390 × 564 mm**. A imagem inteira pode ter uma das dimensões menor para manter sua proporção. O tamanho da arte montada aparece nas estatísticas e nas instruções antes de exportar. A imagem não é forçada a 420 × 594 mm nem a 410 × 584 mm.

Ao atualizar uma configuração antiga de pôster, o modo seguro, imagem inteira e abas brancas são selecionados uma vez. A opção avançada de imagem repetida continua disponível; a reserva mínima pode ser desativada para equipamentos sem bordas. Novas escolhas são lembradas em `localStorage` com versão de montagem 2. A área já exportada em PDFs antigos não é alterada automaticamente: reexporte pelo site atualizado.

Para montar: a página de mapa não entra na arte. Corte a margem branca esquerda/superior das folhas internas até o começo da imagem. Deixe as abas direita/inferior da folha anterior por baixo e alinhe a borda da próxima folha ao começo da aba. Apare as sobras externas ao final. Use 100%/Tamanho real, sem ajustar ou ampliar automaticamente. Se a impressora exige margem maior que 5 mm, configure esse valor antes de exportar. Os PNGs do ZIP seguem sendo dados de imagem sem guias; para imprimir as abas com posicionamento físico use o PDF.

## Pesquisa pública e licenças

Foram consultados os projetos [tavo379/design-editor](https://github.com/tavo379/design-editor), [Josnif/canva-editor](https://github.com/Josnif/canva-editor), a biblioteca [Fabric.js](https://github.com/fabricjs/fabric.js) e a documentação dos pacotes Fontsource. Os dois primeiros descrevem editores semelhantes ao Canva com Fabric/React. Essa descrição não comprova engenharia reversa do aplicativo original. O código novo usa a biblioteca Fabric.js já incorporada e implementações próprias; não foi copiado código dos clones, ativos proprietários ou SDKs comerciais com exigência de chave.

Referências das fontes: [DM Sans](https://fontsource.org/fonts/dm-sans/about), [Cormorant Garamond](https://fontsource.org/fonts/cormorant-garamond/about), [Bebas Neue](https://fontsource.org/fonts/bebas-neue/about).

## Arquivos criados

| Arquivo | Responsabilidade |
| --- | --- |
| `js/design/template-scenes.js` | Composições distintas, compartilhadas com miniaturas. |
| `js/design/design-controls.js` | Controles contextuais, fotos, seleção, guias e painéis móveis de Design. |
| `css/studio-upgrade.css` | Catálogo visual, estados dos controles e layout móvel dos três módulos. |
| `css/design-fonts.css`, `vendor/fonts/*.woff2`, `licencas/*-OFL.txt` | Fontes locais e suas licenças. |
| `js/ui/mobile.js` | Painéis móveis do Editor e Pôster usando os controles originais. |
| `js/editor/productivity.js` | Alinhamento, diálogo de recorte por cor e ações diretas nas camadas. |
| `testes/studio-upgrade.cjs` | Regressão de modelos, texto, foto, SVG, máscara, worker e interação móvel. |
| `testes/poster-safe.cjs` | Simulação de impressão A4, recorte de margens e montagem de abas. |
| `ATUALIZACAO-DESIGN-MOBILE.md` | Inventário e decisões desta entrega. |

## Arquivos alterados

| Arquivo | Motivo |
| --- | --- |
| `index.html` | Nova organização e controles, viewport móvel, scripts e CSS locais. |
| `js/design/templates.js` | Metadados dos 12 modelos e novas categorias. |
| `js/design/design.js` | Integração com cenas, miniaturas/fontes, sincronismo e seleção múltipla. |
| `js/app.js` | Aguarda a preparação do Design antes de concluir a troca de área. |
| `js/core/imgproc-extra.js`, `imgproc.js`, `utils.js` | Algoritmos de máscara/limites alfa e roteamento worker/fallback. |
| `js/editor/commands.js` | Acesso às ações de produtividade pelo menu Camada. |
| `js/poster/poster.js` | Padrão seguro, migração de configurações, núcleo de arte e instruções. |
| `js/poster/poster-geometry.js` | Reserva mínima de margem quando o modo seguro é solicitado. |
| `js/poster/poster-marks.js`, `poster-assembly.js` | Abas opacas fora do núcleo e composição coerente com o PDF. |
| `testes/poster-marks.cjs` | Declara explicitamente o cenário avançado de margem zero. |
| `testes/run.cjs`, `testes/README.md` | Execução e documentação dos novos testes. |
| `README.md`, `LEIA-ME.md`, `DESIGN-E-GITHUB.md`, `POSTER-ENCAIXE.md`, `VALIDACAO.md` | Recursos, uso, mudanças de padrão e validação. |

## Verificação

- 12 miniaturas distintas e 60 combinações de modelo/formato sem caixas de texto fora da página.
- Edição contínua de tamanho da fonte, texto, entrelinha, espaçamento, sublinhado e sombra; bloqueio desabilita os controles.
- Distribuição de objetos com distâncias iguais; recorte e efeito de foto sobrevivem ao `.prismadesign`; exportação SVG real.
- Máscara de fundo reversível, preservação de uma ilha branca fechada e da imagem original, alinhamento sem pixels no histórico e igualdade entre worker e fallback.
- Telas 320 × 740, 390 × 844, 768 × 1024 e 740 × 390: painéis funcionais, sem transbordamento horizontal. Seleção e arraste por eventos de toque reais no Chromium.
- Pôster A4 seguro: 219.960 pixels idênticos após simular margem não imprimível, recorte e colagem. Imagem retrato 1:2 conservada em 282 × 564 mm dentro da grade 390 × 564 mm.
- PDF renderizado em retrato e paisagem convertida para retrato; abas e texto fora do núcleo, página A4 exata. Testes de emendas anteriores e regressão do editor também foram executados.

Não houve impressão física nesta etapa. A simulação confere a geometria e os recortes do arquivo; configuração do driver, margem real do equipamento e corte/colagem continuam precisando corresponder ao PDF.
