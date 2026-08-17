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
  regressão, grava `status_em`, não apaga Diagnóstico, Dor nem Abordagem.
- **Otimista com rollback**: o card move na hora; se a action falhar, ele volta
  e a UI mostra o erro.

## Filtros
Os mesmos chips da lista (F032), compartilhados via URL: `Sem site`,
`Score 60+`, `Com telefone`, categoria. Um funil filtrado por nicho é a visão
mais útil pra quem trabalha uma cidade de cada vez.

## Emenda 2026-08-14 — o Lead entra no funil pela lista

**"Abordar no CRM" abria o detalhe do Lead.** O rótulo prometia o CRM — que
neste produto é o funil — e entregava outra tela. Não havia caminho da lista
para o kanban a não ser pelo menu, e escolher dez Leads bons obrigava a abrir um
por um.

**A regra nova.** O botão do card chama-se **"Mandar pro Funil"** e faz isso:

1. Lead em `novo` é promovido a `enriquecido` — o único status fora do
   `STATUS_DO_BOARD`, então sem isso o aluno cairia num kanban onde o Lead que
   ele acabou de mandar não aparece. É correção manual de estado, reversível
   como toda a [F024](F024-estado-do-lead-reversivel.md).
2. Lead que já está no board **não muda de estágio** — mexer nele apagaria
   trabalho.
3. Redireciona para `/funil?destaque=<ids>`, e os destacados **sobem para o topo
   da coluna** com anel na cor primária.

`enriquecido` e não `priorizado`: "Pronto pra abordar" é o que o aprofundamento
concede depois de confirmar o score ([F025](F025-fila-do-dia.md)). Dizer isso de
um Lead que o aluno só empurrou pra fila seria promessa que o dado não sustenta.

A mesma ação atende a **seleção em massa** da lista: marcando N Leads, aparece
"Mandar pro Funil (N)". Antes a seleção só sabia descartar e exportar — as duas
saídas negativas.

**Voltar respeita a origem.** O detalhe do Lead sempre voltava para `/leads`,
mesmo quando quem abriu foi o kanban: quem estava arrastando cards perdia o
lugar. A origem viaja na URL (`?de=funil`), não em estado de cliente, pra
sobreviver a recarregar a página e a abrir em aba nova. Ver `lib/leads/origem.ts`.

### Critérios de aceitação da emenda
- [ ] **AC12** — "Mandar pro Funil" leva ao kanban com o Lead visível no topo
      da coluna dele, destacado.
- [ ] **AC13** — Lead em `novo` entra no board; Lead que já está no board não
      muda de estágio ao ser mandado de novo.
- [ ] **AC14** — Selecionando N Leads na lista, "Mandar pro Funil (N)" leva
      todos e destaca todos.
- [ ] **AC15** — Abrindo um Lead pelo kanban, a seta voltar volta pro **kanban**;
      abrindo pela lista, volta pra lista **com o filtro preservado**.

## Critérios de aceitação
- [ ] **AC1** — `/funil` mostra 7 colunas com os Leads no estágio certo e o
      contador correto por coluna.
- [ ] **AC2** — Leads `novo` e `descartado` não aparecem em nenhuma coluna.
- [ ] **AC3** — Arrastar um card de "Abordados" para "Responderam" persiste
      `status = respondeu` e atualiza `status_em`.
- [ ] **AC4** — Mover **para trás** (ex.: "Abordados" → "Prontos") é permitido e
      mantém Diagnóstico, Dores e Abordagens intactos.
- [ ] **AC5** — O select "Mover para…" faz exatamente o mesmo que o arrastar, e
      é operável só com teclado.
- [ ] **AC6** — Falha na action devolve o card à coluna de origem e mostra erro
      (nada de card "preso" no lugar errado).
- [ ] **AC7** — Coluna com mais de 50 Leads mostra os 50 primeiros (por score
      desc) + link "ver todos" pra `/leads` filtrado.
- [ ] **AC8** — Isolamento (F015): o board só carrega Leads do usuário logado.
- [ ] **AC9** — A página respeita o teto de queries da F028 (≤ 4 por request):
      uma query com `groupBy` pros contadores e uma pros cards.
- [ ] **AC16** — Depois de soltar, o card volta ao estilo normal na coluna nova.
      O esmaecimento é feedback **do arrasto**, e some quando o arrasto acaba —
      nada de card permanentemente apagado. Ver "Card apagado" abaixo.

## Card apagado depois de soltar (corrigido em 2026-08-16)

O card chegava na coluna certa, o status persistia — e ele ficava com
`opacity-50` **para sempre**. Lido de fora, parecia carregamento infinito da
troca de status; não era. O dado estava salvo desde o primeiro instante.

A causa é uma armadilha do drag & drop nativo com lista que se reordena:
`dragend` **não dispara quando o elemento de origem sai do DOM durante o
drop**. E é exatamente isso que acontece aqui — soltar move o card de coluna,
então o `<li>` é desmontado da `<ul>` de origem e remontado sob outra `<section>`.
O `onDragEnd` que limparia `arrastando` nunca roda, o id continua lá, e como a
condição do estilo é `arrastando === card.id`, o card **novo** nasce apagado.
Só um reload limpava.

Quem encerra o arrasto agora é o **`onDrop` da coluna**, que é o elemento que
permanece montado. O `onDragEnd` do card continua, e continua servindo: ele é
quem cobre o arrasto cancelado (`Esc`) ou solto fora de qualquer coluna, onde
não há `drop` nenhum pra disparar.

## O card inteiro abre o Lead (corrigido em 2026-08-16)

Relato: *"clico no lead no funil e não abre a página interna dele"*. Não era
falha intermitente nem bug de navegação — era **alvo pequeno demais**.

Medido no board: o card tem 230 × 129 px; o link com o nome tem 160 × 47.
**Só 25% da área do card navegava.** Os outros 75% — a linha da categoria, os
badges, o espaço em branco — não faziam nada. E o cursor sobre o card é `grab`
o tempo inteiro, então nada na tela dizia "isto abre", só "isto se arrasta".

O aluno acerta o alvo quando mira no nome, erra quando mira no card. De fora,
isso é exatamente "às vezes abre, às vezes não".

**A correção é o card inteiro virar alvo**, pelo *stretched link*: o `<a>` do
nome ganha um `::after` absoluto cobrindo o `<li>`. Uma âncora só, com `href`
de verdade — abrir em nova aba, copiar o link e leitor de tela continuam
funcionando, que é o que se perderia com `onClick` no `<li>`.

Envolver o card inteiro em `<a>` seria a solução ingênua e está **errada**: o
card contém o botão do WhatsApp e o select "Mover para", e conteúdo interativo
dentro de âncora é HTML inválido — além de tornar o select inalcançável por
teclado. Esses dois sobem de camada (`relative z-10`) e continuam clicáveis
por cima do alvo esticado.

O arrasto não muda: o `::after` é filho do `<li>`, então o `dragstart` continua
saindo do ancestral `draggable`.

- [ ] **AC17** — Clicar em **qualquer ponto** do card abre o Lead — não só no
      nome. O botão do WhatsApp e o select "Mover para" continuam clicáveis e
      **não** abrem o Lead.

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
