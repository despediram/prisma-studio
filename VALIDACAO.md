# Prisma Studio — implementação incremental e validação

Projeto original: `prisma-studio-v2.zip`. Validação realizada em 21/10/2026, em Chromium headless 153 no Linux, abrindo `index.html` por `file://`. Sem build e sem CDN. As etapas originais não adicionaram dependências de execução; o módulo Design posterior incorpora Fabric.js 6.9.0 localmente, sob MIT. Os arquivos enviados foram a base da implementação; o motor de pixels, PSD e projeto foram preservados. O montador recebeu posteriormente a atualização documentada em POSTER-ENCAIXE.md.

## 1. Histórico com comandos

**Alterado:** `js/editor/document.js` — comandos com `do()`/`undo()`, deltas de pixels e navegação reversível, mantendo `commit`, `undo`, `redo`, `goto`, `canUndo`, `canRedo` e os campos `label`/`icon` usados pelo painel.

- Comparação em blocos de 256 × 256 px; dentro de cada bloco fica apenas o menor retângulo que realmente mudou. Guarda `ImageData` antes/depois e restaura por `putImageData`, evitando acumular arredondamentos de alfa.
- Propriedades e ordem ficam em metadados, sem buffers de pixels. Criar/excluir camadas ou máscaras retém os pixels necessários para reconstruir o alvo. Transformações de documento guardam os dados necessários para ambos os tamanhos.
- O orçamento padrão é de 900.000.000 bytes dos buffers de comandos: pixels e metadados UTF-8 efetivamente retidos. Não há limite de passos. A evicção remove um prefixo contínuo e deixa uma âncora no estado mais antigo ainda acessível.
- `doc.historyBytes` informa esses dados retidos; `doc.historyLimit` permite ajustar o orçamento. `doc.historyWorkingBytes` informa a sombra de trabalho fixa usada para compatibilidade com o `commit()` posterior à mutação. A sombra contém uma cópia corrente por camada/máscara, não uma por passo: um canvas RGBA de 6000 × 4000 corresponde a 96 MB. Canvas atuais, imagem original de comparação, pirâmide de prévia, alocações nativas/GPU e overhead do JavaScript não são medição de heap e não entram no orçamento dos comandos.

**Testes:** edição de 20 × 20 px em 6000 × 4000 aumentou o histórico em **3.669 bytes**; todos os retângulos ficaram dentro de 256 × 256. Foram conferidos 100 desfazer e 100 refazer com hash exato dos pixels, máscara editada/excluída/restaurada, criar/excluir camada, nome sem pixels, `goto`, bifurcação após desfazer e evicção por memória.

**Mudança de comportamento:** removido o corte de 50 passos. O estado inicial pode deixar de ser acessível quando o orçamento é ultrapassado; o painel mostra a âncora “Estado anterior (limite de memória)”. A cadeia restante continua reversível.

## 2. Ferramentas separadas da UI

**Alterados:**

| Arquivo | Responsabilidade da mudança |
| --- | --- |
| `js/editor/tools.js` | Registro, ativação, roteamento de ponteiro/overlay, atalhos e integração com botões existentes. |
| `index.html` | Ordem explícita de scripts clássicos locais, compatível com `file://`. |

**Criados:**

