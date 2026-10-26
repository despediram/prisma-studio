# Prisma Atelier — interface compartilhada

O site, o Windows 0.1.6 e o Android 0.1.5 passam a usar a mesma identidade: superfícies neutras, violeta para ações, pêssego nos detalhes e marca de prisma facetado. Não há novas bibliotecas, imagens remotas ou alterações na geometria dos pôsteres.

## O que mudou

- A central **Explorar** pesquisa ferramentas, bibliotecas, prompts e os comandos reais dos menus. A busca ignora acentos e informa quando é necessário abrir uma imagem. Atalho Ctrl+K ou ⌘K.
- Editor, Design e Pôster continuam separados e mantêm seus documentos ao alternar. As opções contextuais usam os mesmos controles e históricos existentes.
- Ferramentas ganham nomes visíveis, estados de seleção e ícones vetoriais próprios. Ícones permanecem nítidos em telas de alta densidade e funcionam em `file://`.
- No celular, o Design tem cinco destinos fixos: Modelos, Adicionar, Texto, Editar e Salvar. **Adicionar** reúne Fotos, Colagens, Fundos, Elementos, Tamanhos e Objetos. No computador, as bibliotecas laterais permanecem disponíveis.
- Botões, campos, sliders, painéis, diálogos, recentes, IA e ampliador passam a usar o mesmo acabamento, nos temas claro e escuro. A interface mantém foco de teclado, rótulos acessíveis e respeita redução de movimento.
- A entrada inicial apresenta os três espaços de criação e os botões de abrir, criar documento e experimentar uma imagem.
- Marca do site, ícone do Windows e ícone/barras do Android atualizados em conjunto.

## Arquivos e responsabilidades

| Arquivo | Motivo |
| --- | --- |
| `css/prisma-studio.css` (novo) | Tokens visuais, controles, layout responsivo, central e temas. |
| `js/ui/prisma-icons.js` (novo) | Biblioteca própria de pictogramas SVG em linha, sem requisições. |
| `js/ui/studio-shell.js` (novo) | Central de funções, rotas para controles existentes e identificação das ferramentas. |
| `js/editor/commands.js` | Expõe um catálogo dos callbacks e condições dos menus para a busca. |
| `js/ui/tool-options.js` | Cabeçalho das opções aceita tanto ícones antigos como SVG. |
| `index.html` | Carrega o sistema visual e os módulos depois da inicialização existente. |
| `css/upscaler.css` | Aplica a identidade ao ampliador, inclusive independente. |
| `assets/icone.svg` | Marca própria de prisma facetado. |
| `desktop/icon.cjs` | Gera o ícone Windows por geometria com módulos nativos do Node. |
| `desktop/main.cjs` | Fundo inicial da janela combina com a nova interface. |
| `desktop/smoke.cjs` | Inclui teste de navegação e painéis reais no Electron. |
| `desktop/RELEASE.md` | Descrição da versão Windows. |
| `package.json`, `package-lock.json` | Windows 0.1.6. |
| `android/app/build.gradle` | Android 0.1.5, código de versão 6. |
| `android/app/src/main/java/br/prismastudio/android/MainActivity.java` | Versão da ponte acompanhando o APK. |
| `android/app/src/main/res/drawable/prisma_icon.xml` | Marca vetorial do Android. |
| `android/app/src/main/res/values/styles.xml` | Cor da janela e das barras do sistema. |
| `android/app/src/androidTest/java/br/prismastudio/android/EditorTest.java` | Teste da nova central no WebView offline. |
| `.github/workflows/android.yml` | Nome do novo APK intermediário. |
| `testes/atelier-interactions.js` (novo) | Busca, disponibilidade, todos os painéis de ferramentas, rotas, prompts e ausência de sobreposição dos botões superiores. |
| `testes/atelier.html` (novo) | Conferência visual em 320, 390, 768, 1200 e 1440 px. |

## Validação

A conferência no navegador exercita busca com e sem acentos, todos os cabeçalhos de ferramentas, entrada no corte, texto no Design, prompts de pôster e os 135 comandos dos menus. Foram verificadas larguras de celular, tablet e computador e os dois temas. Os testes nativos repetem os fluxos anteriores de edição, desfazer/refazer, projetos, recuperação, ampliação e IA offline, além do novo teste de interface. Os resultados finais de compilação e teste ficam nos workflows do commit publicado.

Também foram executados os testes locais de tamanhos de imagem, planejamento de ampliação, 3.135 casos de recorte, cache do histórico de Design, matemática/máscaras do modelo de IA, transferência Android, recuperação Windows e padrões dos pôsteres. O padrão A4 2×2 permanece 410×584 mm, com sobreposição de 10 mm e as preferências aprovadas anteriormente.

## Referências de navegação

Foram consultadas as demonstrações em vídeo e transcrições oficiais [Noções básicas da interface do Photoshop](https://www.adobe.com/learn/photoshop/web/ps-basics-fundamentals) e [Editar partes de uma imagem no Photoshop para iPhone](https://www.adobe.com/learn/photoshop/web/edit-a-photo-photoshop-iphone), a [visão geral do Photoshop mobile](https://helpx.adobe.com/photoshop/mobile/get-set-up/learn-the-basics/workspace-overview.html) e as [orientações de layout do Canva](https://www.canva.dev/docs/apps/design-guidelines/layout/). A interface e os vetores são próprios; não foram copiados ativos desses aplicativos.

## Limites e comportamento preservado

Esta atualização organiza e apresenta as funções existentes. Não muda algoritmos de imagem, qualidade de exportação, fontes dos textos criados, arquivos de projeto, medidas de impressão ou cálculos de colagem. O painel de Design usa menos botões fixos no celular, e as demais opções passam a ser encontradas em Adicionar/Explorar. Algumas funções avançadas mantêm seus ícones Font Awesome locais. A aparência da barra de título do Windows e dos seletores nativos de arquivos depende do sistema operacional.
