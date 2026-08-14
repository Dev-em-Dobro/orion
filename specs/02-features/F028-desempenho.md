# F028 — Desempenho do app (medir, corrigir, provar)

## Status
Implementada em software — 2026-08-10 · parte do [revamp do fluxo](../10-revamp-do-fluxo.md) (Fase A — **primeira**)

> **Falta a parte de infra (H1/H2), que não é código:** co-localizar função e
> banco (região do Neon + `vercel.json`) e apontar a `DATABASE_URL` para o
> endpoint `-pooler`. É a correção de **maior impacto** e depende de acesso ao
> painel do Neon/Vercel. Local (Postgres em Docker) o `db_rtt_ms` fica em
> ~2 ms, dentro do alvo de 15 ms — o alvo só é significativo em produção.

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
| Carrega **todos** os Leads `contatado` com as Abordagens enviadas, sem paginar, só pra montar o painel de follow-up | `leadsFollowUp` | Cresce sem teto: a página fica mais lenta a cada Lead abordado | Filtrar no banco (`enviado_em <= agora - janela`) e trazer só o que é exibido |
| `include: { abordagens: { orderBy } }` **sem `take`** | lista principal | Traz todas as Abordagens de cada Lead da página só pra usar a primeira e a contagem | `take: 1` + `_count` |
| `count` extra **sequencial** depois do `Promise.all` quando há filtro | `total` | Um round-trip a mais em série | Entrar no mesmo `Promise.all` |

