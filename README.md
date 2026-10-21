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
