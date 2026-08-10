# F028 — Desempenho do app (medir, corrigir, provar)

## Status
Proposta — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase A — **primeira**)

## Objetivo
Fazer o Orion **responder rápido**. Hoje o relato é "todas as interações estão
lentas" — navegar entre páginas, abrir a lista, voltar depois de uma ação.

A F028 vem **antes** do resto do revamp por dois motivos: a Fila do dia (F025) e
a Central de Tarefas (F031) leem mais dados que a lista atual (ficariam piores
num app lento), e algumas correções aqui são pré-requisito delas.

**Regra desta spec: nada é "otimizado" antes de ser medido.** A etapa 1 é
instrumentação; as correções vêm com número antes e depois.

## Etapa 1 — Instrumentar (sem isso, o resto é chute)

1. **Tracing de servidor** — ligar o performance tracing do Sentry, que já está
   instalado ([ADR-013](../04-decisions/ADR-013-observabilidade.md)), nas rotas
   `/`, `/leads`, `/leads/[id]` e nas Server Actions. Quebrar o tempo em:
   sessão, queries Prisma (uma span por query), render.
2. **RTT do banco** — `GET /api/health` passa a devolver
   `{ db_rtt_ms }` (um `SELECT 1` cronometrado) e a região da função
   (`process.env.VERCEL_REGION`). É o número que separa "banco longe" de
   "query ruim".
3. **Contagem de queries por página** — log em dev (middleware do Prisma
   `$on('query')`) com a contagem por request. Vira o AC5.
4. **Medição do cliente** — anotar TTFB e LCP reais das 3 rotas principais
   (Sentry browser já ativo).

Com esses quatro números, o gargalo aparece sozinho. As hipóteses abaixo são as
que a leitura do código já sustenta — **em ordem de suspeita**.

## Etapa 2 — Correções por hipótese

### H1. Função e banco em regiões distantes (suspeita principal)
Cada `await` no Prisma custa **um ida-e-volta de rede**. Se a função (Vercel,
região padrão `iad1`, Washington) estiver longe do Neon, e uma página fizer 6
queries, são 6 × RTT só de rede — com o aluno no Brasil somando ainda a
distância até a Vercel.

**Correção:** deixar **função e banco na mesma região**. É a latência que
multiplica; a distância do aluno até a Vercel é paga uma vez só.
- `vercel.json` fixando `regions` (preferência `gru1`/São Paulo se o Neon tiver
  região no Brasil; senão, a mesma região do Neon existente).
- Decisão e o que fica valendo: [ADR-015](../04-decisions/ADR-015-regiao-execucao-e-banco.md).

### H2. Conexão nova a cada invocação
Serverless + Postgres sem pooler = handshake por invocação (e risco de estourar
`max_connections`).
**Correção:** `DATABASE_URL` apontando pro endpoint **`-pooler`** do Neon, com
`connection_limit=1`. Medir antes/depois no `db_rtt_ms`.

### H3. Consultas caras na lista `/leads`
O código atual (`src/app/(orion)/leads/page.tsx`) tem três problemas concretos:

| Problema | Onde | Efeito | Correção |
|----------|------|--------|----------|
| Carrega **todos** os Leads `contatado` com as Outreaches enviadas, sem paginar, só pra montar o painel de follow-up | `leadsFollowUp` | Cresce sem teto: a página fica mais lenta a cada Lead abordado | Filtrar no banco (`enviado_em <= agora - janela`) e trazer só o que é exibido |
| `include: { outreaches: { orderBy } }` **sem `take`** | lista principal | Traz todas as Outreaches de cada Lead da página só pra usar a primeira e a contagem | `take: 1` + `_count` |
| `count` extra **sequencial** depois do `Promise.all` quando há filtro | `total` | Um round-trip a mais em série | Entrar no mesmo `Promise.all` |

### H4. Faltam índices para a ordenação e os filtros
A lista ordena por `score desc, created_at desc` e filtra por `status`; existe
só `@@index([user_id])`.
**Correção (migração):**
```prisma
@@index([user_id, score(sort: Desc), created_at(sort: Desc)])  // Lead — ordenação da lista
@@index([user_id, status])                                     // Lead — funil, fila, tarefas
@@index([lead_id, enviado, enviado_em])                        // Outreach — follow-up
@@index([lead_id, executado_em])                               // Diagnostico — último diagnóstico
```