> **Feito em 2026-08-10.** Além dos três acima, a serialização tinha uma quarta
> causa: a categoria do filtro era **validada contra a lista de categorias
> existentes**, então o `where` da lista só ficava pronto depois daquela query.
> Removida a validação (categoria inexistente agora cai no empty state "nenhum
> Lead com esses filtros", que já existia), a página passou de **4 rodadas
> sequenciais para 1**. A busca da página usa a página pedida direto e só
> refaz a consulta no caso raro de o número pedido passar do fim.

### H4. Faltam índices para a ordenação e os filtros
A lista ordena por `score desc, created_at desc` e filtra por `status`; existe
só `@@index([user_id])`.
**Correção (migração):**
```prisma
@@index([user_id, score(sort: Desc), created_at(sort: Desc)])  // Lead — ordenação da lista
@@index([user_id, status])                                     // Lead — funil, fila, tarefas
@@index([lead_id, enviado, enviado_em])                        // Abordagem — follow-up
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

> **Adiada para a [F032](F032-interface-do-orion.md), de propósito.** Fatiar a
> página em blocos com `<Suspense>` exige quebrá-la em componentes que buscam
> os próprios dados — e a F032 reescreve exatamente essa página (tabela → grid
> de cards, modal → detalhe com abas). Fazer agora seria refazer depois. As
> correções de query e índice (H3/H4) **não** dependem disso e já entraram.

#### `<Suspense>` na página, nunca `loading.tsx` na rota
Descoberto ao rodar o e2e de isolamento (2026-08-10): `src/app/loading.tsx` e
`src/app/(orion)/leads/loading.tsx` **quebravam o AC6 da
[F015](F015-multi-tenant.md)**. Um `loading.tsx` cria um boundary de Suspense
no nível da **rota**: o Next envia o shell na hora, **commita HTTP 200**, e o
`notFound()` que a página lança depois chega tarde — vira troca de UI no
cliente, não status. Resultado: `/leads/{id}` de outro aluno respondia **200**.

O dado **não** vazava (a página não renderiza nada do Lead alheio), mas o
contrato do AC6 é 404 — e antes disso era pior: uma **corrida**. A página
antiga era pequena e às vezes ganhava do flush; a nova, com 7 queries, perdia
sempre. Teste de segurança que depende de corrida não vale nada.

**Decisão:** os dois `loading.tsx` foram removidos. O skeleton dessas telas
vive num `<Suspense>` **dentro da página** — mesmo ganho de percepção, porque
o shell continua pintando antes dos blocos pesados, sem boundary de rota
acima do `notFound()`. `/configuracao` e `/treino` mantêm o `loading.tsx`
delas: não usam `notFound()`.

Guarda de regressão: `tests/unit/notfound-sem-boundary.test.ts` falha se
alguém recriar um `loading.tsx` acima de `/leads/[id]`, `/skills/[slug]` ou
`/entregaveis/[slug]`.

### H7. Cold start
Se a instrumentação mostrar cold start relevante (primeira requisição depois de
ociosidade), avaliar: reduzir o bundle do servidor (o `playwright` já está fora
via `serverExternalPackages`) e manter o Prisma Client único (já feito em
`src/lib/db.ts`).

## Critérios de aceitação
Medidos em produção, com uma conta de teste contendo **500 Leads**, 200
Diagnósticos e 100 Abordagens:

- [ ] **AC1** — `db_rtt_ms` em `/api/health` **< 15 ms** (p50) — função e banco
      co-localizados.
- [ ] **AC2** — TTFB de `/leads` **< 800 ms** (p95); hoje: medir e registrar o
      número na PR.
- [ ] **AC3** — TTFB de `/` (dashboard + Fila do dia) **< 1 s** (p95).
- [ ] **AC4** — Ação de navegação entre páginas do app **< 500 ms** até o
      primeiro conteúdo novo (com streaming, o shell é imediato).
- [ ] **AC5** — Nenhuma página faz mais de **uma rodada sequencial** de
      queries: tudo que não depende do resultado do vizinho vai junto num
      `Promise.all`. Teto secundário de **6 queries** por request (log da
      etapa 1).
      > **Corrigido em 2026-08-10, durante a implementação.** A versão original
      > deste AC exigia "≤ 4 queries por request" — métrica errada. O que
      > multiplica latência é **ida-e-volta em série**: 5 queries em paralelo
      > custam ~1 RTT, enquanto 2 em série custam 2 RTT. Contar queries teria
      > premiado juntar consultas e ignorado o problema real, que era a lista
      > `/leads` esperar a query de categorias pra montar o filtro, depois o
      > count, depois os Leads.
- [ ] **AC6** — O tempo de `/leads` **não cresce** com o número de Leads
      `contatado` (a consulta de follow-up passa a ser filtrada no banco):
      comparar 50 vs 500 contatados, variação < 20%.
- [ ] **AC7** — Todas as migrações de índice aplicadas e verificadas com
      `EXPLAIN` (a ordenação da lista usa índice, não `Seq Scan` + `Sort`).
- [ ] **AC8** — Nenhuma regressão funcional: a suíte (`npm test`) e o teste de
      isolamento multi-tenant (`test:e2e:isolamento`) passam.
- [ ] **AC9** — Os números antes/depois de cada hipótese ficam registrados na
      descrição da PR (é o que impede "otimização" sem prova).

## Etapa 3 — Varredura de rotas (2026-08-14)

**Critério novo, pedido pelo dono do produto: nenhuma rota passa de 2,5 s.**

### Como passou a ser medido
`scripts/perf-rotas.mts` sobe o build de produção numa porta própria, forja uma
sessão (linha em `session` + cookie assinado como o Better Auth faz — o helper
`/api/e2e/session` não serve porque se desliga em `NODE_ENV=production`, que é
justamente o modo a medir) e roda **duas passadas** por rota:

- **HTTP** — TTFB e corpo completo, 7–12 amostras, p50 e p95. É o piso: nenhum
  navegador pinta antes disso.
- **Navegador** — Chromium de verdade, `load` e LCP.

E roda em **dois cenários**, porque um só mente:

| cenário | banco | máquina |
|---|---|---|
| piso do código | Postgres local (~1 ms) | CPU do desktop, sem throttle |
| perfil de produção | `scripts/perf-proxy-latencia.mts` põe **+35 ms** por ida-e-volta (perfil Neon) | CPU 4× mais lenta + 4G ruim (150 ms RTT) |

O relay de latência não é firula: contra o Postgres local, uma tela com oito
consultas em série mede igual a uma com uma só. É o cenário 2 que revela a
diferença — e é ele que responde ao critério de 2,5 s.

> **Armadilha registrada.** A primeira rodada "provou" que 35 ms de latência de
> banco não custavam nada. O `next start` sobe via shell, `proc.kill()` matava
> só o shell, e o segundo cenário estava medindo o servidor do primeiro. Quem
> mede precisa checar que mediu o que pensa ter medido — o script agora derruba
> a árvore de processo e recusa subir com a porta ocupada.

### O que a medição achou: o pedágio do shell

TTFB p50 tinha **piso de ~250 ms em toda rota** no cenário de produção —
incluindo `/conteudo` e `/agente`, que não consultam nada de domínio. O custo
não era de página nenhuma: era do **shell**, que roda antes de qualquer uma e
não estava coberto pelo AC5.

Três causas, todas antes do primeiro byte:

1. `SidebarWithStatus` fazia `await contarTarefas()` e **depois**
   `await planoDoUsuario()` — duas idas-e-voltas em série pra duas consultas
   independentes. Viraram `Promise.all`.
2. `contarTarefas` chama `tarefasDoUsuario`, que é a consulta mais cara que
   roda em toda página (`findMany` de Leads com as Abordagens aninhadas), só
   pra desenhar o número do badge. Em `/tarefas` rodava **duas vezes** por
   request — uma pro badge, outra pro conteúdo. Passou a ser memoizada por
   request com o `cache()` do React, o mesmo recurso da H5.
3. `MedidorUso` é `async` e vive no shell: toda página esperava as consultas
   de plano e uso antes do primeiro byte. Foi pra dentro de um `<Suspense>`
   com placeholder do tamanho exato — o medidor saiu do caminho crítico sem
   custar layout shift.

### Números (12 amostras, cenário de produção)

| | antes | depois |
|---|---|---|
| `load` no navegador, pior rota | 731 ms (`/ranking`) | **635 ms** |
| `load` no navegador, faixa das demais | 538–570 ms | **401–477 ms** |
| TTFB p50, piso do shell | ~263 ms | **~251 ms** |

Todas as 17 rotas medidas ficam abaixo de 2,5 s — a pior com **3,9× de folga**.

### Limites honestos desta medição
- A base de teste tem **30 Leads**, não os 500 que os AC1–AC9 exigem. O que a
  varredura prova é a latência de estrutura (idas-e-voltas em série), não o
  comportamento em escala. `tarefasDoUsuario` é a que mais deve doer quando a
  base crescer, porque lê todos os Leads em estágio cobrável.
- O relay simula **tempo de viagem**, não o Neon: sem cold start de branch, sem
  limite de conexão do pooler.
- Continua valendo o aviso do topo desta spec: H1/H2 são infra e não foram
  feitas.
- Uma amostra isolada de `/leads?status=descartados` marcou 19 s de p95 numa
  rodada. **Não reproduziu** em 12 amostras (p95 = 328 ms); a causa provável é
  churn de conexão do Prisma através do relay, não código da aplicação. Fica
  registrado em vez de descartado.

### Critérios de aceitação da etapa 3
- [ ] **AC10** — Nenhuma rota autenticada passa de **2,5 s** de `load` no
      cenário de produção do `scripts/perf-rotas.mts`.
- [ ] **AC11** — O shell (sidebar + medidor) não faz ida-e-volta **em série**
      antes do primeiro byte; o que não é essencial pra navegar mora em
      `<Suspense>`.
- [ ] **AC12** — `tarefasDoUsuario` roda **uma vez** por request, mesmo quando
      a página e o badge da sidebar a pedem.

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
