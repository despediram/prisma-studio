# Ampliador integrado e organização para celular

A adaptação parte do arquivo `upscaler-local.html` fornecido pelo autor do projeto. Mantém as sete etapas existentes (limpeza, desembaçar, ampliação, rostos, nitidez, clareza e cor), com a aparência do Prisma. O arquivo enviado permanece intacto.

## Como usar

1. Abra uma imagem no Editor. Use o ícone de ampliar no topo ou **Melhorar → Abrir ampliador de IA e restauração**. No Pôster, o aviso de resolução também abre este painel.
2. O tamanho inicia em **Auto**, com uma sugestão que preserva pelo menos a resolução original. Há também **1× restaurar** e multiplicadores manuais sem teto fixo de megapixels. O tamanho recomendado é opcional; uma redução depende de escolha explícita. A resolução original aparece ao lado da saída.
3. Escolha **IA · Real-ESRGAN** ou **Rápido · sem IA**. O segundo funciona sem modelos e sem internet; utiliza interpolação, não reconstrução neural.
3. Para IA, permita baixar os modelos ou carregue `.onnx` locais. Escolha o tipo de modelo quando o nome do arquivo for genérico, como `model.onnx`. O modelo de desenho é diferente do modelo de foto.
4. Ajuste o tamanho e as etapas, clique em Melhorar imagem e compare antes/depois. É possível baixar PNG/JPG ou aplicar ao Editor.
5. **Aplicar** substitui a imagem visível por uma camada mesclada. **Desfazer** recupera as camadas, máscaras, dimensões e ajustes anteriores. O arquivo PSD/projeto original em disco não é alterado. No Design, envie primeiro uma cópia ao Editor pelo comando próprio da área de Design.

A proporção é preservada. Quando a medida em pixels tem outra proporção, a imagem inteira é centralizada sobre fundo desfocado, conforme o comportamento de encaixe do ampliador enviado; não se estica a imagem para preencher.

## Offline, memória e privacidade

- Nenhuma imagem é enviada aos servidores dos modelos. Downloads são de arquivos ONNX; o processamento ocorre no dispositivo.
- ONNX Runtime Web 1.20.1 fica em `vendor/onnxruntime/`, com licença MIT em `licencas/onnxruntime-web-MIT.txt`. O motor não depende de CDN.
- O WASM é compactado e dividido em 53 partes JavaScript. As partes são carregadas sob demanda, quatro por vez, e reconstruídas em memória. URLs Blob evitam fetch direto de WASM e módulos `file://`.
- Para uso offline, extraia o ZIP inteiro. Carregue modelos ONNX do computador; modelos baixados podem ser reutilizados pelo cache quando o navegador disponibilizar esse armazenamento. Arquivos locais de modelo ficam na sessão do painel; reabra-os se fechar o painel.
- WebGPU tem tentativa de execução pela GPU e fallback para WebAssembly/CPU. Disponibilidade, velocidade e suporte aos modelos variam por navegador/dispositivo.
- Não há teto artificial de megapixels ou de lado na saída manual. A sugestão usa uma referência de 32 MP no celular e 100 MP no desktop; o modo Auto nunca reduz a resolução original. A criação real depende da capacidade de Canvas e da memória do aparelho. GFPGAN exige aproximadamente 340 MB só de modelo; NAFNet também é pesado. Imagens e modelos grandes podem demorar bastante.
- A IA pode criar detalhes diferentes do original; confira rostos, letras e logotipos antes de imprimir.

## Organização móvel

- Cabeçalho em duas linhas com navegação Editor / Design / Pôster e menu recolhível.
- Ferramentas em faixa horizontal real, com alvos de 44 px. Deslize para acessar as demais ferramentas.
- Painéis inferiores com Fechar, Expandir/Reduzir e gesto no cabeçalho. A imagem ocupa o espaço restante acima do painel.
- Em paisagem, os painéis vão para a lateral. Design e Pôster também reservam espaço para suas opções.
- A referência de organização foi a documentação pública de UX móvel do Adobe Express (painéis parciais, expansão e ações próximas ao rodapé): https://developer.adobe.com/express/add-ons/docs/guides/build/design/ux-guidelines/mobile-ux . A implementação é própria; nenhum código proprietário foi incorporado.

## Validação realizada

