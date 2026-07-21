-- F015 / ADR-008 — row-level tenancy: user_id em entidades de domínio + UserApiKeys.
-- Backfill: Lead recebe o User mais antigo; filhos herdam via lead_id.
-- Requisito: se existem Leads e nenhum User, a migração falha (faça login uma vez).

-- 1) Colunas nullable
ALTER TABLE "Lead" ADD COLUMN "user_id" TEXT;
ALTER TABLE "Diagnostico" ADD COLUMN "user_id" TEXT;
ALTER TABLE "Dor" ADD COLUMN "user_id" TEXT;
ALTER TABLE "Outreach" ADD COLUMN "user_id" TEXT;

-- 2) Backfill
DO $$
DECLARE
  owner_id TEXT;
  lead_count INT;
BEGIN
  SELECT COUNT(*) INTO lead_count FROM "Lead";
  SELECT id INTO owner_id FROM "user" ORDER BY "createdAt" ASC LIMIT 1;

  IF lead_count > 0 AND owner_id IS NULL THEN
    RAISE EXCEPTION
      'F015 backfill: existem Leads sem User. Faça login uma vez (cria User) e rode a migração de novo.';
  END IF;

  IF owner_id IS NOT NULL THEN
    UPDATE "Lead" SET "user_id" = owner_id WHERE "user_id" IS NULL;

    UPDATE "Diagnostico" d
    SET "user_id" = l."user_id"
    FROM "Lead" l
    WHERE d."lead_id" = l."id" AND d."user_id" IS NULL;

    UPDATE "Dor" d
    SET "user_id" = l."user_id"
    FROM "Lead" l
    WHERE d."lead_id" = l."id" AND d."user_id" IS NULL;

    UPDATE "Outreach" o
    SET "user_id" = l."user_id"
    FROM "Lead" l
    WHERE o."lead_id" = l."id" AND o."user_id" IS NULL;
  END IF;
END $$;

-- 3) NOT NULL + FKs + índices
ALTER TABLE "Lead" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "Diagnostico" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "Dor" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "Outreach" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Diagnostico" ADD CONSTRAINT "Diagnostico_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dor" ADD CONSTRAINT "Dor_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Lead_user_id_idx" ON "Lead"("user_id");
CREATE INDEX "Diagnostico_user_id_idx" ON "Diagnostico"("user_id");
CREATE INDEX "Dor_user_id_idx" ON "Dor"("user_id");
CREATE INDEX "Outreach_user_id_idx" ON "Outreach"("user_id");

-- 4) place_id unique por aluno
DROP INDEX IF EXISTS "Lead_place_id_key";
CREATE UNIQUE INDEX "Lead_user_id_place_id_key" ON "Lead"("user_id", "place_id");

-- 5) Stub UserApiKeys (campos BYOK na F016)
CREATE TABLE "user_api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_api_keys_user_id_key" ON "user_api_keys"("user_id");
CREATE INDEX "user_api_keys_user_id_idx" ON "user_api_keys"("user_id");

ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