| Arquivo | Responsabilidade |
| --- | --- |
| `js/editor/tools/context.js` | Contexto compartilhado e utilitários de coordenadas. |
| `js/editor/tools/paint.js` | Motor compartilhado de carimbos, correção e cursores, usado pelos módulos de pintura. |
| `js/editor/tools/hand.js` | Estado e contrato da ferramenta Mão; o pan continua no viewport original. |
| `js/editor/tools/zoom.js` | Zoom por ponteiro e opções. |
| `js/editor/tools/move.js` | Mover camada, texto e seleção flutuante. |
| `js/editor/tools/marquee.js` | Seleções retangular, elíptica, laço e poligonal. |
| `js/editor/tools/wand.js` | Varinha e gama de cores. |
| `js/editor/tools/crop.js` | Alças, proporções e aplicação do recorte. |
| `js/editor/tools/perspective.js` | Quadrilátero e correção de perspectiva. |
| `js/editor/tools/transform.js` | Escala, rotação, espelhamento e transformação livre. |
| `js/editor/tools/brush.js` | Estado, ponteiro, overlay e esquema do pincel. |
| `js/editor/tools/eraser.js` | Borracha normal e mágica. |
| `js/editor/tools/bucket.js` | Preenchimento por tolerância. |
| `js/editor/tools/gradient.js` | Prévia e aplicação de degradês. |
| `js/editor/tools/clone.js` | Origem e pintura do carimbo. |
| `js/editor/tools/heal.js` | Corretor e olhos vermelhos. |
| `js/editor/tools/retouch.js` | Desfocar, nitidez e borrar. |
| `js/editor/tools/tone.js` | Clarear, escurecer, saturar e dessaturar. |
| `js/editor/tools/liquify.js` | Deformação local. |
| `js/editor/tools/text.js` | Criação, edição e rasterização de texto. |
| `js/editor/tools/shape.js` | Desenho de formas. |
| `js/editor/tools/picker.js` | Amostragem de cores. |
| `js/ui/tool-options.js` | Único renderizador de esquemas: tipos, rótulos, limites, valores e callbacks. Usa DOM/textContent. |
| `js/ui/tool-fields.js` | Sincronização de medidas e carregamento de fontes locais. |

Cada módulo fornece `state`, `pointer`, `drawOverlay` e `options()`. Os IDs anteriores dos controles foram conservados. Nenhum módulo de ferramenta produz HTML. Funções compartilhadas continuam acessíveis por meio do contexto interno; `PS.tools` e `PS.tools.S` permanecem com o contrato público anterior.

**Testes antes da etapa 3:** mesmas entradas de ponteiro nas 20 ferramentas, comparando o ZIP original com a versão modular. Coincidiram IDs dos controles, hashes dos pixels compostos, dimensões e metadados das camadas. Nenhum erro JavaScript nos dois projetos.

**Mudança de comportamento:** nenhuma diferença funcional observada nessa comparação. Os tipos e agrupamentos de controles passam pelo renderizador único.

## 3. Pincel e borracha

**Criado:** `js/editor/tools/paint-tiles.js` — captura preguiçosa de blocos tocados, fluxo acumulado e composição local.

**Alterados:**

| Arquivo | Por quê |
| --- | --- |
| `js/editor/tools/paint.js` | Integra os blocos locais, distância residual do espaçamento, comando único e cancelamento por região. |
| `js/editor/tools/brush.js` | Estado e controles de Espaçamento e Fluxo. |
| `js/editor/tools/eraser.js` | Mesmo contrato de espaçamento/fluxo para a borracha normal. |
| `js/editor/viewport.js` | Reutiliza a composição e atualiza apenas o retângulo afetado; seleção animada usa somente overlay. |
| `js/editor/document.js` | Máscaras por recorte e pirâmide de proxy reutilizada com atualização por região. |
| `index.html` | Carrega o motor de blocos local. |

Espaçamento padrão: 12% do diâmetro; fluxo padrão: 100%. Fluxo determina a tinta de cada carimbo, enquanto a opacidade limita o resultado do traço inteiro. Não há snapshot de camada inteira no início de um traço de pincel/borracha normal. Os outros pincéis mantêm seu processamento original.

**Testes:** em 6000 × 4000, um traço com pincel de 20 px, de (100,100) a (115,110), aumentou o histórico em **8.357 bytes**. Cem traços produziram cem comandos; cem undo e cem redo restituíram exatamente o hash dos pixels. Nas execuções, 99 traços adicionais levaram aproximadamente 2,3–2,9 s; 200 navegações de histórico levaram aproximadamente 4,8–5,2 s, em lote sintético. Também foram testados cancelamento, acúmulo com fluxo de 10%, limite de opacidade, pincel preto na máscara e borracha revelando a máscara.

A composição parcial atualizou uma região de cerca de 48 × 48 px, contra um documento de 600 × 450 no cenário de máscara. Comparada à composição integral, a maior diferença na vista foi **1 nível por canal**, por arredondamento de Canvas; a reversão dos pixels do documento é exata.

