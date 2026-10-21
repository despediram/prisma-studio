# Emenda sem pontilhado sobre a arte — 21/10/2026

O PDF anterior colocava o começo da tinta branca e o pontilhado exatamente no limite do núcleo visível da folha. Ao renderizar cada página separadamente, a suavização podia misturar esses elementos nos pixels imediatamente anteriores à emenda. Isso aparecia como um risquinho fino na montagem, mesmo sem uma faixa inteira de imagem faltando.

## Correção

- A arte agora continua por **até 1 mm** dentro da aba, repetindo a mesma imagem da próxima folha, na mesma escala e origem global. A proteção é limitada a um quarto da sobreposição em abas muito estreitas.
- A parte branca começa depois dessa proteção; o pontilhado é recuado mais 0,35 mm para dentro da região escondida. As legendas ficam nessa região.
- O passo entre folhas, o tamanho A4, os recortes de margem e o tamanho final **não mudam**. A faixa adicional fica coberta pela próxima folha.
- Para montar, faça a imagem repetida coincidir nas duas pontas e cubra completamente o pontilhado. O pontilhado identifica a área escondida; não é o limite onde a imagem deve terminar.
- O modo avançado de sobreposição mantém sua geometria anterior.

PDFs já baixados permanecem iguais. Para incorporar a proteção, reexporte a imagem no Prisma atualizado. A margem real da impressora continua precisando ser informada.

## Arquivos

| Arquivo | Motivo |
| --- | --- |
| `js/poster/poster-marks.js` | Separa o núcleo geométrico da área que recebe tinta branca; recua linhas e legendas. |
| `js/poster/poster-page.js` | Estende o recorte de arte pela proteção escondida, sem alterar a escala. |
| `js/poster/poster.js`, `poster-assembly.js` | Instruções coerentes com a faixa repetida e identificação no PDF. |
| `index.html` | Ajuda de montagem e atualização do cache dos scripts. |
| `testes/poster-seam.cjs` (novo) | PDFs reais marcados/limpos sobre cor uniforme para revelar qualquer guia vazando na emenda. |
| `testes/poster-bleed.cjs` | Acrescenta retrato com margem zero e confere a extensão protegida. |
| `testes/run.cjs`, `testes/README.md` | Incluem e documentam a regressão. |
| `POSTER-EMENDA.md`, `POSTER-SANGRIA.md`, `VALIDACAO.md` | Registram a mudança, substituindo a instrução antiga de alinhar à linha pontilhada. |

## Verificação

As cinco regressões de pôster (`poster-seam`, `poster-bleed`, `poster-safe`, `poster-marks`, `poster`) passaram por `file://`. Os PDFs reais marcados/limpos foram renderizados por PyMuPDF e compostos pelo algoritmo da mesa de montagem: **6.318.000 pixels iguais**, diferença máxima 0 e nenhum pixel branco indevido sobre o campo de cor contínua. Uma guia sobre a emenda seria visível nesse teste.

As regressões anteriores mantiveram 1.964.550 amostras idênticas entre pares de folhas e erro físico numérico máximo de 7,11 × 10⁻¹⁵ mm. A inspeção visual confirmou a faixa de segurança e o pontilhado dentro da parte coberta. Não houve impressão física nesta etapa.
