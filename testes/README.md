# Testes de regressão do Prisma Studio

O aplicativo não precisa de Node.js nem de instalação. Esta pasta é apenas para quem quiser repetir a validação automatizada em navegador real.

Requisitos de desenvolvimento: Node.js, pacote `playwright` disponível para `require()` e Chromium instalado pelo Playwright. A instalação de ferramentas de teste pode exigir rede; a aplicação testada é aberta por `file://`.

```sh
npm install --no-save playwright
npx playwright install chromium
node testes/run.cjs
```

Para usar um Chromium existente, defina `PRISMA_CHROMIUM` como o caminho do executável. Os testes de WebGL usam ANGLE/SwiftShader quando disponível. A suite acusa falha se a prévia acelerada não estiver disponível no cenário em que ela é exigida.

- `history.cjs`: deltas em 24 MP, 100 desfazer/refazer, propriedades sem pixels, máscaras, criar/excluir camadas, bifurcação e orçamento de memória.
- `paint.cjs`: 100 traços em 24 MP e 200 navegações de histórico, fluxo/opacidade, cancelamento, máscara e composição parcial. Pixels do documento têm comparação exata; a vista admite 1 nível por canal por arredondamento da composição em Canvas.
- `preview.cjs`: shader versus worker, ausência de WebGL, falha de compilação simulada, parâmetros mistos, resultado em resolução total e tempos de atualização em documento de 24 MP. A prévia acelerada admite diferença de até 4 níveis por canal.
- `toolbar.cjs`: padrão encaixado, arraste por ponteiro, posição persistida após reload, reencaixe e tela de 700 px.
- `regression.cjs`: PNG, camadas, máscaras, seleção, texto, recorte, rotação, todos os filtros/ajustes do código, projeto `.prisma`, PSD e PDF de pôster. Verifica também console e ausência de requisições de rede. Os downloads são interceptados em memória apenas no teste; a serialização/decodificação real é executada.

Comparação opcional com uma pasta contendo o projeto original:

```sh
PRISMA_BASELINE=/caminho/prisma-studio-original node testes/compare-tools.cjs
```

Essa comparação confere os outros 18 módulos; pincel e borracha têm mudanças intencionais de espaçamento/fluxo e são cobertos por `paint.cjs`. Na etapa 2, antes dessas mudanças, os 20 módulos foram comparados e coincidiram com o original.

Os testes usam documentos temporários e contextos de navegador isolados. Não enviam arquivos para serviços externos.

- `poster.cjs`: comparação exata das faixas repetidas em 150/200/300/400 DPI, margens e sobreposições fracionárias, nitidez e clareamento; folhas A4 completas em 300 DPI; posicionamento físico no PDF, orientação, calibração e montagem por folhas.

- `design.cjs`: oito modelos, reabertura de objetos/folhas/bloqueios, desfazer/refazer, agrupamento sem deslocamento, exportações PNG/PDF A5 de duas páginas, rejeição de imagens externas, troca de formato, envio ao Editor e tela de 390 px. Verifica console e ausência de rede.

- `poster-marks.cjs`: faixas de cola com margem zero, vizinhas omitidas, orientação, opção desligada, dimensões e montagem comparada pixel a pixel sem guias aparentes. PDFs temporários para inspeção externa são gravados em `PRISMA_MARKS_OUTPUT` ou na pasta temporária do sistema.

- `poster-safe.cjs`: 219.960 pixels conferidos após simular impressão em A4 com 5 mm não imprimíveis, abas brancas, recorte e montagem; proporção da imagem inteira e PDFs retrato/rotacionado.
- `studio-upgrade.cjs`: miniaturas únicas, 60 cenas/formato, filtros de catálogo, tipografia, bloqueio, distribuição, foto com recorte/efeito e reabertura, SVG, recorte de fundo por máscara e igualdade worker/fallback. Confere quatro viewports e seleção/arraste por toque.

- `poster-bleed.cjs`: sangria sem moldura, abas fora do núcleo, zero mm sem imposição de 5 mm, três margens/orientações e PDFs A4 reais para inspeção. Use `PRISMA_BLEED_OUTPUT` para salvar os PDFs/referências em um diretório de QA. A montagem em coordenadas inteiras compara todos os bytes; a variante fracionária verifica exportação e escala física sem arredondar as emendas.