**Mudanças de comportamento:** espaçamento segue a distância acumulada do caminho, em vez de redistribuir carimbos a cada evento. Isso pode alterar ligeiramente traços em relação à versão original, especialmente com eventos de ponteiro irregulares. Os controles de fluxo/espaçamento são novos. Pressão, estabilizador, seleção e semântica de máscara foram mantidos.

## 4. Prévia WebGL opcional

**Criado:** `js/editor/preview-gl.js` — shader para temperatura, exposição em luz linear, contraste, saturação e curvas com as LUTs monotônicas do motor original.

**Alterados:** `js/editor/document.js`, para seleção do caminho de prévia e descarte de respostas antigas; `index.html`, para carregar o módulo.

- A textura de origem só é reenviada quando a imagem/versão muda. LUTs só são reenviadas quando as curvas mudam.
- Continua usando o proxy de até 1600 px no maior lado, como a arquitetura original. Não processa 24 MP completos a cada movimento de slider.
- Se qualquer outro parâmetro estiver ativo, toda a prévia usa o worker para preservar a ordem dos efeitos. Falta de WebGL, falta da extensão float, falha de shader ou contexto perdido acionam fallback silencioso.
- Aplicar, imagem final, PSD e exportações continuam pelo motor original. A prévia acelerada é aproximada.

**Testes:** shader versus worker com ajustes isolados, combinação dos cinco ajustes e pixels semitransparentes: diferença máxima observada de **3 níveis por canal**. Ausência de WebGL e falha de compilação simulada deram prévia pelo worker sem erro JavaScript. Combinação com Realces também passou pelo worker. Resultado em resolução total conferido contra o motor original, com no máximo 1 nível após conversão de Canvas/alfa.

Doze atualizações de exposição em documento de 6000 × 4000, usando proxy de 1600 px, tiveram mediana de **33 ms por atualização**, incluindo esperas por frames no teste. O ambiente usa ANGLE/SwiftShader (renderização gráfica por software), não uma GPU física. Esses números não garantem o desempenho de outro navegador/dispositivo. Perda real de dispositivo gráfico não foi provocada; ausência de contexto e falha de shader foram simuladas.

**Mudança de comportamento:** quando compatível, a prévia responde pelo shader; sua quantização pode diferir alguns níveis do resultado aplicado. Não aparece aviso ao usuário em fallback.

## 5. Barra flutuante opcional

**Criado:** `js/ui/floating-toolbar.js` — destacar, arrastar com captura de ponteiro, reencaixar, persistir e limitar a posição à área da imagem.

**Alterados:** `css/app.css`, para os controles e apresentação flutuante; `index.html`, para carregar o módulo.

**Testes:** padrão encaixado em contexto novo; destacar; arrastar por eventos reais de mouse; gravar/restaurar posição (214,138) após reload; reencaixar preservando posição/largura do stage; redimensionar para 700 px sem deixar a barra fora da tela. Sem erro JavaScript.

**Mudança de comportamento:** nova alça e botão no topo da barra. O padrão é encaixado; quando o usuário escolhe flutuar, esse modo e a posição são lembrados em `prisma.toolrail`. Se localStorage estiver bloqueado, continua utilizável sem persistência.

## Regressão final e arquivos auxiliares

- Abrir PNG pelo fluxo público do aplicativo.
- Camadas, opacidade, mesclagem, máscara, seleção e reordenação.
- Mesclar, recortar e girar com undo/redo e conferência dos pixels.
- Texto editável pelo painel declarativo e reversão no histórico.
- Salvar/reabrir `.prisma`, conferindo composição.
- Exportar/reabrir PSD, conferindo dimensões e camadas. Não foi utilizado Photoshop/Photopea externo.
- Prévia e aplicação de **39 filtros e 15 ajustes** encontrados nos dicionários do código enviado; nenhum filtro/ajuste foi acrescentado ou removido.
- Alternar tema claro/escuro.
- Gerar PDF de pôster, reabrir com pdf-lib e verificar duas páginas (guia + folha).
- **Zero erros JavaScript, zero erros de console e zero solicitações HTTP/HTTPS** na regressão offline.

