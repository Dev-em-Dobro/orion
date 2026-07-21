# F006 — Fechar o loop: envio, funil e follow-up

## Status
Proposta — 2026-06-12

## Objetivo
Fazer o funil **avançar e ser medido** depois da Outreach gerada (F005). Três
capacidades:
1. **Marcar Outreach como enviada** → `Outreach.enviado = true` + `enviado_em`,
   e promove o Lead `priorizado/enriquecido → contatado`.
2. **Registrar o desfecho** → Lead `respondeu` / `ganho` / `perdido`.
3. **Fila de follow-up** → Leads `contatado` há **+3 dias** sem desfecho, com
   geração de uma mensagem de **follow-up** (2º toque).

Sem a F006 o funil para em "Outreach gerada": não se sabe o que foi enviado,
não há follow-up (onde mora a maior parte das respostas) e não se aprende o que
converte. É a feature que transforma a ferramenta de "gerador de mensagem" em
"motor de prospecção mensurável".

## Por que follow-up
Na prospecção fria, **a maioria das respostas vem do 2º–4º toque**, não do 1º.
Uma fila que cobra o follow-up no tempo certo é o maior alavancador de
fechamento que existe nesta fase — e exige zero infra nova (é lista filtrada +
geração síncrona, dentro do ADR-002).

## Conceitos
- **`Outreach.enviado_em`** (novo campo — ver [domain model](../01-domain-model.md)):
  timestamp de quando a Outreach foi marcada como enviada. Base da janela.
- **Aguardando resposta**: Lead com `status = contatado` (ainda não
  `respondeu/ganho/perdido`).
- **Janela de follow-up**: `FOLLOWUP_DIAS = 3` (constante). Um Lead entra na fila
  quando está `contatado` **e** a **última Outreach enviada** tem `enviado_em`
  há **≥ 3 dias**. Marcar um follow-up como enviado reinicia a janela.

## Transições de status (resumo)
| Ação                      | De                         | Para        |
|---------------------------|----------------------------|-------------|
| Marcar Outreach enviada   | `priorizado`/`enriquecido` | `contatado` |
| Marcar Outreach enviada   | qualquer outro             | (inalterado)|
| Registrar desfecho        | `contatado`/`respondeu`    | `respondeu`/`ganho`/`perdido` |

Marcar enviada **nunca regride** o funil (ex.: um follow-up enviado num Lead já
`contatado` só atualiza `enviado_em`).

## UI
Na página `/leads`:
- **Painel "Follow-up pendente (N)"** acima da tabela: lista os Leads na janela,
  com "N dias sem resposta" e um botão **Gerar follow-up**.
- Na área de ações de cada linha:
  - Resultado da Outreach (F005) ganha um botão **Marcar como enviada**.
  - Botões de desfecho **Respondeu / Ganho / Perdido** quando o Lead está
    `contatado` ou `respondeu`.

A mensagem de follow-up usa o mesmo fluxo da F005 (texto + link
`api.whatsapp.com/send` + **Marcar como enviada**), mas com prompt próprio
(2º toque). Mesmas regras de tom da F005: **sem emojis**.

## Fluxo
### Marcar enviada — `marcarEnviado({ outreach_id })`
1. Valida (Zod). Outreach inexistente → `{ erro }`.
2. `update Outreach`: `enviado = true`, `enviado_em = now`.
3. Se o Lead está `priorizado` ou `enriquecido` → `contatado` (senão inalterado).
4. `revalidatePath('/leads')`.

### Registrar desfecho — `registrarDesfecho({ lead_id, desfecho })`
1. Valida (Zod): `desfecho ∈ {respondeu, ganho, perdido}`. Lead inexistente → `{ erro }`.
2. `update Lead.status = desfecho`.
3. `revalidatePath('/leads')`.

### Gerar follow-up
Reusa a Server Action da F005 com `tipo = "followup"` — gera novo `Outreach`
(`canal = whatsapp`, `enviado = false`) com o **prompt de follow-up** (mais
curto, leve, sem cobrança, **sem emoji**, retoma o gancho e re-oferece o
diagnóstico gratuito).
Não muda status; o avanço ocorre ao marcar enviada.

## Critérios de aceitação
- [ ] **AC1** — Marcar uma Outreach como enviada seta `enviado = true` e
      `enviado_em`; Lead `priorizado` vira `contatado`.
- [ ] **AC2** — Marcar enviada num Lead já `contatado`/`respondeu`/`ganho` **não**
      altera o status (só atualiza `enviado_em`).
- [ ] **AC3** — Registrar `ganho`/`perdido`/`respondeu` muda o `status` do Lead
      conforme o botão.
- [ ] **AC4** — Um Lead `contatado` cuja última Outreach enviada tem `enviado_em`
      há ≥ 3 dias aparece no painel "Follow-up pendente"; com < 3 dias, não.
- [ ] **AC5** — Lead `respondeu`/`ganho`/`perdido` **não** aparece no painel de
      follow-up (saiu da janela).
- [ ] **AC6** — Gerar follow-up cria um novo `Outreach` com texto distinto do 1º
      toque (prompt de follow-up), sem mudar o status do Lead.
- [ ] **AC7** — Marcar o follow-up como enviado atualiza `enviado_em` e tira o
      Lead da fila (reinicia a janela).
- [ ] **AC8** — Inputs inválidos (Zod) ou ids inexistentes → `{ erro }` na UI,
      sem efeitos colaterais.

## Decisões de implementação
- `Outreach.enviado_em DateTime?` no schema (migração própria).
- `src/actions/leads/marcarEnviado.ts` e `registrarDesfecho.ts` — finas.
- F005 (`gerarOutreachAction`) ganha um parâmetro `tipo` (`primeira | followup`);
  `src/lib/outreach/prompt.ts` ganha o `SYSTEM_PROMPT_FOLLOWUP`.
- Painel e botões em `src/app/leads/` no padrão dos botões existentes.
- Janela de follow-up calculada no server component a partir da última Outreach
  enviada (`enviado_em desc, take: 1`). `FOLLOWUP_DIAS = 3`.

## Fora do escopo (F006)
- Lembrete/agendamento automático de follow-up (e-mail, push) — esbarra no
  ADR-002 (sem jobs); a fila é consultada quando o operador abre a dashboard.
- Limite de nº de follow-ups por Lead / cadência multi-toque elaborada — v1 é
  "está na janela → pode cobrar".
- Métricas históricas de conversão (taxa por nicho/Dor) — F-analytics futura.
- Outreach por e-mail.

## Custo estimado
Marcar enviada e desfecho: $0 (só banco). Follow-up: ~R$0,05 (uma geração
Claude, igual à F005).
