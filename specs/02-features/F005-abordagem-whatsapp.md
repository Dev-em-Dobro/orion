# F005 — Abordagem de WhatsApp via Claude

## Status
Proposta — 2026-06-12

## Objetivo
Gerar, para um Lead, uma **Abordagem** de WhatsApp pronta pra enviar —
personalizada na **Dor** concreta detectada no Diagnóstico e ancorada na
sua oferta de entrada (configurada em `src/lib/brand.ts`; por padrão, um
diagnóstico gratuito). Persistir como
`Abordagem` (`canal = whatsapp`, `enviado = false`) e oferecer um link
`wa.me` pré-preenchido pro operador disparar com um clique.

É o último passo antes do envio manual. Sem F005, o Lead priorizado não vira
contato.

## Sobre a oferta (fonte da mensagem)
A oferta é configurável em `src/lib/brand.ts` (`BRAND.empresa`,
`descricaoEmpresa`, `ofertaDeEntrada`, `propostaDeValor`) — o prompt lê
dali, sem editar código. A mensagem **faz a ponte** da Dor detectada → o
que a sua empresa resolve (`BRAND.propostaDeValor`), e convida pra sua
oferta de entrada (`BRAND.ofertaDeEntrada`; por padrão, um diagnóstico
gratuito, que casa com o nosso próprio conceito de Diagnóstico). Se usar
prova social, no máximo um número forte — e verdadeiro. Ajuste o
`brand.ts` quando a oferta mudar.

## Táticas de conversão (embutidas no system prompt)
O que move a taxa de fechamento — codificado em `src/lib/abordagem/prompt.ts`:

1. **Especificidade > genérico.** Abrir com a observação concreta do
   Diagnóstico ("vi que vocês não têm site / o site abre devagar no celular").
   Mensagem genérica é ignorada.
2. **Dar antes de pedir (reciprocidade).** O gancho é o **diagnóstico
   gratuito**, não um pedido de reunião de 1h. Baixo atrito.
