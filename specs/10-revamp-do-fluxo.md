# 10 — Revamp do Fluxo (Fase 3)

## Status
Proposta — 2026-08-10 · branch `feature/revamp-fluxo-orion`

Documento **mestre** desta rodada. Descreve o **novo fluxo de trabalho do
Orion** ponta a ponta e distribui o trabalho em features com ID
([F024](02-features/F024-estado-do-lead-reversivel.md) a
[F034](02-features/F034-funil-kanban.md)) e ADRs
([014](04-decisions/ADR-014-agente-orion.md) a
[016](04-decisions/ADR-016-leitura-do-site-do-lead.md)).

A fonte da verdade de cada comportamento continua sendo a spec da feature; este
documento existe pra dar a **visão do conjunto** e a **ordem de execução**.

---

## 1. O problema (o que o uso real mostrou)

O Orion hoje é um **balcão de ferramentas manuais**: cada passo do fluxo é um
botão que o aluno precisa lembrar de apertar, na ordem certa, lead a lead.

```
Buscar → (clicar Diagnosticar em cada lead) → (clicar Priorizar em cada lead)
       → (clicar Gerar Outreach) → (copiar) → (abrir WhatsApp) → (voltar e marcar enviada)
       → (lembrar sozinho de fazer follow-up)
```

São 6 cliques manuais por Lead antes de existir uma mensagem pra enviar, e o
sistema **não tem opinião** sobre quem abordar primeiro: entrega 100 leads com
score 0 e espera que o aluno os processe um a um. Quem colhe 100 leads e
diagnostica 4 desiste no quinto.

Somando o que o uso mostrou, oito problemas concretos:

| # | Problema relatado | Feature |
|---|-------------------|---------|
| 1 | Depois de priorizar um Lead não tem como despriorizar / tirar da frente | [F024](02-features/F024-estado-do-lead-reversivel.md) |
| 2 | O sistema devia já trazer os melhores Leads prontos depois da busca | [F025](02-features/F025-fila-do-dia.md) |
| 3 | Saber se o negócio já tem atendimento automatizado no WhatsApp | [F026](02-features/F026-sinal-atendimento-automatizado.md) |
| 4 | Fazer o contato por e-mail por dentro da plataforma | [F027](02-features/F027-outreach-por-email.md) |
| 5 | Todas as interações com o site estão lentas | [F028](02-features/F028-desempenho.md) |
| 6 | Um agente de IA dentro do Orion pra perguntar coisas | [F029](02-features/F029-agente-orion.md) |
| 7 | Falta o menu Skills (com o extrator-de-DNA) | [F030](02-features/F030-menu-skills.md) |
| 8 | O Orion devia cobrar as tarefas (ex.: 12h sem resposta → follow-up) | [F031](02-features/F031-central-de-tarefas.md) |

Somaram-se três features de **suporte**, vindas da revisão das telas do
**LeadSite** (concorrente direto, capturas em `~/Downloads/ref use lead`):

| Feature | Por quê |
|---------|---------|
| [F032](02-features/F032-interface-do-orion.md) — Interface | A tabela de 7 colunas + modal único não sustenta a Fila do dia. Vira grid de cards + detalhe com abas |
| [F033](02-features/F033-busca-estruturada.md) — Busca estruturada | Texto livre faz o Tier de nicho cair em `BAIXO` silenciosamente. Nicho controlado corrige o score na origem |
| [F034](02-features/F034-funil-kanban.md) — Funil kanban | O funil é só leitura hoje; o kanban dá a superfície pra operar, usando o `corrigirStatus` da F024 |

Nenhuma das três muda o domínio — são superfície sobre o que já existe.

E uma quarta, de modelo de negócio, pedida em 2026-08-10:

| Feature | Por quê |
|---------|---------|
| [F035](02-features/F035-planos-e-limites.md) — Planos e limites | Hoje o custo variável por aluno é **ilimitado**. O Free passa a ter 50 Leads diagnosticados/mês (**inclusive em BYOK**), e follow-up automatizado, e-mail, kanban e agente viram plano pago. Custos medidos e preços propostos em [11](11-custos-e-precificacao.md) |

---

## 2. A ideia central do revamp

> **O aluno diz onde e o quê. O Orion faz o resto e devolve uma fila de trabalho
> com opinião — e cobra o que ficou parado.**

Três inversões:

1. **De ferramenta para motor.** Diagnóstico e priorização deixam de ser botões
   e passam a ser **consequência automática** da busca. O aluno nunca mais
   clica "Priorizar".
2. **De lista para fila.** A entrega da busca não é "83 leads coletados", é
   **"seus 10 melhores leads de hoje, com a Dor e a mensagem prontas"**.
3. **De registro passivo para cobrança ativa.** O Orion sabe o que está parado
   (abordagem sem resposta há 12h, proposta parada há 3 dias) e **cobra** — em
   vez de esperar o aluno lembrar.

