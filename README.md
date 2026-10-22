# Prisma Studio

**[Abrir o aplicativo online](https://despediram.github.io/prisma-studio/)**

Editor de imagens, criador de convites e montador de pôsteres. JavaScript puro, sem build e sem serviços de processamento externos. Abra `index.html` para usar offline, inclusive em `file://`.

## Três áreas de trabalho

- **Editor:** camadas, máscaras, seleções, texto, alinhamento do conteúdo, máscara para remover fundo uniforme, pincel com fluxo/espaçamento, filtros, ajustes e arquivos PSD/Prisma. Histórico por comandos e diferenças em blocos; prévia WebGL com fallback no worker.
- **Design:** 12 modelos autorais de convites/cartões, texto e formas editáveis, fotos incorporadas, recorte/efeitos de fotos, tipografia, sombra, guias, alinhamento/distribuição, agrupamento, bloqueio, ordem dos objetos e até 40 páginas. Salva `.prismadesign`; exporta PNG, SVG e PDF; envia uma página ao Editor para tratamentos e montagem de pôster.
- **Pôster:** divisão em milímetros, margens, faixas sobrepostas com pixels idênticos, montagem virtual das folhas, calibração da impressão, imagem inteira com abas brancas no modo A4 seguro, PDF e PNGs.

[Manual completo](LEIA-ME.md) · [Encaixe dos pôsteres](POSTER-ENCAIXE.md) · [Mudanças desta entrega](DESIGN-E-GITHUB.md) · [Validação](VALIDACAO.md) · [Design, celular e A4 seguro](ATUALIZACAO-DESIGN-MOBILE.md)

## Uso do Design

1. Entre na aba **Design**, escolha o formato e um modelo.
2. Clique em textos/objetos para alterar suas propriedades. Arraste, redimensione e gire pelas alças. Selecione vários objetos com Shift para agrupar.
3. Use **Salvar design editável** para preservar páginas e objetos. `Ctrl+S` salva o design; `Ctrl+O` abre um `.prismadesign`; `Ctrl+Z` desfaz.
4. Exporte PNG ou PDF. Para um pôster, escolha **Enviar página ao editor**, abra **Pôster** e configure as folhas.

Os PDFs A5/A4/cartão têm dimensões físicas definidas. Imprima em **100% / tamanho real**, sem “ajustar à página”. A impressora e o papel também precisam respeitar essa escala; use a calibração do módulo Pôster.

## GitHub e publicação

**Site publicado:** https://despediram.github.io/prisma-studio/

**Repositório público:** [despediram/prisma-studio](https://github.com/despediram/prisma-studio). O proprietário escolheu tornar o código público para usar o GitHub Pages gratuitamente. Qualquer pessoa pode consultar e copiar o código; isso não concede permissão de escrita no repositório.

Em **Settings → Pages**, a origem está configurada como **GitHub Actions**. O workflow `.github/workflows/pages.yml` publica automaticamente o aplicativo após alterações na branch `main`. Somente `index.html`, `css/`, `js/`, `assets/`, `vendor/` e `licencas/` entram na hospedagem.

A publicação inicial foi concluída em 21/10/2026. A URL respondeu HTTP 200 com o HTML do aplicativo. A integração do assistente age com a autorização da conta proprietária; não é um segundo usuário colaborador.

Referência: [documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Dependências e desenvolvimento

Todas as dependências de execução estão em `vendor/`; não há CDN. Fabric.js 6.9.0 (MIT) fornece os objetos do módulo Design, com licença em `licencas/fabric-6.9.0-LICENSE.txt`. As demais licenças também são preservadas. Não foi atribuída uma licença nova ao código original do projeto.

O módulo Design é uma implementação própria com recursos comuns de editores visuais. Não contém código, modelos, catálogo premium ou APIs privadas do Canva/Photoshop. Não implementa todas as funções desses produtos.

Para repetir os testes em navegador real, consulte [testes/README.md](testes/README.md). O app não precisa de Node.js para funcionar.


Atualização de impressão sem moldura extra: [sangria, compensação e corte medido](POSTER-SANGRIA.md). Esta revisão substitui a reserva branca e o mínimo obrigatório de 5 mm descritos nas etapas anteriores.

## Ampliador integrado e telas móveis

Use o ícone de ampliar no topo do Editor ou a aba Melhorar. O painel inclui IA Real-ESRGAN, restauração e comparação antes/depois; há também um modo rápido sem IA. Os modelos podem ser baixados com autorização na interface ou carregados em ONNX do computador. O motor acompanha o projeto, sem CDN. A aplicação cria uma imagem mesclada, recuperável com Desfazer.

No celular, ferramentas deslizam horizontalmente e painéis reservam espaço para a arte. Em paisagem, as opções abrem na lateral. Instruções, arquivos e validação: [docs/ampliador-e-mobile.md](docs/ampliador-e-mobile.md).

## Aplicativo para Windows

A versão desktop usa os arquivos deste projeto, sem substituir o site. O workflow [Compilar Prisma Studio Windows](.github/workflows/desktop.yml) valida o aplicativo no Windows e publica um instalador `.exe` em [Versões](https://github.com/despediram/prisma-studio/releases). O usuário final não precisa instalar ferramentas de desenvolvimento.

Menus nativos, recentes, Salvar/Salvar como, diálogos de exportação e recuperação em disco complementam o Editor, o Design e os Pôsteres. Cada área mantém duas gerações de recuperação; a gravação ocorre a cada minuto de alterações quando a edição está ociosa. Arquivos `.prisma` também preservam os ajustes não destrutivos. O instalador inclui o motor do ampliador, mas os modelos ONNX continuam sendo carregados ou baixados com autorização na interface.

Para desenvolver: `npm ci`, `npm run prepare:desktop`, `npm start`. Validação: `npm run test:desktop` e, no Windows, `npm run test:desktop:smoke`. Compilação: `npm run dist:win`. Consulte [desktop/RELEASE.md](desktop/RELEASE.md) para os recursos e limites desta primeira versão. O motor de pixels continua compartilhado com o navegador; não há ganho automático de precisão, memória ilimitada ou um backend de GPU nativo novo.

## Aplicativo Android

A pasta `android/` empacota o Editor, o Design, os Pôsteres e o ampliador usando os mesmos arquivos do site. O APK inclui os recursos locais e usa uma origem HTTPS virtual; não abre o GitHub Pages para funcionar. O seletor nativo abre imagens e projetos e escolhe o destino de PNG/JPG/PDF/PSD e projetos. Imagens podem ser recebidas por **Compartilhar → Prisma Studio** e exportações podem ser compartilhadas pelo menu do aplicativo.

Requer Android 8 ou superior e Android System WebView atualizado. Os modelos ONNX não acompanham o APK: são carregados ou baixados com autorização no ampliador. O modo rápido funciona offline. O limite efetivo de imagens continua dependendo do aparelho.

A ponte nativa aceita só a origem do APK e o quadro principal. Arquivos usam o seletor do sistema, sem acesso geral ao armazenamento. Transferências usam blocos de 64 KB e a recuperação local mantém duas gerações por área. O botão Voltar fecha primeiro diálogos/painéis; sair tenta concluir uma cópia local.

Compilação: Java 17, Gradle 8.11.1 e SDK Android 35; `gradle -p android assembleRelease`. O workflow Android testa Editor, worker, recuperação, Design, Pôster e ampliador num emulador sem rede. O APK intermediário **unsigned** não é instalável; a assinatura final usa a chave privada preservada fora do repositório. Nunca inclua essa chave no GitHub.
