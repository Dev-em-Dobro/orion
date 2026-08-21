-- CreateEnum
CREATE TYPE "OperacaoMensal" AS ENUM ('lead_novo', 'outreach', 'proposta', 'objecoes', 'agente_msg', 'simulador_msg');

-- DropIndex
DROP INDEX "user_purchaseEmail_idx";

-- CreateTable
CREATE TABLE "uso_mensal_operacao" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "operacao" "OperacaoMensal" NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uso_mensal_operacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uso_mensal_operacao_user_id_competencia_idx" ON "uso_mensal_operacao"("user_id", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "uso_mensal_operacao_user_id_competencia_operacao_key" ON "uso_mensal_operacao"("user_id", "competencia", "operacao");

-- AddForeignKey
ALTER TABLE "uso_mensal_operacao" ADD CONSTRAINT "uso_mensal_operacao_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