---

## 3. O novo fluxo

```
┌─ 1. BUSCA ────────────────────────────────────────────────────────────────┐
│ Aluno: termo + localização.                                              │
│ Orion: Places → grava Leads → TRIAGEM instantânea (sem rede extra):      │
│        tem site? é agregador? tier do nicho? porte?  →  score estimado   │
│ Devolve em segundos: "83 Leads · 12 com potencial alto".                 │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │  automático, em lotes com progresso
┌─ 2. APROFUNDAMENTO ──────────▼───────────────────────────────────────────┐
│ Orion diagnostica sozinho os melhores da triagem (top N):               │
│   site no ar? HTTPS? performance mobile? atendimento automatizado no    │
│   WhatsApp? e-mail de contato publicado?  →  Dores  →  score confirmado  │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌─ 3. FILA DO DIA ─────────────▼───────────────────────────────────────────┐
│ "Seus 10 melhores Leads pra abordar hoje" — cada card com:              │
│   score confirmado · Dor principal · ação primária (Gerar abordagem)    │
│ Descartar tira da fila pra sempre (e dá pra restaurar).                 │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌─ 4. ABORDAGEM ───────────────▼───────────────────────────────────────────┐
│ Outreach gerada por IA, agora em dois canais: WhatsApp e e-mail.        │
│ Envio segue manual (WhatsApp Web / cliente de e-mail do aluno).         │
│ Um clique marca como enviada e move o funil.                            │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
┌─ 5. COBRANÇA ────────────────▼───────────────────────────────────────────┐
│ Central de Tarefas: o Orion vê o que está parado e cobra.               │
│   12h sem desfecho registrado → "confirme se respondeu"                 │
│   72h sem resposta            → "mande o follow-up"                     │
│   proposta parada há 3 dias   → "cobre a decisão"                       │
└──────────────────────────────────────────────────────────────────────────┘

  ╔═ Transversal ═══════════════════════════════════════════════════════════╗
  ║ Agente Orion (chat) — pergunta qualquer coisa sobre os SEUS dados.      ║
  ║ Menu Skills — o arsenal de skills (extrator-de-DNA) pra baixar/instalar.║
  ║ Desempenho — tudo acima só serve se responder rápido.                   ║
  ╚═════════════════════════════════════════════════════════════════════════╝
```

### O que muda pro aluno (antes → depois)

| Momento | Hoje | Depois do revamp |
|---------|------|------------------|
| Depois da busca | 83 linhas com score 0 | "12 Leads com potencial alto — aprofundando…" |
| Escolher quem abordar | no olho, coluna por coluna | fila do dia, ordenada, com a Dor na frente |
| Diagnosticar | 1 clique por Lead | automático nos melhores |
| Priorizar | 1 clique por Lead | não existe mais como passo manual |
| Errar e querer voltar | impossível (priorizado é sem volta) | Descartar / Restaurar / corrigir status |
| Abordar | só WhatsApp | WhatsApp **e** e-mail |
| Lembrar do follow-up | memória do aluno | o Orion cobra |
| Dúvida ("quais leads sem site em Curitiba?") | filtrar na mão | perguntar pro agente |

---

## 4. Decisões desta rodada

Tomadas com o Ricardo em 2026-08-10, antes de escrever as specs:

| Decisão | Escolha | Consequência |
|---------|---------|--------------|
| Base do revamp | Sair da `main` limpa | As branches `F021-pipeline`, `F022-proposta`, `f023-boas-vindas-feed` **não** entram; ficam como referência (ver §7) |
| Menu Skills | Catálogo pra **baixar/instalar** | Espelha o padrão da F020 (entregáveis); não roda skill dentro do app |
| Envio de e-mail pela plataforma | **Não nesta rodada** | A F027 gera e prepara o e-mail; o envio sai do cliente de e-mail do aluno (`mailto:`). Sem SMTP de saída, sem risco de reputação |
| Avisos / cobrança | **Só in-app, sem cron** | Mantém o [ADR-002](04-decisions/ADR-002-sem-workers-fase-1.md) intacto: a Central de Tarefas é derivada do banco quando o aluno abre o app. Não puxa de volta quem sumiu |

### O que continua fora de escopo
- Disparo automático/em massa de mensagens (LGPD — a restrição não mudou).
- Workers, filas e jobs agendados (ADR-002 preservado).
- Enriquecimento de dados pessoais via terceiros (LinkedIn, Receita, etc.).
- Scraping de terceiros. A leitura de HTML se limita ao **site que o próprio
  Lead publicou no Google** — ver [ADR-016](04-decisions/ADR-016-leitura-do-site-do-lead.md).

---

## 5. Impacto no domínio

Mudanças no [domain model](01-domain-model.md) (já refletidas lá):

