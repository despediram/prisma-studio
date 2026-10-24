# Prisma Studio — criação e recorte por IA

Disponível no site e nos pacotes Windows 0.1.4 e Android 0.1.3.

- **Editor → Ferramentas → Remover fundo com IA**: modelo U²-NetP executado no aparelho, em worker, com progresso, cancelamento, comparação com original, ajuste de transparência e PNG. Aplicar cria uma máscara e mantém os pixels originais. Desfazer/refazer preserva o resultado.
- **Design → Fotos**: importação de várias fotos, reutilização das fotos da sessão, imagem do Editor e remoção do fundo da foto selecionada.
- **Design → Texto**: seis combinações autorais editáveis, busca, prévias de fontes e importação local de TTF/OTF/WOFF/WOFF2. Fontes importadas ficam neste aparelho; para outro dispositivo é preciso levar a fonte junto do projeto.
- **Design → Colagens**: seis divisões para 2, 3, 4, 6 ou 9 fotos, com espaçamento ajustável. A colagem ocupa uma nova página e cada foto é um objeto separado. As fotos são recortadas ao centro antes da inserção.
- **Design → Fundos**: cores, degradês e padrões autorais sem apagar os demais objetos.
- **Design → Tamanhos**: formatos adicionais e tamanho personalizado em pixels, milímetros ou centímetros. Redimensionamento proporcional e centralizado, reversível pelo histórico.
- No celular, a barra inferior desliza entre categorias; a biblioteca ocupa uma gaveta com botão Fechar. No computador, os painéis laterais permanecem disponíveis.

O catálogo de modelos é preparado apenas ao entrar no Design; suas miniaturas são geradas em sequência, cedendo tempo à interface. JPEG/PNG/WebP são incorporados sem reconversão desnecessária para PNG.

## Fidelidade e limites

O modelo leve está incluído no pacote e carrega sob demanda, inclusive em `file://`. A imagem não é enviada a um serviço externo. A análise usa 320 × 320 pixels e a máscara é interpolada para a resolução original: cabelos, transparências e detalhes finos precisam de revisão. Não é um modelo de geração de imagens nem uma garantia de recorte perfeito.

Os cálculos, arquivos e padrões do módulo de pôsteres foram preservados.

## Validação

`testes/background-ai.cjs` confere normalização, transparência, refinamento e integridade SHA-256 dos pesos. `testes/creative-interactions.js` confere textos, fundos após reabertura, tamanhos com histórico, geometria das colagens, fotos, máscaras e inferência real. É compartilhado pelos testes do Windows e do Android; o Android roda com rede desligada. `testes/creative.html` permite repetir a conferência em tela de celular ou computador.

Foram mantidos os testes existentes de corte, texto e 100 operações de desfazer/refazer. Os resultados das compilações nativas ficam nos workflows do GitHub.