3. **CTA único e fácil.** Uma pergunta de sim/não ("posso te mandar um
   diagnóstico rápido?"), nunca múltiplos pedidos.
4. **Prova social proporcional.** No máximo **um** número forte, quando
   couber — não um currículo.
5. **Brevidade.** WhatsApp: **≤ ~70 palavras**, 3–5 frases.
6. **Sem cara de massa.** PT-BR coloquial, sem "Prezado", usa o nome do
   negócio, varia a abertura. **Sem emojis** — texto só (profissionalismo +
   evita quebra de encode em click-to-chat).
7. **Honestidade.** Não inventar dados que não temos sobre o Lead; não
   prometer resultado garantido.
8. **Mirar quem vale (F003).** Gerar Abordagem preferencialmente para Leads
   `priorizado` de alto score — concentra esforço em quem tem Dor e verba.
9. **Mensurar e aprender.** `Abordagem.enviado` + `Lead.status` (`contatado`/
   `respondeu`) fecham o loop pra saber o que converte.

## Emenda 2026-08-16 — a Abordagem sai da IA

A mensagem passa a ser **montada em código**, por combinação de variantes.
Vale para os três textos que a Action produz: primeira, follow-up
([F006](F006-follow-up-e-funil.md)) e roteiro de ligação
([F038](F038-abordagem-por-voz.md)).

**As nove táticas acima continuam valendo** — elas deixam de ser instrução de
prompt e passam a ser **estrutura do montador**. A diferença é que instrução de
prompt é pedido (e o modelo às vezes ignora: a regra "sem emoji" precisou de um
`removerEmojis` de reforço), enquanto estrutura é garantia. O limite de palavras,
o CTA único e a ausência de emoji passam a ser **verificáveis por teste**, o que
nenhum deles era.

### O risco que isto cria, e como ele é tratado

A tática 6 — *"sem cara de massa: varia a abertura"* — é a única que um template
ingênuo destrói. Com 6 `TipoDor` e um texto fixo por Dor, todo dentista com site
lento receberia a **mesma mensagem, byte por byte**. Isso é exatamente o que a
tática existe pra evitar, e é o motivo de a Abordagem ser um caso mais difícil
que a Proposta (que vai pra um cliente só — ver [F012](F012-gerador-de-proposta.md)).

**Mitigação: rotação determinística de variantes.** A mensagem é montada de
slots independentes, cada um com um pool próprio:

```
[abertura por TipoDor] + [ponte] + [CTA] (+ [linha do demo, F038])
```

O índice de cada slot sai de um **hash do `lead_id`**, com deslocamento
diferente por slot — então os slots variam de forma independente, e o mesmo
Lead sempre gera o mesmo texto (determinismo, sem `Math.random()`, testável).

Espaço resultante: **4 aberturas × 3 pontes × 3 CTAs = 36 mensagens distintas
por Dor**, 216 no total.

### O que a rotação resolve e o que ela não resolve

Honestidade sobre o alcance, porque 216 é um número finito:

- **Resolve o caso que importa:** cada negócio recebe **uma** abordagem. O
  destinatário não tem com o que comparar. E o follow-up é semeado com
  deslocamento em relação à primeira, então **nunca** repete o texto anterior
  pro mesmo Lead — que era a única repetição garantida no desenho antigo.
- **Não resolve a colisão entre alunos.** Dois alunos prospectando a mesma
  cidade têm `lead_id` diferentes para o mesmo negócio, logo sorteiam
  independentemente: a chance de o mesmo dono receber o mesmo texto duas vezes é
  de **1 em 36**. Com a base de alunos crescendo, cresce junto.
- **Não substitui revisão de copy.** Os 216 textos são escritos à mão uma vez.
  Se convertem pior que os gerados, o conserto é editar `frases.ts` — o que é
  mais barato e mais auditável que ajustar um prompt e torcer.

Se a colisão entre alunos virar problema medido (e não suposto), o caminho é
ampliar os pools, não voltar a IA: dobrar as aberturas leva o espaço a 432 e
custa a escrita de 6 frases.

### Critérios de aceitação da emenda

- [ ] **AC10** — Gerar Abordagem **não** faz chamada de LLM: nenhuma chave de
      provedor é lida, e a Action funciona com a API do provedor fora do ar.
- [ ] **AC11** — Determinismo: o mesmo Lead gera a mesma mensagem em duas
      execuções. Leads diferentes com a **mesma** Dor geram mensagens
      diferentes sempre que caírem em índices diferentes.
- [ ] **AC12** — O follow-up do mesmo Lead **nunca** é igual à primeira
      mensagem.
- [ ] **AC13** — A mensagem respeita o teto de palavras por tipo (primeira
      ≤70, follow-up ≤45) — testado sobre **todas** as combinações do pool, não
      por amostra.
- [ ] **AC14** — Nenhuma combinação do pool contém emoji ou símbolo decorativo.
- [ ] **AC15** — Sem Dor detectada, a mensagem usa a abertura neutra (valor de
      captar/atender) e **não inventa** problema — o mesmo contrato do prompt
      antigo.
- [ ] **AC16** — A URL do demo (F038) só aparece quando `demoUrl` existe, colada
      exatamente como veio e em linha própria no fim; sem demo, nenhuma linha e
      nenhuma promessa de enviar depois.
- [ ] **AC17** — A Abordagem **não tem teto de plano**: gerar não chama
      `verificarLimiteMensal` nem `consumirMensal`, e o follow-up também não.
      Ver [F035](F035-planos-e-limites.md#por-que-a-abordagem-não-tem-teto-2026-08-16)
      — o teto de 150/mês contradizia os 300 Leads do Pro, e com o follow-up
      consumindo a mesma cota dava 75 Leads trabalhados de 300 comprados.

## Input (UI)
Botão **Gerar Abordagem** em cada linha de `/leads` (habilitado quando o Lead
tem ao menos um Diagnóstico — sem Diagnóstico não há Dor concreta pra citar).

| Campo     | Tipo   | Validação                |
|-----------|--------|--------------------------|
| `lead_id` | string | obrigatório, cuid válido |

## Saída (UI)
- A **mensagem** gerada num campo de texto (editável/copiável).
- Um botão **Abrir no WhatsApp**
  (`https://api.whatsapp.com/send?phone=<tel>&text=<msg>`) quando o
  Lead tem `telefone`; senão, só o texto pra copiar.

## Fluxo
1. Operador clica em **Gerar Abordagem** na linha do Lead.
2. Server Action `gerarAbordagem({ lead_id })`:
   1. Valida com Zod. Lead inexistente → `{ erro: "Lead não encontrado" }`.
   2. `ANTHROPIC_API_KEY` ausente → `{ erro: "ANTHROPIC_API_KEY não configurada" }`
      antes de qualquer chamada.
   3. Carrega o Lead + último Diagnóstico (`take: 1`, `executado_em desc`).
      Sem Diagnóstico → `{ erro: "Diagnostique o Lead antes de gerar a Abordagem" }`.
   4. Deriva as **dores detectadas** (texto natural) do último Diagnóstico —
      até a F004 existir, lê o Diagnóstico direto (mesmos fatos das Dores):
      - sem website OU `tem_site = false` → "não tem site / presença própria"
      - `performance_mobile` não-nulo e `< 50` → "site muito lento no celular (nota N/100)"
      - `tem_https = false` → "site sem HTTPS (sem cadeado de segurança)"
      - nenhuma das acima → foco no valor central (captar/atender automático)
   5. Chama `src/lib/abordagem/gerarAbordagem({ nome, categoria, endereco,
      dores })` → `{ mensagem }` (Claude API, structured output — ver
      [contrato](../03-contracts/claude-messages.md)).
   6. Persiste `Abordagem { lead_id, canal: "whatsapp", conteudo: mensagem,
      enviado: false }` (novo registro — N Abordagens por Lead).
   7. Monta o link `wa.me` (normaliza `telefone` p/ dígitos, prefixo `55`;
      `null` se sem telefone) e retorna `{ mensagem, wa_link }`.
3. UI mostra a mensagem + o link, e revalida `/leads`.

Gerar Abordagem **não** muda o `status` — a transição para `contatado` ocorre
no envio manual (fora do escopo desta feature).

## Critérios de aceitação
- [ ] **AC1** — Lead com Diagnóstico `tem_site = false` gera uma Abordagem que
      cita "não ter site/presença" e convida pro diagnóstico gratuito; um
      registro `Abordagem` é criado com `canal = whatsapp`, `enviado = false`.
- [ ] **AC2** — Lead com site lento (`performance_mobile < 50`) gera mensagem
      que cita a lentidão no celular.
- [ ] **AC3** — Lead sem nenhum Diagnóstico → `{ erro }` específico, sem
      chamar a Claude API nem criar Abordagem.
- [ ] **AC4** — `ANTHROPIC_API_KEY` ausente → `{ erro }` descritivo, sem
      chamada externa.
- [ ] **AC5** — Lead com `telefone` → `wa_link` no formato
      `https://wa.me/55XXXXXXXXXXX?text=...` com a mensagem URL-encodada;
      Lead sem telefone → `wa_link = null` e a UI mostra só o texto.
- [ ] **AC6** — A mensagem vem em PT-BR, ≤ ~70 palavras, sem "Prezado",
      com um único CTA. (Validação manual na dashboard.)
- [ ] **AC7** — Gerar duas vezes cria **dois** registros `Abordagem` (histórico
      preservado, 1 Lead — N Abordagens). O `status` do Lead não muda.
- [ ] **AC8** — `lead_id` inválido (Zod) ou inexistente → `{ erro }` na UI,
      sem efeitos colaterais.
- [ ] **AC9** — Falha da Claude API (429/5xx/refusal → `parsed_output` nulo) →
      `{ erro }` na UI, sem criar Abordagem, sem quebrar a app.

## Decisões de implementação
- `src/lib/abordagem/prompt.ts` — system prompt (playbook acima) + builder do
  contexto do Lead. Fonte única da estratégia de mensagem.
- `src/lib/abordagem/gerarAbordagem.ts` — cliente Claude via SDK, structured
  output; lança `AbordagemError`. Sem dep de Next.
- `src/actions/leads/gerarAbordagem.ts` — Server Action fina; orquestra
  `lib/abordagem` + Prisma; monta o `wa.me`.
- `src/app/leads/gerar-abordagem-button.tsx` — botão + render da mensagem e do
  link, no padrão de `diagnosticar-button.tsx`.
- Lib nova `@anthropic-ai/sdk` → ver [ADR-005](../04-decisions/ADR-005-anthropic-sdk-abordagem.md).

## Fora do escopo (F005)
- **Marcar Abordagem como enviada / transicionar Lead p/ `contatado`** → F006
  (fecha o loop de mensuração). Sem isso o funil não avança automaticamente.
- Envio automático (disparo via API de WhatsApp) — a visão proíbe disparo sem
  consentimento; envio é manual.
- Abordagem por e-mail (`canal = email`) — esta feature é só WhatsApp.
- Reescrita/variações A/B de uma Abordagem existente.
- Geração em lote ("gerar pra todos os priorizados") — conflita com a
  guideline síncrona.
- Uso de Dores persistidas ([F004](F004-deteccao-de-dor.md)) — consumers leem
  `Lead.dores.detalhes` após o Diagnóstico.

## Custo estimado

**$0** — a Abordagem é montada em código desde a emenda de 2026-08-16. Não há
chamada de LLM.

Era a maior linha de IA do produto: R$0,04 × 150/mês no Pro = **R$6,60**, ou 66%
de todo o custo de LLM de um aluno no teto. Ver
[11 §4](../11-custos-e-precificacao.md#4-custo-por-alunomês).
