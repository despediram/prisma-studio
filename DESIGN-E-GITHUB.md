# Design e preparação para GitHub

## Pesquisa e decisão

Foram inspecionados [Fabric.js](https://github.com/fabricjs/fabric.js) e [tavo379/design-editor](https://github.com/tavo379/design-editor), que se apresenta como Canva Clone com React/Fabric.js e licença MIT. A descrição de clone não comprova engenharia reversa do Canva. Não foi incorporado código desse clone, nem ativos de serviços proprietários.

A biblioteca Fabric.js 6.9.0 foi incorporada localmente (MIT) para transformação, seleção e texto em Canvas. Os modelos e a integração são próprios do Prisma. Foi mantida a arquitetura sem build, offline e file://.

## Arquivos criados

| Arquivo | Responsabilidade |
| --- | --- |
| `js/design/templates.js` | Formatos com medidas físicas e oito modelos autorais editáveis. |
| `js/design/design.js` | Objetos, propriedades, páginas, histórico local, persistência e exportação. |
| `vendor/fabric-6.9.0.min.js` | Motor Canvas de objetos, disponível offline. |
| `licencas/fabric-6.9.0-LICENSE.txt` | Licença e atribuições da dependência. |
| `testes/design.cjs` | Regressão automatizada dos novos fluxos por file://. |
| `README.md` | Descrição do projeto, instruções de uso e hospedagem. |
| `.github/workflows/pages.yml` | Publicação estática no Pages após configurar o repositório. |
| `.gitignore`, `.nojekyll` | Excluem saídas locais e desativam processamento Jekyll. |
| `DESIGN-E-GITHUB.md` | Decisões, limites e inventário desta entrega. |

## Arquivos alterados

| Arquivo | Motivo |
| --- | --- |
| `index.html` | Nova aba Design e dependências locais, preservando IDs existentes. |
| `css/app.css` | Layout responsivo, catálogo, página e inspetor de objetos. |
| `js/app.js` | Alternância entre três áreas e roteamento dos controles/atalhos do Design. |
| `testes/run.cjs`, `testes/README.md` | Incluem os testes do Design. |
| `LEIA-ME.md`, `VALIDACAO.md` | Documentam o novo módulo e seus resultados. |

## Comportamentos novos e limites

O Design tem histórico e formato próprios, sem alterar o formato `.prisma`. Os objetos continuam editáveis na aba Design; enviar uma página ao Editor cria um documento rasterizado e substitui o documento de pixels atual, pedindo confirmação se já existir um documento. O PDF do Design também é rasterizado, com dimensões físicas preservadas; não é PDF vetorial nem preflight CMYK. Fontes dependem das famílias disponíveis no sistema; imagens são incorporadas, sem baixar fontes/fotos.

Os menus de edição de pixels ficam ocultos enquanto a aba Design está ativa. Os botões superiores Abrir, Desfazer, Refazer e Exportar atuam no design; Exportar baixa PNG. Os formatos são predefinidos, a troca mantém a proporção dos objetos e centraliza o conteúdo. O histórico do Design usa serialização de objetos com orçamento de 32 MiB; é separado do histórico por blocos de pixels do Editor. Não há autosalvamento: salve o `.prismadesign` antes de fechar.

Ainda não há colaboração simultânea, catálogo online, remoção de fundo por IA, edição vetorial de nós, composição tipográfica avançada, importação do formato Canva, PSD do módulo Design, animação, CMYK ou todas as ferramentas do Photoshop/Canva. Estas são possíveis etapas futuras, não recursos entregues.

## GitHub

A conexão da conta foi validada. O proprietário criou o repositório privado `despediram/prisma-studio`, inicialmente com README. Esta entrega envia o projeto para esse repositório, preservando o commit inicial. A publicação do site ainda não está concluída. O conector disponível permite trabalhar nos arquivos de um repositório existente, mas não criar um repositório novo ou configurar Pages. O projeto e seu workflow estão preparados para a configuração do Pages pelo proprietário.
