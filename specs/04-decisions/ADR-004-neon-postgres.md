# ADR-004 — Neon como provedor de Postgres

## Status
Aceito — 2026-05-13

## Contexto
- Precisa de Postgres gerenciado: zero infra, zero backups manuais.
- Custo precisa ser próximo de zero — ferramenta interna, sem receita
  direta.
- Padrão de uso é esporádico (ver [ADR-002](./ADR-002-sem-workers-fase-1.md)),
  então **scale-to-zero** entre usos é desejável.
- Branching de banco facilita testar migrations sem medo.

## Decisão
Adotar **Neon** (neon.tech) como provedor de Postgres.

- Free tier inicial.
- Branching por feature quando necessário (ex.: testar migration nova).
- Connection string via `DATABASE_URL` no `.env`.

## Alternativas consideradas
- **Supabase**: ótimo, mas traz auth, storage, realtime — features que
  não vou usar e que aumentam superfície/complexidade. Postgres puro é
  o que preciso.
- **Railway / Fly Postgres**: ~$5/mês fixo, sem scale-to-zero.
  Pra uso esporádico, é desperdício.
- **SQLite + Turso**: tentador pela simplicidade, mas perde JSONB e
  full-text search nativos do Postgres, que provavelmente serão úteis
  pra detalhes de Dor e busca em Abordagem.
- **RDS / Cloud SQL**: custo e setup completamente desproporcionais.

## Consequências

### Positivas
- Custo zero no free tier (suficiente pra Fase 1).
- Branching facilita testes de migration.
- Postgres real, sem lock-in proprietário (string de conexão padrão).
- Provider stable, com integração direta com Vercel.

### Negativas / a aceitar
- **Cold start de ~500ms** após scale-to-zero. Aceitável (operações
  já levam segundos), mas notável na primeira request da sessão.
- Free tier tem limites (storage, compute time). Pra esta fase é
  abundante; quando virar restritivo, esta ADR deve ser revisitada.
- Se um dia o projeto virar multi-tenant ou tiver clientes em SLA,
  reavaliar (provavelmente Supabase ou RDS).
