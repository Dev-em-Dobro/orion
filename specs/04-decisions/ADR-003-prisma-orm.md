# ADR-003 — Prisma como ORM

## Status
Aceito — 2026-05-13

## Contexto
- Stack TypeScript (ver [ADR-001](./ADR-001-stack-typescript-nextjs.md)).
- Postgres como banco (ver [ADR-004](./ADR-004-neon-postgres.md)).
- Schema com poucas tabelas (Lead, Diagnóstico, Dor, Abordagem), mas com
  enums e relações 1-N.
- Necessidade de migrations versionadas, tipos derivados do schema e DX
  amigável pra dev solo.

## Decisão
Adotar **Prisma ORM** como camada de acesso ao banco.

- `prisma/schema.prisma` é a fonte do schema. Tipos TypeScript são
  derivados (`@prisma/client`), nunca duplicados manualmente.
- Migrations versionadas via `prisma migrate`.
- Acesso ao banco apenas em `src/lib/` (não em componentes nem
  diretamente em Server Actions — Server Actions chamam `lib/`).

## Alternativas consideradas
- **Drizzle**: query builder TS-first, schema em código, bundle pequeno.
  DX um pouco mais crua, mas excelente. Decidido por Prisma pela
  maturidade do tooling (Studio, migrate, generators) e familiaridade.
- **Kysely**: query builder puro, sem ORM. Ótimo controle, mas exige
  escrever boilerplate de CRUD à mão.
- **`pg` direto com SQL puro**: máximo de controle, mas verboso pra
  CRUD trivial e perde a tipagem automática.
- **TypeORM / MikroORM**: APIs herdadas do mundo Java/decorators, DX
  inferior pra projeto novo TS-first.

## Consequências

### Positivas
- Schema declarativo num único arquivo.
- Tipagem ponta-a-ponta gratuita.
- Migrations explícitas e versionadas.
- Prisma Studio como dashboard de banco grátis.
- Comunidade grande, docs boas.

### Negativas / a aceitar
- Bundle do `@prisma/client` é maior que de alternativas como Drizzle.
  Aceitável (deploy server-side, não vai pro browser).
- Prisma exige um passo de `prisma generate` no build. Resolvido com
  postinstall hook.
- Algumas queries complexas (CTEs, window functions) ainda exigem
  `$queryRaw`. Aceitável pelo escopo atual.
