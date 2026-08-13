# ADR-008 — Multi-tenant por `user_id` (tenancy por linha)

## Status
Aceito — 2026-07-13 (decisão registrada em
[07 · Decisões tomadas](../07-lancamento-para-alunos.md))

## Contexto
Na Fase 1 todas as queries são **globais** (um operador). Na Fase 2 cada aluno
tem os seus dados e **não pode** ver os de outro. É uma decisão de **arquitetura
de dados** transversal (como o [ADR-002](ADR-002-sem-workers-fase-1.md) "sem
workers"), por isso um ADR — mesmo sem lib nova.

Duas formas de isolar tenants:
1. **Row-level** — um schema, coluna `user_id` (FK) em cada tabela de tenant,
   toda query filtrada por `user_id`.
2. **Schema/DB por tenant** — um schema (ou banco) por aluno.

## Decisão
**Row-level tenancy: um schema compartilhado com `user_id`.**

- `user_id` (FK → `User`) em **Lead, Diagnóstico, Dor, Abordagem** (+ índice por
  `user_id`) e em `UserApiKeys` ([F016](../02-features/F016-configuracao-de-chaves.md)).
- **Toda** query e Server Action filtra por `user_id` da sessão, obtido via
  `requireUser()` ([ADR-007](ADR-007-better-auth.md)). Sem exceção: coletar,
  diagnosticar, priorizar, abordagem, follow-up, desfecho, proposta, objeções,
  simulador, dashboard, treino.
- `revalidatePath` e qualquer cache revistos pra **não vazar** entre usuários.
- **Teste de isolamento** obrigatório: aluno A nunca acessa dado de B (F015, AC).
- Detalhe do domínio (`user_id` nas entidades) reflete na
  [01-domain-model](../01-domain-model.md) junto da implementação da F015.

## Alternativas consideradas
- **Schema/DB por aluno**: rejeitado — multiplica migrações (`migrate` N vezes),
  conexões e custo; operacionalmente pesado pra uma turma de alunos, sem ganho
  real de isolamento sobre row-level bem feito.
- **Postgres RLS (Row-Level Security)**: bom como defesa em profundidade, mas
  adiciona complexidade de policies/roles; o escopo por aplicação (`requireUser`
  + filtro) basta pro MVP. **Reavaliar RLS pós-beta** como camada extra.

## Consequências
### Positivas
- Padrão SaaS simples, um banco só (casa com Neon + "sem infra pesada").
- Migração incremental: adicionar coluna + backfill + passar a filtrar.

### Negativas / a aceitar
- Isolamento depende de **disciplina de código** (todo acesso via `requireUser`
  + filtro). Mitigado por: helper único de query por tenant e teste de
  isolamento no CI/manual.
- Backfill dos dados existentes (Fase 1) precisa de um `user_id` de destino
  (conta do operador atual) na migração.