- Verificação de sintaxe dos scripts alterados e do JavaScript embutido no ampliador.
- Inferência real com Real-ESRGAN general x4v3: entrada PNG 160 × 120 com transparência; saída 320 × 240. Modelo carregado do disco; execução WebAssembly/CPU no Chrome do ambiente de teste. O novo runtime compactado/dividido foi usado no teste.
- Download PNG aberto com Pillow: dimensão correta, alfa 0 no fundo transparente e 255 no centro opaco.
- Aplicação ao Editor e Desfazer: retorno às dimensões anteriores; ensaio adicional com duas camadas e máscara recuperou as duas camadas e a máscara.
- Ensaio do modo rápido sem modelos; comparação antes/depois, download e aplicação.
- Telas 360 × 800, 390 × 844 e 844 × 390 em iframes de teste com dimensões reais de viewport CSS; navegação de Design, catálogo, Editor e Pôster. Na tela de 390 px, largura e scrollWidth coincidiram; a área da imagem terminou exatamente onde o painel começou.
- Painel expansível, fechamento, ampliação em tela cheia e painel lateral em paisagem. A reserva de espaço é atualizada no próximo quadro, para não alterar a geometria durante o callback de ResizeObserver.

Limites da validação: não houve telefone físico ou Safari neste ambiente. WebGPU, NAFNet e GFPGAN não foram validados integralmente nesta alteração. A abertura `file://` foi preparada no código, mas a validação visual disponível usa HTTP. A suíte completa histórica não foi reexecutada; os motores de pixels, histórico, PSD, projeto, geração geométrica de pôster e templates permanecem sem alterações nesta entrega.

## Arquivos

- `.github/workflows/pages.yml`: inclui a pasta do ampliador no site publicado.
- `index.html`: carrega os estilos e o controlador do ampliador; remove duplicação do parâmetro viewport.
- `js/ui/upscaler.js`: abre o painel, envia a imagem e aplica o resultado como comando desfazível; também recebe downloads do painel.
- `upscaler/index.html`: adaptação do ampliador enviado, com motor local, escolha de processamento, download consentido e proteção de transparência/proporção.
- `upscaler/bridge.js`: comunicação com a janela que abriu o painel, sem depender de acesso direto entre documentos locais.
- `css/upscaler.css`: tema do Prisma e layout móvel do ampliador.
- `css/upscaler-host.css`: janela integrada, incluindo versão móvel em tela cheia.
- `css/mobile-workspace.css`: cabeçalho, ferramentas, painéis inferiores/laterais e espaço reservado para a arte.
- `js/ui/mobile.js`: navegação, expandir/fechar painéis e cálculo do espaço disponível.
- `js/editor/viewport.js`: reenquadramento com margens adequadas a telas pequenas; cálculo desktop preservado.
- `js/poster/poster.js`: acesso ao novo ampliador pelo aviso de qualidade; cálculos e exportação não mudaram.
- `vendor/onnxruntime/ort.webgpu.min.js`: distribuição oficial do runtime.
- `vendor/onnxruntime/offline-runtime.js`: carregador sob demanda dos artefatos compactados.
- `vendor/onnxruntime/chunks/part-000.js` até `part-052.js`: as 53 partes do WASM compactado, na ordem indicada no carregador.
- `licencas/onnxruntime-web-MIT.txt`: licença oficial da dependência.
- `docs/ampliador-e-mobile.md`: instruções, alterações e limites dos testes.

### Correção de tamanho em celular

O antigo padrão fixo de 2× podia pedir 96 MP para uma foto de 24 MP e bloquear a execução no limite móvel de 32 MP. O padrão Auto agora calcula um fator fracionário quando necessário; não exige trocar de computador para continuar. Medidas manuais acima do orçamento são bloqueadas antes de executar e oferecem recuperação em um toque. Prévia limitada a 1600 px para reduzir o consumo de memória. O orçamento é uma estimativa de área, não uma garantia de memória livre.

Validação da correção: teste automatizado de 10.000 planos de saída (32 e 100 MP), incluindo limite de lado, redução e ampliação fracionária. Na interface de 390 × 844 px, imagem real de 6000 × 4000 px recebeu saída Auto de 6928 × 4618 px; 2× bloqueou corretamente e o botão recomendado recuperou uma configuração válida. Esse teste de 24 MP valida o planejamento e a interface, não o processamento completo de IA nessa resolução.

Também foi executado o processamento completo no modo Rápido/offline: 24 MP → 31.993.504 pixels (6928 × 4618), com nitidez e cor, PNG gerado e ações Baixar/Aplicar habilitadas. A tela informou conclusão em 4 s no navegador de teste; isso não prevê o tempo num celular físico. O modo IA sem modelo/download apresentou a mensagem esperada de configuração. O evento de download automatizado não foi capturado na ponte do iframe; a interface confirmou Baixado.
