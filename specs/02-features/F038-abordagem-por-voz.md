# F038 — Abordagem por voz (ligação ou áudio)

## Status
Proposta — 2026-08-13

## Objetivo
Dar ao aluno, na aba **Abordagem** do Lead, um **roteiro falado** — pronto pra
ligar ou pra gravar um áudio de WhatsApp — gerado da mesma **Dor** que hoje
alimenta a Abordagem de texto ([F005](F005-abordagem-whatsapp.md)).

Hoje a única saída do Orion é texto frio no WhatsApp. Texto frio é o canal
mais fácil de ignorar: chega junto com todo o resto da caixa e não custa nada
pro dono do negócio deslizar pra cima. Voz custa atenção — e por isso responde
mais. O aluno já sabia disso; o produto é que não ajudava, porque na hora de
ligar ele ficava sem o que falar e voltava pro texto.

**A voz passa a ser o caminho recomendado da aba**, e o texto vira a
alternativa de baixo atrito logo abaixo.

## Decisão: canal novo (`ligacao`), não um `tipo` de WhatsApp

`Abordagem.canal` ganha o valor **`ligacao`**. A alternativa — gravar o roteiro
como `canal = whatsapp` — foi descartada: o artefato é diferente o bastante pra
não poder ser tratado igual.

- Um roteiro **não se envia**. Jogar o texto inteiro num `wa.me` pré-preenchido
  seria a ação errada oferecida com destaque.
- O histórico da aba precisa distinguir "o que eu já mandei escrito" de "o que
  eu falei" — são taxas de resposta diferentes, e é isso que o aluno vai querer
  comparar depois.
- `Abordagem.enviado` continua significando "eu fiz o contato", agora incluindo
  "eu liguei / mandei o áudio". A janela de follow-up da
  [F006](F006-follow-up-e-funil.md) não muda: conta do `enviado_em`, qualquer
  que seja o canal.

O `canal = email` continua **fora** do produto ([F035](F035-planos-e-limites.md),
"Saída da Abordagem por e-mail"): o valor do enum sobrevive no banco pelos
registros antigos, mas a Server Action rejeita `email` na entrada (AC7).

## Táticas do roteiro (embutidas no system prompt)
Codificado em `src/lib/abordagem/prompt-ligacao.ts`. Herda a disciplina da F005 —
especificidade, CTA único, honestidade — com o que **muda quando é falado**:

1. **Frase falada, não frase escrita.** Sem período longo, sem subordinada, sem
   "gostaria de", sem "estou entrando em contato". O aluno vai ler em voz alta;
   o que trava a língua no ensaio trava na ligação.
2. **Pedir licença nos 5 primeiros segundos.** "Tem um minuto?" antes de
   qualquer pitch. Numa ligação fria, o dono está no meio de outra coisa.
3. **O gancho é a Dor, dita como observação.** "Entrei no site de vocês pelo
   celular e ele demorou pra abrir" — não "identificamos oportunidades de
   melhoria na sua presença digital".
4. **Uma pergunta que devolve a palavra.** O roteiro tem que terminar em
   pergunta e **parar**. O silêncio depois é do outro lado.
5. **Mesmo CTA da F005:** a oferta de entrada (`BRAND.ofertaDeEntrada`), não
   uma reunião de uma hora.
6. **Curto o bastante pra caber num áudio:** ~30 a 40 segundos, ou seja
   **≤ ~90 palavras**.
7. **Sem rubrica de teatro.** A saída é só o que se fala — nada de
   "[pausa]", "(sorria)", "**Abertura:**". O aluno lê a tela e fala.
8. **Sem emoji** — a saída passa pelo mesmo `removerEmojis` da F005; num áudio
   um emoji lido em voz alta é ruído puro.

Quebras de linha separam os blocos de fala, e é só isso que estrutura o texto.

## Input (UI)
Aba **Abordagem** do Lead, primeiro card — em destaque visual (borda
`emerald`) e com a tag **"Mais eficiente"**.

| Campo     | Tipo   | Validação                                  |
|-----------|--------|--------------------------------------------|
| `lead_id` | string | obrigatório, cuid válido                   |
| `canal`   | enum   | `whatsapp` \| `ligacao` (default `whatsapp`) |
| `tipo`    | enum   | `primeira` \| `followup` (default `primeira`) |

A ordem dos cards codifica a recomendação: **voz primeiro, texto depois.**

## Saída (UI)
- O roteiro num campo de texto, com **Copiar roteiro**.
- **Sem** botão "Abrir no WhatsApp" — roteiro não é mensagem (`wa_link = null`
  sempre que `canal = ligacao`).