### H5. Sessão consultando o banco a cada request
`requireUser()` valida sessão no banco em toda navegação — e o middleware já
checa o cookie antes.
**Correção:** ligar o **cookie cache** do Better Auth (sessão assinada no
cookie por alguns minutos), mantendo a validação real nas ações sensíveis.
Reduz 1 query por request em **todas** as páginas.

### H6. Tudo é `force-dynamic`, e a navegação parece travada
Correto para multi-tenant (não dá pra cachear entre alunos), mas hoje a página
só aparece **depois** que todas as queries terminam.
**Correção:** `<Suspense>` por bloco — o shell (sidebar, título, formulário de
coleta) pinta imediato e cada bloco pesado (lista, funil, fila) chega em
streaming. Mais `prefetch` nos links da sidebar. Não deixa o servidor mais
rápido; deixa o app **perceptivelmente** rápido, que é o que o relato descreve.

### H7. Cold start
Se a instrumentação mostrar cold start relevante (primeira requisição depois de
ociosidade), avaliar: reduzir o bundle do servidor (o `playwright` já está fora
via `serverExternalPackages`) e manter o Prisma Client único (já feito em
`src/lib/db.ts`).

## Critérios de aceitação
Medidos em produção, com uma conta de teste contendo **500 Leads**, 200
Diagnósticos e 100 Outreaches:

- [ ] **AC1** — `db_rtt_ms` em `/api/health` **< 15 ms** (p50) — função e banco
      co-localizados.
- [ ] **AC2** — TTFB de `/leads` **< 800 ms** (p95); hoje: medir e registrar o
      número na PR.
- [ ] **AC3** — TTFB de `/` (dashboard + Fila do dia) **< 1 s** (p95).
- [ ] **AC4** — Ação de navegação entre páginas do app **< 500 ms** até o
      primeiro conteúdo novo (com streaming, o shell é imediato).
- [ ] **AC5** — Nenhuma página faz mais de **4 queries** por request (contadas
      pelo log da etapa 1).
- [ ] **AC6** — O tempo de `/leads` **não cresce** com o número de Leads
      `contatado` (a consulta de follow-up passa a ser filtrada no banco):
      comparar 50 vs 500 contatados, variação < 20%.
- [ ] **AC7** — Todas as migrações de índice aplicadas e verificadas com
      `EXPLAIN` (a ordenação da lista usa índice, não `Seq Scan` + `Sort`).
- [ ] **AC8** — Nenhuma regressão funcional: a suíte (`npm test`) e o teste de
      isolamento multi-tenant (`test:e2e:isolamento`) passam.
- [ ] **AC9** — Os números antes/depois de cada hipótese ficam registrados na
      descrição da PR (é o que impede "otimização" sem prova).

## Decisões de implementação
- Correções entram **uma por commit**, com o número medido antes e depois.
- H1 e H2 são infra (`vercel.json`, variável de ambiente) — nenhuma linha de
  aplicação; entram primeiro por serem as de maior efeito e menor risco.
- H3, H4 e H6 são código/migração.
- A etapa 1 **altera o ADR-013**, que fixou o sample de performance do Sentry em
  0 ("só erros no beta"). O adendo (sample 0.1, mantendo a proibição de enviar
  chave BYOK, magic link ou secret) está registrado no
  [ADR-015](../04-decisions/ADR-015-regiao-execucao-e-banco.md) §3.
- Sem lib nova. Se a medição mostrar que só o **driver serverless** do Neon
  resolve (`@prisma/adapter-neon`), aí sim vira ADR — não antes.

## Fora do escopo (F028)
- Cache entre usuários (proibido pelo multi-tenant — F015).
- Réplica de leitura, sharding, CDN de dados.
- Redesenho de UI (isso é design, não desempenho).
- Otimizar o tempo das operações que dependem de API externa (Places,
  PageSpeed, LLM) — lá o gargalo é o terceiro; a F025 já trata isso com lotes
  e progresso.

## Custo estimado
**$0/mês.** Mudança de região e uso do pooler não alteram o plano do Neon nem
o da Vercel. O ganho é de latência, não de gasto.