`LEIA-ME.md` foi atualizado com as funções novas. Foram criados este relatório e `testes/README.md`, `run.cjs`, `history.cjs`, `paint.cjs`, `preview.cjs`, `toolbar.cjs`, `regression.cjs` e `compare-tools.cjs` para reprodução. Os testes usam Playwright apenas como dependência de desenvolvimento; não é distribuído ou carregado pelo aplicativo.

A suite cobre casos concretos, não todos os arquivos PSD possíveis, fontes, modelos de caneta, tamanhos máximos ou navegadores. Não foi feita validação em Firefox/Safari nem em dispositivo móvel físico. O ZIP não inclui as ferramentas temporárias de teste, navegador ou capturas de tela usadas nesta execução.


## Atualização posterior: encaixe dos pôsteres

A atualização descrita em `POSTER-ENCAIXE.md` substitui a ampliação por folha do montador por um raster global e adiciona montagem real, posicionamento físico sem reescala e calibração em dois eixos. O restante deste documento registra as cinco etapas anteriores.

## 7. Design, convites e GitHub

Biblioteca Fabric.js 6.9.0 adicionada em `vendor/`, com licença MIT em `licencas/`. O app segue sem build, CDN ou chamadas para serviços externos.

Validação em Chromium headless por `file://`:

- Os oito modelos carregam e o arquivo `.prismadesign` reabre inclusive as folhas decorativas e bloqueios.
- Desfazer/refazer, duplicação, agrupamento e desagrupamento conservam os objetos e suas posições.
- PNG em 1748 × 2480 px e PDF com duas páginas A5, medindo 148 × 210 mm; mudança para quadrado exporta 1080 × 1080 px.
- Importação real de uma foto PNG com seletor de arquivo: incorporada como data URL, salva e reaberta com o nome do objeto preservado.
- Tentativa de carregar imagem HTTP externa rejeitada antes da desserialização. Ausência de requisições HTTP e de erros de console durante os fluxos automatizados.
- Página enviada ao Editor; verificação visual em desktop (1440 × 1000) e celular (390 × 844), sem transbordamento horizontal. Uma página substitui o documento do Editor; há confirmação quando este já está aberto.
- Os testes podem ser repetidos em `testes/design.cjs`, agora incluído em `testes/run.cjs`.

O workflow de Pages segue as versões da documentação oficial consultada em 21/10/2026. Não foi executado no GitHub: o repositório novo e a configuração de Pages ainda precisam ser criados. Não há URL de publicação validada nesta entrega.

### Resultado da suíte completa após a integração

`PRISMA_CHROMIUM=/tmp/prisma-chromium node testes/run.cjs`: todos os sete programas de validação concluídos com código 0. Histórico de 24 MP: delta de 3.669 bytes para a pequena edição de teste, 100 desfazer/refazer sem divergência. Prévia acelerada: mediana de 33 ms no ambiente de teste com SwiftShader; não é garantia de desempenho em qualquer dispositivo. Regressão: 39 filtros, 15 ajustes, PSD, Prisma e PDF sem erros de console ou rede. Pôster: 18 pares de faixas, 1.964.550 pixels comparados exatamente e montagem com quatro folhas. Design: oito modelos e PDF A5 de duas páginas, sem erros de console/rede.

A impressão física não foi executada: os cálculos, pixels repetidos, medidas e posicionamento no PDF foram verificados automaticamente. A escala efetiva depende da configuração e calibração da impressora.

## 8. Faixas de cola sem margem branca

Testes `poster.cjs` e `poster-marks.cjs` aprovados, sem erros de página. Guias testadas com margens 0 / 0,5 / 1 / 5 mm, orientações retrato/paisagem, vizinhas omitidas e guias desligadas. Uma montagem de 410 × 584 pixels conserva exatamente todos os 239.440 pixels da arte limpa após cobrir as faixas. PDF revisado visualmente por renderização Poppler/MuPDF. O PDF do usuário conserva quatro folhas A4 e todos os hashes dos fluxos de imagem; somente vetores/textos de cola foram adicionados.
