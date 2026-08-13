# ADR-002 — Sem workers / filas na Fase 1

## Status
Aceito — 2026-05-13

## Contexto
- 1 usuário operando, esporadicamente (algumas vezes por semana).
- Operações típicas (coletar Leads, rodar Diagnóstico, gerar Abordagem)
  são acionadas manualmente.
- Tolerância a latência: até ~30s por operação é aceitável — o usuário
  pode esperar a barrinha rodar.
- Não há nenhuma operação que precise rodar fora do horário de uso.
- Cada peça de infra adicional (Redis, fila, scheduler) tem custo de
  setup, custo de manutenção e custo financeiro mensal.

## Decisão
Na Fase 1, **toda operação roda sincronamente via Server Actions do Next.js**.

- Nada de Celery, BullMQ, Inngest, Vercel Cron, Quirrel, etc.
- A UI bloqueia (com loading state) durante a operação.
- A lógica fica em `src/lib/` (puramente domínio, sem dependência de
  Next), de forma que migrar pra worker no futuro seja trivial.

## Alternativas consideradas
- **Inngest**: ótimo DX, mas overkill pro volume atual (zero jobs
  agendados, zero retries necessários).
- **Vercel Cron**: nada precisa rodar agendado nesta fase.
- **BullMQ + Redis**: requer infra paga (Redis gerenciado), zero retorno
  pro caso de uso atual.
- **`after()` do Next.js (background tasks)**: tentador, mas mascara
  erros e não é observável. Quando precisar, prefiro adotar uma solução
  explícita.

## Consequências

### Positivas
- Simplicidade máxima: um único processo, um único deploy, zero infra
  acessória.
- Tracing trivial: stack trace direto da Server Action.
- Custo mensal próximo de zero.

### Negativas / a aceitar
- UI bloqueia durante operações longas. Aceitável porque é ferramenta
  interna, monousuário.
- Operações > 60s podem bater no timeout da Vercel (varia por plano).
  Se acontecer, é sinal pra fragmentar a operação ou migrar pra worker.
- Quando o volume crescer ou o operador quiser "deixar rodando à
  noite", esta ADR precisa ser substituída — daí a importância de
  manter a lógica de domínio isolada em `src/lib/`.
