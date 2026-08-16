# ADR-015 — Região de execução, pooler do banco e medição de desempenho

## Status
Aceita — 2026-08-16. **Decisão 1 implementada** (`vercel.json`); 4 já estava em
pé; 2 parcial; 3 pendente. Ver "Implementação" no fim.

Proposta em 2026-08-10 (decidir com os números da etapa 1 da
[F028](../02-features/F028-desempenho.md) em mãos).

## Contexto
O relato de uso é "todas as interações com o site estão lentas". Antes de mexer
em código, três fatos de infra precisam de decisão registrada:

1. **Onde roda a função** — a Vercel usa `iad1` (Washington) por padrão.
2. **Onde está o banco** — Neon ([ADR-004](ADR-004-neon-postgres.md)), região
   escolhida na criação do projeto.
3. **Como a conexão é feita** — o `DATABASE_URL` atual não distingue endpoint
   direto e endpoint com pooler.

Isso importa porque a arquitetura é **síncrona e conversadora**: cada página
faz várias queries em sequência, e cada query paga um ida-e-volta. Com função e
banco distantes, **N queries = N × latência** — e é isso que vira "tudo lento",
não a velocidade do Postgres.

A distância do **aluno** até a Vercel é paga **uma vez** por requisição; a
distância da **função** até o banco é paga **por query**. Por isso a prioridade
é co-localizar função e banco, não aproximar o app do usuário.

Há ainda um item do [ADR-013](ADR-013-observabilidade.md) que atrapalha: o
sample de performance do Sentry foi fixado em **0** ("só erros no beta"). Sem
tracing, não há como provar nem refutar nada disso.

## Decisão

1. **Função e banco na mesma região.** `vercel.json` fixa `regions` na região
   do Neon. Preferência por São Paulo (`gru1` + Neon em região brasileira) **se
   disponível no plano**; se não houver, mantém-se a região atual do Neon e a
   função vai pra lá. **O critério é co-localização, não "ser no Brasil"** —
   1 salto extra do aluno até os EUA custa menos que 6 saltos da função até o
   banco.
2. **Endpoint com pooler.** `DATABASE_URL` usa o host `-pooler` do Neon
   (PgBouncer), com `connection_limit=1` — o padrão para serverless. O endpoint
   direto fica reservado às migrações (`DIRECT_URL`).
3. **Adendo ao ADR-013**: o sample de performance do Sentry deixa de ser 0.
   Passa a **0.1** (10% das requisições) em produção, com as rotas `/`,
   `/leads` e `/leads/[id]` instrumentadas. Sem isso, os ACs numéricos da F028
   não são verificáveis. A restrição de **nunca** enviar chave BYOK, magic link
   ou secret permanece integralmente.
4. **`GET /api/health` passa a reportar `db_rtt_ms` e a região da função.** É o
   número de referência do AC1 da F028 e o primeiro lugar a olhar quando
   alguém disser "está lento".

## Alternativas consideradas

| Opção | Avaliação |
|-------|-----------|
| **A — Co-localizar função e banco + pooler (escolhida)** | Maior ganho, risco baixo, custo zero, sem código |
| B — Só mudar a função pra `gru1`, banco onde está | Aproxima o aluno e **afasta** a função do banco: piora o que mais dói |
| C — Edge runtime nas páginas | Incompatível com Prisma/Node no caminho atual; reescrita grande |
| D — Driver serverless do Neon (`@prisma/adapter-neon`) | Pode ajudar em cold start; **dependência nova** — só com número que justifique, em ADR próprio |
| E — Cache de leitura entre requisições | Proibido pelo multi-tenant (F015): cache errado vaza dado entre alunos |
| F — Não medir e ir otimizando | Reprovado: é como o problema chegou até aqui |

## Consequências

### Positivas
- Latência por query cai de dezenas/centenas de ms para poucos ms.
- Pooler elimina o handshake por invocação e o risco de esgotar conexões
  quando vários alunos usarem ao mesmo tempo.
- Passa a existir um número objetivo (`db_rtt_ms`) pra qualquer conversa sobre
  lentidão.

### Negativas / a aceitar
- Mudar a região do Neon exige **migrar o banco** (criar projeto na região
  nova, restaurar, trocar `DATABASE_URL`) — janela de indisponibilidade curta,
  a agendar. Se o custo não se justificar, fica valendo a co-localização na
  região atual.
- Sample de tracing a 10% tem custo de plano no Sentry (pequeno neste volume) e
  aumenta o volume de eventos.
- `DIRECT_URL` adiciona uma variável de ambiente a gerenciar.

## Implementação (2026-08-16)

Os números que faltavam pra decidir apareceram testando o staging, e eles
confirmam o diagnóstico do contexto — não o refutam em nada:

| Medida | Valor |
|--------|-------|
| Região da função | `iad1` (Washington) — o default que o contexto previa |
| Região do Neon | `sa-east-1` (São Paulo) |
| `db_rtt_ms` com o banco quente | **232 ms** (alvo do próprio health: 15 ms) |
| `db_rtt_ms` na primeira chamada | 1.100–3.700 ms (Neon acordando) |

Função e banco estavam nos **extremos opostos** do continente. Numa arquitetura
que faz várias queries em sequência por página, esses 232 ms são pagos **por
query** — é exatamente o "tudo lento" do relato original.

**O que mudou:** `vercel.json` na raiz, com `regions: ["gru1"]`. Um arquivo de
três linhas, sem código.

A consequência negativa que o ADR mais temia — "mudar a região do Neon exige
migrar o banco" — **não se aplicou**: o Neon já estava em São Paulo. Quem estava
fora de lugar era a função. Isso também transforma a preferência por `gru1` de
"se disponível no plano" em fato: o time está no plano **Pro**, que permite
escolher a região, e `gru1` é ao mesmo tempo a co-localização (o critério real)
e o São Paulo (a preferência).

### Gate antes da `main` — resolvido em 2026-08-16

`vercel.json` vale pra **todos** os deploys, inclusive produção, e a medição
acima é do banco de **staging** (`f5ab45db`). Produção usa outro banco
(`9d254ad4`) e a região dele não sai da Vercel — as variáveis são `sensitive`.

O risco era concreto: se o Neon de produção estivesse fora de `sa-east-1`, este
arquivo *pioraria* produção, tirando a função de perto do banco pra deixá-la
perto do aluno — exatamente a **opção B** reprovada na tabela de alternativas.

**Confirmado pelo Ricardo: o Neon de produção também está em `sa-east-1` (São
Paulo).** Os dois bancos estão na mesma região, então `gru1` co-localiza os dois
ambientes e o arquivo pode ir pra `main` sem ressalva.

O número de produção segue não medido: ela roda um build anterior ao da decisão
4, então o `/api/health` de lá ainda não reporta região nem `db_rtt_ms`. Ele
passa a reportar no primeiro deploy depois do merge — e é lá que se confirma o
ganho em produção, sem precisar acreditar em ninguém.

### Estado das outras decisões

- **2 (pooler)** — parcial. O `DATABASE_URL` já usa o host `-pooler`, mas não há
  `DIRECT_URL` configurada: as migrações do staging foram rodadas à mão com o
  host direto derivado na hora. Falta a variável.
- **3 (sample do Sentry a 0.1)** — pendente.
- **4 (`/api/health` com região e `db_rtt_ms`)** — já estava implementada, e foi
  ela que produziu a tabela acima. Primeira vez que o ADR se pagou.