- **Marcar como enviada** continua disponível: é como o aluno registra que
  ligou ou mandou o áudio, e é o que alimenta o follow-up da F006.
- No histórico da aba, cada Abordagem mostra o rótulo do canal em PT
  ("Ligação ou áudio" / "WhatsApp") e só as ações que fazem sentido pra ele.

## Fluxo
1. Aluno clica em **Gerar roteiro de ligação** na aba Abordagem.
2. Server Action `gerarAbordagemAction({ lead_id, canal: "ligacao" })` — a mesma
   da F005, sem caminho novo de cota:
   1. Valida com Zod; `canal = email` → input inválido (AC7).
   2. Teto mensal do plano e cota diária da operação **`abordagem`** — voz e
      texto disputam o mesmo teto, porque custam o mesmo (uma geração).
   3. Sem Diagnóstico → `{ erro: "Diagnostique o Lead antes de gerar a
      Abordagem" }`, sem chamar o modelo e com a cota estornada.
   4. `gerarRoteiroLigacao(ctx, llm, tipo)` → `{ mensagem }`.
   5. Persiste `Abordagem { canal: "ligacao", assunto: null, enviado: false }`.
   6. Retorna `waLink: null`.
3. UI mostra o roteiro + **Copiar roteiro** + **Marcar como enviada**.

Gerar roteiro **não** muda o `status` do Lead — igual à F005.

## Critérios de aceitação
- [ ] **AC1** — Na aba Abordagem, o card de ligação/áudio aparece **acima** do
      de WhatsApp, com borda `emerald` e a tag "Mais eficiente".
- [ ] **AC2** — Gerar roteiro cria um `Abordagem` com `canal = ligacao`,
      `assunto = null`, `enviado = false`.
- [ ] **AC3** — O roteiro vem em PT-BR falado, ≤ ~90 palavras, terminando em
      pergunta, sem emoji e sem rubrica entre colchetes ou parênteses.
      (Validação manual na dashboard.)
- [ ] **AC4** — `canal = ligacao` → a UI **não** mostra "Abrir no WhatsApp",
      nem no resultado recém-gerado nem no histórico; mostra "Copiar roteiro".
- [ ] **AC5** — Lead sem Diagnóstico → `{ erro }` específico, sem chamada de
      modelo, sem `Abordagem` criada e com a cota diária estornada.
- [ ] **AC6** — Roteiro gerado conta no mesmo teto mensal e na mesma cota
      diária de `abordagem` que a Abordagem de texto.
- [ ] **AC7** — `canal = email` enviado direto pra Server Action → input
      inválido, sem `Abordagem` criada (mantém a F035 AC20).
- [ ] **AC8** — "Marcar como enviada" numa Abordagem de `canal = ligacao` grava
      `enviado_em` e entra na janela de follow-up da F006 como qualquer outra.

## Decisões de implementação
- `src/lib/abordagem/prompt-ligacao.ts` — system prompt do roteiro falado
  (playbook acima). Fonte única do tom de voz.
- `src/lib/abordagem/gerarAbordagem.ts` — `gerarRoteiroLigacao()`, mesmo
  `generateStructured` e mesmo `removerEmojis` da F005.
- `src/actions/leads/gerarAbordagem.ts` — o `canal` do Zod passa a
  `z.enum(["whatsapp", "ligacao"])`; o `waLink` só é montado no WhatsApp.
- `prisma/schema.prisma` — `enum Canal` ganha `ligacao`
  (`ALTER TYPE "Canal" ADD VALUE 'ligacao'`).
- `src/lib/abordagem/canais.ts` — rótulo em PT por canal, usado no histórico.

## Fora do escopo (F038)
- **Discagem, gravação ou envio pela plataforma.** O Orion escreve o roteiro; o
  aluno liga do próprio telefone e grava o áudio no próprio WhatsApp. Disparo
  automatizado continua proibido pela visão.
- Text-to-speech (gerar o áudio pronto). Áudio sintético em prospecção fria
  queima a confiança que a voz deveria comprar.
- Follow-up por voz (`tipo = followup` com `canal = ligacao`) na UI — o
  contrato já aceita, mas a aba só oferece a primeira abordagem por voz.
- Registro de resultado da ligação (atendeu / caixa postal / recusou). Vira
  qualificação de Lead, não de Abordagem.

## Custo estimado
Mesma ordem da F005 (~R$0,05 por geração) — o roteiro é mais curto que a soma
de primeira + follow-up de texto. Sem custo novo de infraestrutura: nenhuma
lib nova, nenhum provedor novo, nenhum ADR.
