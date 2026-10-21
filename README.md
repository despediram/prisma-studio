# Prisma Studio

Editor de imagens, criador de convites e montador de pôsteres. JavaScript puro, sem build e sem serviços de processamento externos. Abra `index.html` para usar offline, inclusive em `file://`.

## Três áreas de trabalho

- **Editor:** camadas, máscaras, seleções, texto, pincel com fluxo/espaçamento, filtros, ajustes e arquivos PSD/Prisma. Histórico por comandos e diferenças em blocos; prévia WebGL com fallback no worker.
- **Design:** oito modelos autorais de convites/cartões, texto e formas editáveis, fotos incorporadas, alinhamento, agrupamento, bloqueio, ordem dos objetos e até 40 páginas. Salva `.prismadesign`; exporta PNG e PDF; envia uma página ao Editor para tratamentos e montagem de pôster.
- **Pôster:** divisão em milímetros, margens, faixas sobrepostas com pixels idênticos, montagem virtual das folhas, calibração da impressão, PDF e PNGs.

[Manual completo](LEIA-ME.md) · [Encaixe dos pôsteres](POSTER-ENCAIXE.md) · [Mudanças desta entrega](DESIGN-E-GITHUB.md) · [Validação](VALIDACAO.md)

## Uso do Design

1. Entre na aba **Design**, escolha o formato e um modelo.
2. Clique em textos/objetos para alterar suas propriedades. Arraste, redimensione e gire pelas alças. Selecione vários objetos com Shift para agrupar.
3. Use **Salvar design editável** para preservar páginas e objetos. `Ctrl+S` salva o design; `Ctrl+O` abre um `.prismadesign`; `Ctrl+Z` desfaz.
4. Exporte PNG ou PDF. Para um pôster, escolha **Enviar página ao editor**, abra **Pôster** e configure as folhas.

Os PDFs A5/A4/cartão têm dimensões físicas definidas. Imprima em **100% / tamanho real**, sem “ajustar à página”. A impressora e o papel também precisam respeitar essa escala; use a calibração do módulo Pôster.

## GitHub e publicação

Repositório do projeto: [despediram/prisma-studio](https://github.com/despediram/prisma-studio), privado. A configuração de hospedagem ainda precisa ser concluída; este README não indica que exista um site no ar.

1. Os arquivos do aplicativo ficam na raiz do repositório, incluindo `vendor/` e `licencas/`.
2. Em **Settings → Pages → Source**, selecione **GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` publica os arquivos estáticos após cada envio para `main`. O endereço real aparece na execução e em Settings → Pages.

O GitHub Free permite Pages em repositórios públicos; Pages com fonte privada exige plano compatível. O site publicado é normalmente público mesmo quando a fonte é privada. Acesso público de leitura não concede permissão de editar o repositório. Mantenha apenas o proprietário e integrações autorizadas com escrita. A integração do assistente age com a autorização da sua conta; não é um segundo usuário colaborador.

Referência: [documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Dependências e desenvolvimento

Todas as dependências de execução estão em `vendor/`; não há CDN. Fabric.js 6.9.0 (MIT) fornece os objetos do módulo Design, com licença em `licencas/fabric-6.9.0-LICENSE.txt`. As demais licenças também são preservadas. Não foi atribuída uma licença nova ao código original do projeto.

O módulo Design é uma implementação própria com recursos comuns de editores visuais. Não contém código, modelos, catálogo premium ou APIs privadas do Canva/Photoshop. Não implementa todas as funções desses produtos.

Para repetir os testes em navegador real, consulte [testes/README.md](testes/README.md). O app não precisa de Node.js para funcionar.
