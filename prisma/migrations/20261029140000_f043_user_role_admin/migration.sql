-- F043 — papel admin para /admin (grant acesso + trial).

ALTER TABLE "user" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

-- Backfill: e-mails de bootstrap / lista admin (preenchidos em runtime via requireAdmin).
-- Sem UPDATE aqui: a env não está no SQL; o self-heal no requireAdmin cobre.
