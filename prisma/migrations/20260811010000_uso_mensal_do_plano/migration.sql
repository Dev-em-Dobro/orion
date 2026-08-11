-- F035 — medidor mensal do plano (Leads diagnosticados na competência).
-- Spec: /specs/02-features/F035-planos-e-limites.md
--
-- Sem enum `Plano` no banco: o plano é derivado dos HublaEntitlement ativos,
-- não persistido. Um enum sem coluna seria schema morto.

CREATE TABLE "uso_mensal" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "leads_diagnosticados" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uso_mensal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uso_mensal_user_id_competencia_key"
    ON "uso_mensal"("user_id", "competencia");

CREATE INDEX "uso_mensal_user_id_idx" ON "uso_mensal"("user_id");

ALTER TABLE "uso_mensal" ADD CONSTRAINT "uso_mensal_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
