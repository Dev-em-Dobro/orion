# F005 — Outreach de WhatsApp via Claude

## Status
Proposta — 2026-06-12

## Objetivo
Gerar, para um Lead, uma **Outreach** de WhatsApp pronta pra enviar —
personalizada na **Dor** concreta detectada no Diagnóstico e ancorada na
sua oferta de entrada (configurada em `src/lib/brand.ts`; por padrão, um
diagnóstico gratuito). Persistir como
`Outreach` (`canal = whatsapp`, `enviado = false`) e oferecer um link
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
O que move a taxa de fechamento — codificado em `src/lib/outreach/prompt.ts`:

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
8. **Mirar quem vale (F003).** Gerar Outreach preferencialmente para Leads
   `priorizado` de alto score — concentra esforço em quem tem Dor e verba.
9. **Mensurar e aprender.** `Outreach.enviado` + `Lead.status` (`contatado`/
   `respondeu`) fecham o loop pra saber o que converte.

## Input (UI)
Botão **Gerar Outreach** em cada linha de `/leads` (habilitado quando o Lead
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
1. Operador clica em **Gerar Outreach** na linha do Lead.
2. Server Action `gerarOutreach({ lead_id })`:
   1. Valida com Zod. Lead inexistente → `{ erro: "Lead não encontrado" }`.
   2. `ANTHROPIC_API_KEY` ausente → `{ erro: "ANTHROPIC_API_KEY não configurada" }`
      antes de qualquer chamada.
   3. Carrega o Lead + último Diagnóstico (`take: 1`, `executado_em desc`).
      Sem Diagnóstico → `{ erro: "Diagnostique o Lead antes de gerar a Outreach" }`.
   4. Deriva as **dores detectadas** (texto natural) do último Diagnóstico —
      até a F004 existir, lê o Diagnóstico direto (mesmos fatos das Dores):
      - sem website OU `tem_site = false` → "não tem site / presença própria"
      - `performance_mobile` não-nulo e `< 50` → "site muito lento no celular (nota N/100)"
      - `tem_https = false` → "site sem HTTPS (sem cadeado de segurança)"
      - nenhuma das acima → foco no valor central (captar/atender automático)
   5. Chama `src/lib/outreach/gerarOutreach({ nome, categoria, endereco,
      dores })` → `{ mensagem }` (Claude API, structured output — ver
      [contrato](../03-contracts/claude-messages.md)).
   6. Persiste `Outreach { lead_id, canal: "whatsapp", conteudo: mensagem,
      enviado: false }` (novo registro — N Outreaches por Lead).
   7. Monta o link `wa.me` (normaliza `telefone` p/ dígitos, prefixo `55`;
      `null` se sem telefone) e retorna `{ mensagem, wa_link }`.
3. UI mostra a mensagem + o link, e revalida `/leads`.

Gerar Outreach **não** muda o `status` — a transição para `contatado` ocorre
no envio manual (fora do escopo desta feature).

## Critérios de aceitação
- [ ] **AC1** — Lead com Diagnóstico `tem_site = false` gera uma Outreach que
      cita "não ter site/presença" e convida pro diagnóstico gratuito; um
      registro `Outreach` é criado com `canal = whatsapp`, `enviado = false`.
- [ ] **AC2** — Lead com site lento (`performance_mobile < 50`) gera mensagem
      que cita a lentidão no celular.
- [ ] **AC3** — Lead sem nenhum Diagnóstico → `{ erro }` específico, sem
      chamar a Claude API nem criar Outreach.
- [ ] **AC4** — `ANTHROPIC_API_KEY` ausente → `{ erro }` descritivo, sem
      chamada externa.
- [ ] **AC5** — Lead com `telefone` → `wa_link` no formato
      `https://wa.me/55XXXXXXXXXXX?text=...` com a mensagem URL-encodada;
      Lead sem telefone → `wa_link = null` e a UI mostra só o texto.
- [ ] **AC6** — A mensagem vem em PT-BR, ≤ ~70 palavras, sem "Prezado",
      com um único CTA. (Validação manual na dashboard.)
- [ ] **AC7** — Gerar duas vezes cria **dois** registros `Outreach` (histórico
      preservado, 1 Lead — N Outreaches). O `status` do Lead não muda.
- [ ] **AC8** — `lead_id` inválido (Zod) ou inexistente → `{ erro }` na UI,
      sem efeitos colaterais.
- [ ] **AC9** — Falha da Claude API (429/5xx/refusal → `parsed_output` nulo) →
      `{ erro }` na UI, sem criar Outreach, sem quebrar a app.

## Decisões de implementação
- `src/lib/outreach/prompt.ts` — system prompt (playbook acima) + builder do
  contexto do Lead. Fonte única da estratégia de mensagem.
- `src/lib/outreach/gerarOutreach.ts` — cliente Claude via SDK, structured
  output; lança `OutreachError`. Sem dep de Next.
- `src/actions/leads/gerarOutreach.ts` — Server Action fina; orquestra
  `lib/outreach` + Prisma; monta o `wa.me`.
- `src/app/leads/gerar-outreach-button.tsx` — botão + render da mensagem e do
  link, no padrão de `diagnosticar-button.tsx`.
- Lib nova `@anthropic-ai/sdk` → ver [ADR-005](../04-decisions/ADR-005-anthropic-sdk-outreach.md).

## Fora do escopo (F005)
- **Marcar Outreach como enviada / transicionar Lead p/ `contatado`** → F006
  (fecha o loop de mensuração). Sem isso o funil não avança automaticamente.
- Envio automático (disparo via API de WhatsApp) — a visão proíbe disparo sem
  consentimento; envio é manual.
- Outreach por e-mail (`canal = email`) — esta feature é só WhatsApp.
- Reescrita/variações A/B de uma Outreach existente.
- Geração em lote ("gerar pra todos os priorizados") — conflita com a
  guideline síncrona.
- Uso de Dores persistidas ([F004](F004-deteccao-de-dor.md)) — consumers leem
  `Lead.dores.detalhes` após o Diagnóstico.

## Custo estimado
~R$0,05 por Outreach (Opus 4.8) — ver [contrato](../03-contracts/claude-messages.md).
A ~100/mês ≈ **R$5/mês**, dentro do teto da visão.
