# Prisma Studio — edição mais direta

Site, Windows **0.1.5** e Android **0.1.4** compartilham estas funções.

## O que mudou

- **Colagens:** novas colagens preservam as fotos originais. Selecione uma foto e use **Ajustar foto** para arrastar o enquadramento, ampliar, centralizar, substituir ou trocar com outra foto. A moldura mantém seu tamanho. Aplicar é reversível pelo histórico.
- **Texto:** selecionar um texto mostra a barra com fonte, tamanho, cor e negrito. **Aparência** expande contorno e sombra; **Mais opções** abre os controles completos. **Escrever** ativa a edição do texto no próprio objeto.
- **Modelos:** 12 novas composições autorais, totalizando 24. Incluem convites infantis, casamento, bebê, cardápios, ofertas, posts e formatura. Textos e elementos continuam separados e editáveis.
- **Recorte com IA:** além do modelo local, há pincéis **Restaurar** e **Apagar**, tamanho de pincel, zoom até 8×, desfazer do pincel e limpeza dos retoques. Os mesmos traços normalizados são aplicados à prévia e à máscara na resolução original.
- **Recentes:** botão do relógio no topo, com miniaturas e recuperação das cópias locais. Arquivos salvos também entram nessa lista. O site guarda uma cópia após um minuto ocioso; os apps continuam com sua recuperação nativa, acessível por **Cópias do aplicativo**. O indicador mostra alterações pendentes, gravação, cópia concluída ou erro real de armazenamento.
- **Desempenho:** fotos das colagens não são mais convertidas para PNG de cada célula. O histórico compartilha cada imagem entre os passos e armazena separadamente as alterações dos objetos. Miniaturas muito altas têm resolução limitada; redimensionamentos repetidos da área de criação são evitados.
- **Abertura:** removidas as barreiras fixas de 25 MB por foto e 40 MB por arquivo de Design. A capacidade real continua dependendo da memória do aparelho e da decodificação do navegador.

Os arquivos e cálculos do módulo de pôsteres não foram alterados.

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `js/design/photo-fit.js` | Enquadramento, substituição e troca de fotos, preservando os originais. |
| `js/design/quick-text.js` | Barra contextual e controles de texto para toque e mouse. |
| `js/design/templates-extra.js` | Novos modelos e suas estruturas visuais. |
| `js/design/history-assets.js` | Fotos compartilhadas entre os estados do histórico. |
| `js/ai/mask-edit.js` | Aplicação dos traços de retoque em qualquer resolução. |
| `js/ui/recent-projects.js` | Miniaturas, cópias locais e reabertura pelo IndexedDB. |
| `css/refinements.css` | Layout dos novos controles nos dois tamanhos de tela. |
| `js/design/design.js`, `creative.js`, `design-controls.js`, `template-scenes.js` | Integração com páginas, histórico, colagens e modelos existentes. |
| `js/ui/background-ai.js`, `js/ai/background.js` | Retoques e proteções do diálogo de IA e de camadas bloqueadas. |
| `js/editor/commands.js`, `js/ui/desktop.js`, `js/ui/android.js` | Registro dos arquivos salvos e estado das cópias nativas. |
| `index.html`, arquivos de versão e workflows | Carregamento offline e compilação dos instaladores. |
| `testes/refinements-interactions.js`, `testes/design-assets.cjs`, testes nativos | Validação dos novos fluxos e regressão. |

## Validação e limites

Os testes conferem zoom sem alterar a moldura, troca de fotos com desfazer/refazer, reabertura com fotos originais, aparência do texto, caixas dos novos modelos, miniaturas e recuperação, máscaras e tamanho final da IA. A conferência é compartilhada entre navegador, Electron e WebView Android.

O teste de histórico cria 100 alterações sobre uma fonte de 4 MB e verifica que ela é armazenada uma única vez. O limite de 32 MB refere-se à memória adicional do histórico além das fontes do estado corrente; essas fotos já pertencem ao documento de trabalho.

As cópias locais ficam neste aparelho, limitadas a oito trabalhos e 160 MB; as mais antigas cedem espaço. Não substituem salvar o arquivo em uma pasta. As fontes importadas precisam acompanhar o projeto quando ele for levado a outro dispositivo.

Colagens antigas que já tinham descartado os pixels externos não podem recuperá-los automaticamente. O novo enquadramento preserva as fotos a partir desta versão. A IA continua leve e local, com análise em 320 × 320; os retoques manuais ajudam nos detalhes, sem promessa de recorte automático perfeito.
