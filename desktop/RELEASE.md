Prisma Studio **0.1.1** para **Windows 10/11 de 64 bits**.

Correção desta versão: o botão **Melhorar → Ampliar imagem** deixa de bloquear saídas acima de 100 MP. Uma imagem de 4208 × 5980 px agora permite selecionar 2× (8416 × 11960 px, cerca de 100,7 MP) e fatores maiores. O aviso de consumo de memória é informativo; a capacidade real continua dependendo do computador. O motor e os cálculos dos pôsteres são preservados.

Baixe o arquivo **Prisma-Studio-…-Windows-x64-Setup.exe**, execute o instalador e abra o atalho Prisma Studio. Não é necessário instalar Node.js ou abrir um terminal.

- Editor de imagens, Design/convites e Pôsteres em várias folhas, com os mesmos arquivos e cálculos do site.
- Menus do Windows, arquivos recentes, salvar projeto, salvar como e exportação com escolha da pasta.
- Recuperação automática em disco a cada minuto de alterações, quando não há edição em andamento; mantém duas cópias de cada área. Use Arquivo → Recuperar trabalho após uma interrupção.
- Camadas, máscaras e ajustes de Luz/Cor nos projetos `.prisma`; páginas e objetos no `.prismadesign`.
- Motor do ampliador incluído. Modelos de IA são carregados pelo usuário ou baixados com a autorização na interface; não acompanham o instalador. O modo rápido funciona offline.

Esta primeira versão compartilha o motor Canvas/WebGL/ONNX do site: não altera os cálculos dos pôsteres e não promete memória ilimitada ou uma GPU nativa nova. A escala física da impressão depende também da impressora.

O instalador ainda não possui assinatura comercial de código. Confira que o download veio deste repositório. Desinstalar preserva os projetos e cópias locais de recuperação.
