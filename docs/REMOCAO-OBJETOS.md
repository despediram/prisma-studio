# Remoção de objetos em desenvolvimento

Base revisada: 4292332, visual publicado Windows 0.1.6 / Android 0.1.5.
O trabalho anterior continha apenas js/core/inpaint-texture.js e seu teste, não rastreados.

No Editor, abra o Corretor e escolha Remover objetos. Pinte o objeto inteiro; ao soltar, abre a prévia com comparação ao original, Aplicar e Cancelar. Cancelar encerra o worker. Aplicar cria uma entrada no histórico existente, permitindo desfazer/refazer. Uma prévia é descartada se o documento ou camada mudar durante o processamento.

O motor usa exemplos do fundo disponível para transferir texturas na resolução original. Não usa modelo generativo, rede ou desfoque. Não garante reconstrução semanticamente correta em objetos grandes ou cenas complexas. O resultado requer conferência visual.

Validações executadas: testes/inpaint-texture.cjs, testes/object-removal.cjs, testes/poster-defaults.cjs e desktop/testes.cjs. A validação com Chromium 133 foi executada em file:// com rede bloqueada para as novas funções: 320×720, 390×844, 412×915, 780×390 e 1440×900. Verificados controles reais, toque, seleção, undo/redo, worker de reconstrução, cancelar durante processamento e após prévia, aplicar e histórico. O teste do motor também cobre análise reduzida de uma imagem de 1,4 MP. Capturas inspecionadas visualmente.

Correções de feedback móvel: painel do editor compacto e rolável; limite de expansão baseado na área útil; canvas continua interativo com o painel aberto; seleção ativa indicada e removível; opções abertas após ativação de ferramentas. Luz local processa blocos de 256 px em vez de copiar/filtrar toda a imagem ao iniciar um traço. Seleção transitória e traço são cancelados ao trocar de ferramenta. O teste antigo da barra foi alinhado ao controle de destaque oculto no celular.

Na comparação com a versão publicada em 390×844, a altura da prévia com Ajustes aberto passou de 97,64 para 215,81 px. O painel passou de 371,36 para 253,19 px.

Pendentes: validação no aparelho Android físico e compilação/assinatura dos instaladores. Testes de navegador emulado não substituem teste no aparelho. Envio da branch de desenvolvimento ao GitHub e verificação automática autorizados pelo usuário. A publicação de instaladores ainda está pendente.

Nenhuma alteração nos cálculos, padrões ou arquivos dos pôsteres. Nenhuma versão de aplicativo, release ou deploy foi publicada por esta implementação.

Regressões executadas e aprovadas individualmente: image-size, upscale-plan, poster-sheet, poster-phone, history, paint, preview, toolbar, regression, poster, poster-marks, poster-safe, poster-bleed, poster-seam, design e studio-upgrade. Navegação Atelier aprovada em 390 e 1440 px. Dois seletores antigos de fechamento de painel e a expectativa de destaque da barra no celular foram atualizados para a interface já existente. Teste de Luz local em 24 MP confirmou alocação de quatro blocos e ausência de snapshot/camada/efeito integrais no início do traço.
