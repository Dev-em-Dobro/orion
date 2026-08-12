-- F018 — modo Orion/BYOK + cotas diárias por operação.

CREATE TYPE "KeyMode" AS ENUM ('orion', 'byok');

CREATE TYPE "QuotaOperacao" AS ENUM ('coleta', 'proposta', 'outreach', 'simulador_msg');

ALTER TABLE "user_api_keys" ADD COLUMN "key_mode" "KeyMode" NOT NULL DEFAULT 'orion';

CREATE TABLE "daily_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "operacao" "QuotaOperacao" NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_usage_user_id_data_operacao_key" ON "daily_usage"("user_id", "data", "operacao");

CREATE INDEX "daily_usage_user_id_data_idx" ON "daily_usage"("user_id", "data");

ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
