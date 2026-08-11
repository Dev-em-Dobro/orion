# F031 — Central de Tarefas (o Orion cobra o que ficou parado)

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase C)

## Objetivo
Fazer o Orion **cobrar** o aluno. Hoje o funil só anda se ele lembrar: abordou
um Lead na terça, esqueceu, e o Lead morre sem follow-up — que é onde mora a
maior parte das respostas ([F006](F006-follow-up-e-funil.md)).

O pedido que originou a feature: *"se eu abordei um cliente e não marquei que
ele respondeu em 12h, o Orion me avisa pra mandar um follow-up."*

A F031 generaliza isso: um lugar único que responde **"o que eu preciso fazer
agora"**, ordenado por atraso.

## Decisão: in-app, sem cron
Decidido em 2026-08-10 (ver [revamp §4](../10-revamp-do-fluxo.md#4-decisões-desta-rodada)):
as Tarefas são **derivadas do banco quando o aluno abre o app**. Sem job
agendado, sem e-mail, sem push — o
[ADR-002](../04-decisions/ADR-002-sem-workers-fase-1.md) continua de pé.

**A limitação, dita na cara:** o Orion cobra quem entra. Não puxa de volta quem
sumiu. Quando quisermos alcançar quem não abriu o app, aí sim entra job
agendado + e-mail — e isso exige revogar parte do ADR-002 num ADR próprio.

## Conceitos

### Tarefa (novo conceito derivado — **não é tabela**)
Pendência calculada a partir do estado atual: um Lead, um tipo, um prazo
estourado e uma ação primária. Some sozinha quando o aluno resolve o que ela
cobra.

> **Colisão de nome:** a branch não mergeada `feature/F021-pipeline` usa
> "Tarefa" para item de checklist do playbook. Se a F021 for retomada, aquele
> conceito passa a se chamar **"Passo do playbook"** — "Tarefa" no Orion é a
> cobrança da F031 ([revamp §7](../10-revamp-do-fluxo.md#7-trabalho-anterior-não-mergeado-referência)).

### Os 6 tipos da v1

| Tipo | Dispara quando | Prazo | Ação primária |
|------|----------------|-------|---------------|
| `CONFIRMAR_RESPOSTA` | Lead `contatado`, última Outreach enviada há ≥ **12h**, sem desfecho registrado | 12h | Respondeu? / Ainda não |
| `MANDAR_FOLLOWUP` | Lead `contatado` sem desfecho, última Outreach enviada há ≥ **3 dias** (`FOLLOWUP_DIAS`, F006) | 3d | Gerar follow-up |
| `ENVIAR_ABORDAGEM` | Lead `priorizado` com Outreach gerada **não enviada** há ≥ **24h** | 24h | Abrir WhatsApp / e-mail · Marcar enviada |
| `AVANCAR_RESPONDEU` | Lead `respondeu` parado (`status_em`) há ≥ **2 dias** | 2d | Qualificar · Gerar proposta ([F012](F012-gerador-de-proposta.md)) |
| `COBRAR_PROPOSTA` | Lead `proposta` parado há ≥ **3 dias** | 3d | Gerar follow-up de proposta |
| `APROFUNDAR_FILA` | Existem Leads com score **estimado** ≥ 60 e sem Diagnóstico ([F025](F025-fila-do-dia.md)) | — | Aprofundar próximos 10 |

Regras que evitam ruído:
- `CONFIRMAR_RESPOSTA` e `MANDAR_FOLLOWUP` são **excludentes**: passados 3 dias,
  a de 12h dá lugar à de follow-up (não empilha duas cobranças do mesmo Lead).
- Lead `descartado` ([F024](F024-estado-do-lead-reversivel.md)), `ganho` ou
  `perdido` **nunca** gera Tarefa.
- `APROFUNDAR_FILA` é **uma só** (agregada), não uma por Lead.
- Todos os prazos ficam em `src/lib/tarefas/regras.ts` como constantes
  nomeadas — mudá-los é editar esta spec antes.

### Atraso e ordenação
`atraso = agora − (marco + prazo)`. A lista ordena por `atraso desc`: o mais
esquecido no topo. Faixas na UI: **Atrasada** (> 2× o prazo), **Vencida**
(passou do prazo), **Pra hoje** (vence em < 6h).

### Adiar e dispensar (a única parte persistida)
- **Adiar** — sai da lista até `adiada_ate` (1 dia por padrão).
- **Dispensar** — some **enquanto o fato não mudar**. O adiamento guarda o
  `marco` (o timestamp que originou a Tarefa: `enviado_em` ou `status_em`); se
  o marco mudar — nova Outreach enviada, status alterado — a Tarefa **volta**.
  Sem isso, dispensar viraria silêncio permanente.

## Modelo de dados
```prisma
enum TipoTarefa {
  CONFIRMAR_RESPOSTA
  MANDAR_FOLLOWUP
  ENVIAR_ABORDAGEM
  AVANCAR_RESPONDEU
  COBRAR_PROPOSTA
  APROFUNDAR_FILA
}

model TarefaAdiamento {
  id            String     @id @default(cuid())
  user_id       String
  lead_id       String?    // null em tarefas agregadas (APROFUNDAR_FILA)
  tipo          TipoTarefa
  marco         DateTime   // timestamp do fato que originou a Tarefa
  adiada_ate    DateTime?  // preenchido no "Adiar"
  dispensada_em DateTime?  // preenchido no "Dispensar"
  created_at    DateTime   @default(now())

  user User  @relation(fields: [user_id], references: [id], onDelete: Cascade)
  lead Lead? @relation(fields: [lead_id], references: [id], onDelete: Cascade)

  @@unique([user_id, lead_id, tipo])
  @@index([user_id])
  @@map("tarefa_adiamento")
}
```

## Fluxo
`src/lib/tarefas/calcular.ts` — **função pura** que recebe os Leads relevantes
(com o último envio, o status e o `status_em`), a lista de adiamentos e `agora`,
e devolve as Tarefas ordenadas. Sem Prisma, sem Next: testável com relógio fixo.

A busca desses dados é **uma query só** (respeitando o AC5 da
[F028](F028-desempenho.md)): Leads em `contatado`, `respondeu`, `proposta` ou
`priorizado`, com `take: 1` na última Outreach enviada e uma contagem agregada
pro `APROFUNDAR_FILA`.

Ações (Server Actions finas): `adiarTarefa`, `dispensarTarefa` e o reuso das
existentes — `registrarDesfecho` (F006), `gerarOutreach` (F005/F027),
`marcarEnviado` (F006), `aprofundarLote` (F025).

## UI
- **Sidebar** — item **Tarefas** no grupo Prospecção, com **badge** do total
  vencido. O badge vem de uma contagem barata (sem montar a lista inteira).
- **Home `/`** — bloco **"Pra fazer agora"** com as 5 mais atrasadas, logo
  abaixo da Fila do dia (F025). O par fica: *quem abordar* (fila) + *o que
  cobrar* (tarefas).
- **`/tarefas`** — lista completa, agrupada por faixa de atraso. Cada linha:
  nome do Lead + o que aconteceu ("abordado há 14h, sem resposta registrada") +
  ação primária + `⋯` (Adiar 1 dia · Dispensar · Abrir Lead).
- **Estado vazio** — "Nada atrasado. Sua fila de hoje tem N Leads." com link.
- Cada Tarefa **explica a regra** em uma linha, pra cobrança não parecer
  arbitrária.

## Critérios de aceitação
- [ ] **AC1** — Lead `contatado` com Outreach enviada há 13h e sem desfecho
      aparece como `CONFIRMAR_RESPOSTA`; com 11h, **não** aparece.
- [ ] **AC2** — Passados 3 dias, o mesmo Lead aparece como `MANDAR_FOLLOWUP` e
      **não** mais como `CONFIRMAR_RESPOSTA` (nunca as duas).
- [ ] **AC3** — Registrar desfecho (`respondeu`/`ganho`/`perdido`) faz a Tarefa
      do Lead sumir na hora.
- [ ] **AC4** — Lead `descartado` (F024) não gera Tarefa de nenhum tipo.
- [ ] **AC5** — Adiar some com a Tarefa por 24h e ela volta depois — **sem**
      duplicar.
- [ ] **AC6** — Dispensar some com a Tarefa; enviar uma **nova** Outreach
      (marco novo) faz a cobrança voltar.
- [ ] **AC7** — Outreach gerada e não enviada há 25h vira `ENVIAR_ABORDAGEM`;
      marcar como enviada resolve.
- [ ] **AC8** — Com Leads de score estimado ≥ 60 sem Diagnóstico, aparece **uma
      única** `APROFUNDAR_FILA`, e o botão dela chama o lote da F025.
- [ ] **AC9** — Badge da sidebar bate com o número de Tarefas vencidas da
      página.
- [ ] **AC10** — `calcular.ts` é puro e testado com relógio fixo, cobrindo os
      seis tipos, a exclusão mútua (AC2) e os adiamentos.
- [ ] **AC11** — Isolamento (F015): as Tarefas só olham Leads do usuário
      logado; `TarefaAdiamento` é escopada por `user_id`.
- [ ] **AC12** — A página `/tarefas` respeita o teto de queries da F028
      (≤ 4 por request) com 500 Leads.

## Decisões de implementação
- `src/lib/tarefas/regras.ts` (constantes + tipos), `calcular.ts` (puro),
  `contar.ts` (o badge).
- `src/actions/tarefas/adiar.ts` e `dispensar.ts`.
- Depende de `Lead.status_em` (F024) e de `score_estimado` (F025).
- Sem lib nova → **sem ADR**.

## Fora do escopo (F031)
- **Cron, e-mail e push** (decisão desta rodada). Volta como ADR próprio se a
  cobrança in-app não bastar.
- Tarefas criadas à mão pelo aluno ("ligar pro João quinta") — a v1 é 100%
  derivada. Tarefa manual precisa de tabela própria e vira outra feature.
- Prazos configuráveis por aluno.
- Agenda/calendário, integração com Google Calendar.
- Cobrança fora do funil de prospecção (entrega, cobrança de pagamento).

## Custo estimado
**$0/mês** — só banco. As ações que geram texto (follow-up) consomem a cota que
já existe hoje.