| Entidade | Mudança | Feature |
|----------|---------|---------|
| `Lead.status` | novo estado `descartado` | F024 |
| `Lead.status_em` | novo campo: quando o status atual foi assumido | F031 |
| `Lead.score_estimado` | novo campo: `true` enquanto o score vem da Triagem | F025 |
| `Lead.email` | novo campo: e-mail de contato publicado no site do Lead | F027 |
| `Diagnostico.atendimento_automatizado` | novo campo (enum) + `atendimento_evidencia` | F026 |
| `Dor.tipo` | novo valor `SEM_ATENDIMENTO_AUTOMATIZADO` | F026 |
| `TarefaAdiamento` | nova tabela (adiar/dispensar uma cobrança) | F031 |
| **Triagem** | novo conceito derivado (score sem Diagnóstico) | F025 |
| **Fila do dia** | novo conceito derivado | F025 |
| **Tarefa** | novo conceito derivado (pendência que o Orion cobra) | F031 |

---

## 6. Ordem de execução

Fases pensadas pra cada uma ser **entregável sozinha** e não bloquear a
seguinte. Dentro de cada fase, a ordem importa.

### Fase A — Destravar (o fluxo dói hoje)
1. **[F028](02-features/F028-desempenho.md) Desempenho** — *primeiro*. Tudo
   abaixo fica pior num app lento, e as correções de query da F028 são
   pré-requisito da fila e da Central de Tarefas (que varrem mais dados).
2. **[F024](02-features/F024-estado-do-lead-reversivel.md) Estado reversível** —
   barato, tira a frustração imediata e é pré-requisito do "descartar" da fila.

### Fase B — A cara nova
3. **[F032](02-features/F032-interface-do-orion.md) Interface** — grid de cards,
   detalhe com abas, navegação da sidebar. Vem antes da Fila do dia porque é a
   casca que ela (e todas as outras) usa pra aparecer.

### Fase C — O coração do revamp
4. **[F025](02-features/F025-fila-do-dia.md) Fila do dia** — triagem automática
   na coleta + aprofundamento em lotes + priorização automática.
5. **[F033](02-features/F033-busca-estruturada.md) Busca estruturada** — nicho
   controlado; corrige o Tier na origem, então quanto antes entrar, menos Lead
   entra na base com score torto.
6. **[F026](02-features/F026-sinal-atendimento-automatizado.md) Atendimento
   automatizado** — entra no mesmo Diagnóstico da F025 (zero requisição extra:
   aproveita o HTML que a F002 já baixa).

### Fase D — Abordar, cobrar e operar
7. **[F027](02-features/F027-outreach-por-email.md) Outreach por e-mail** —
   depende da captura de e-mail feita junto com a F026.
8. **[F031](02-features/F031-central-de-tarefas.md) Central de Tarefas** —
   depende de `status_em` (F024/F025) pra saber há quanto tempo algo parou.
9. **[F034](02-features/F034-funil-kanban.md) Funil kanban** — depende do
   `corrigirStatus` (F024) e do card compacto (F032).

### Fase E — Superfície nova
10. **[F030](02-features/F030-menu-skills.md) Menu Skills** — independente das
    demais; pode entrar em paralelo a qualquer momento (só depende do conteúdo
    das skills).
11. **[F029](02-features/F029-agente-orion.md) Agente Orion** — *por último de
    propósito*: o agente fica muito melhor depois que os dados dele (score
    confirmado, Dores, tarefas) existirem.

---

## 7. Trabalho anterior não mergeado (referência)

Existem três branches no remoto que **não** entram nesta rodada (decisão §4):

| Branch | Conteúdo | Como tratar |
|--------|----------|-------------|
| `feature/F021-pipeline` | Pipeline/CRM com Oportunidade, playbook e checklist | Referência. **Atenção ao nome "Tarefa"**: lá é item de playbook; aqui (F031) é cobrança derivada. Se a F021 for retomada, o item de playbook vira "Passo do playbook" |
| `feature/F022-proposta` | Proposta persistida + PDF | Referência pra quando a proposta virar entidade |
| `feature/f023-boas-vindas-feed-views` | Boas-vindas + feed (empilha F021+F022) | Referência |

As três estão **atrás dos hotfixes recentes da `main`** (magic link, paginação
do Places, Gemini) — retomar exige rebase, não merge direto. Os IDs F021, F022 e
F023 ficam **reservados** por elas; por isso o revamp começa em **F024**.

---

## 8. Como medir se o revamp funcionou

| Métrica | Hoje | Alvo |
|---------|------|------|
| Cliques até a 1ª mensagem pronta, depois da busca | 6 por Lead | **1** (a busca) |
| Tempo da busca até ter 10 Leads prontos | manual, minutos | **< 2 min**, automático |
| p95 de TTFB em `/leads` | a medir (F028) | **< 800 ms** com 500 Leads |
| Leads abordados que recebem follow-up | depende da memória | **> 80%** dos que entram na janela |
