# F034 — Funil kanban

## Status
Implementada — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase D)

## Objetivo
Dar ao funil uma **superfície de trabalho**. Hoje o `status` do Lead é uma
coluna de texto na lista e um gráfico read-only no dashboard
([F010](F010-dashboard-funil.md)): dá pra *ver* o funil, não pra *operar* nele.

O `/funil` mostra os Leads em colunas por estágio e deixa o aluno **mover** — é
o gesto que a referência (LeadSite) acerta e que combina com o `corrigirStatus`
da [F024](F024-estado-do-lead-reversivel.md).

## Relação com as specs existentes
- **Não cria entidade nova.** As colunas são o `Lead.status` que já existe. Sem
  "Oportunidade", sem tabela paralela — diferente da branch não mergeada
  `feature/F021-pipeline` ([revamp §7](../10-revamp-do-fluxo.md#7-trabalho-anterior-não-mergeado-referência)).
- **Mover card = corrigir status** (F024), o que grava `status_em` e alimenta as
  cobranças da [F031](F031-central-de-tarefas.md).
- **F010 continua** sendo a leitura analítica (taxas de conversão); a F034 é a
  operação.

## Colunas
Uma por estágio do funil de venda, na ordem canônica de `src/lib/funil.ts`:

| Coluna | `Lead.status` |
|--------|---------------|
| Prontos | `priorizado` (+ `enriquecido`) |
| Abordados | `contatado` |
| Responderam | `respondeu` |
| Qualificados | `qualificado` |
| Proposta | `proposta` |
| Ganhos | `ganho` |
| Perdidos | `perdido` |

- `novo` **não** tem coluna: Lead sem Diagnóstico não está no funil de venda
  (ele aparece na lista e na cobrança `APROFUNDAR_FILA` da F031).
- `descartado` **não** tem coluna: sai do funil por definição (F024).
- Cada coluna mostra o **contador** no topo e carrega no máximo **50** cards,
  com "ver todos" apontando pra lista filtrada (proteção de desempenho —
  [F028](F028-desempenho.md)).

## Card do kanban
Versão compacta do card da [F032](F032-interface-do-orion.md):
`[score+faixa] Nome · categoria · cidade`, mais **Abrir WhatsApp** e
**Abrir Lead**. Sem Dor e sem endereço — a coluna é estreita.

## Mover
- **Arrastar e soltar** com o HTML5 nativo (`draggable`, `onDragOver`,
  `onDrop`) — **sem biblioteca de kanban** (seria lib nova → ADR, e não se
  justifica).
- **Alternativa acessível, sempre presente**: cada card tem um select
  *"Mover para…"*. Teclado e mobile usam esse caminho; o arrastar é atalho,
  não requisito. (Drag & drop nativo não é acessível por teclado — por isso o
  select não é fallback opcional, é parte da entrega.)
- Soltar chama `corrigirStatus({ lead_id, status })` (F024): aceita avanço e
  regressão, grava `status_em`, não apaga Diagnóstico, Dor nem Outreach.
- **Otimista com rollback**: o card move na hora; se a action falhar, ele volta
  e a UI mostra o erro.

## Filtros
Os mesmos chips da lista (F032), compartilhados via URL: `Sem site`,
`Score 60+`, `Com telefone`, categoria. Um funil filtrado por nicho é a visão
mais útil pra quem trabalha uma cidade de cada vez.

## Critérios de aceitação
- [ ] **AC1** — `/funil` mostra 7 colunas com os Leads no estágio certo e o
      contador correto por coluna.
- [ ] **AC2** — Leads `novo` e `descartado` não aparecem em nenhuma coluna.
- [ ] **AC3** — Arrastar um card de "Abordados" para "Responderam" persiste
      `status = respondeu` e atualiza `status_em`.
- [ ] **AC4** — Mover **para trás** (ex.: "Abordados" → "Prontos") é permitido e
      mantém Diagnóstico, Dores e Outreaches intactos.
- [ ] **AC5** — O select "Mover para…" faz exatamente o mesmo que o arrastar, e
      é operável só com teclado.
- [ ] **AC6** — Falha na action devolve o card à coluna de origem e mostra erro
      (nada de card "preso" no lugar errado).
- [ ] **AC7** — Coluna com mais de 50 Leads mostra os 50 primeiros (por score
      desc) + link "ver todos" pra `/leads` filtrado.
- [ ] **AC8** — Isolamento (F015): o board só carrega Leads do usuário logado.
- [ ] **AC9** — A página respeita o teto de queries da F028 (≤ 4 por request):
      uma query com `groupBy` pros contadores e uma pros cards.

## Decisões de implementação
- `src/app/(orion)/funil/page.tsx` (server) + `board.tsx` (client, só o
  arrastar).
- Mapa coluna → status em `src/lib/funil.ts`, junto da ordem canônica que já
  existe — nada de duplicar a máquina de estados na UI.
- Reusa `corrigirStatus` (F024) e `STATUS_BADGE`/`scoreBadge` (F032).
- Sem lib nova → **sem ADR**.

## Fora do escopo (F034)
- Reordenar cards dentro da coluna (prioridade manual) — a ordem é o score.
- Limite de WIP por coluna, swimlanes, filtro por período.
- Colunas configuráveis pelo aluno — as colunas **são** o domínio; mudar exige
  editar o [domain model](../01-domain-model.md).
- Ações em massa dentro do board (isso é da lista, F032).

## Custo estimado
**$0** — só banco e UI.
