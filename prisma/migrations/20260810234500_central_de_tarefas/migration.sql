-- F031 — Central de Tarefas: o Orion cobra o que ficou parado.
-- Spec: /specs/02-features/F031-central-de-tarefas.md
--
-- A Tarefa é derivada do estado, não persistida. Esta tabela guarda só o que
-- o aluno adiou ou dispensou — com o `marco` do fato que a originou, pra que
-- a cobrança volte quando o fato mudar (nova Outreach, status novo).

-- CreateEnum
CREATE TYPE "TipoTarefa" AS ENUM ('CONFIRMAR_RESPOSTA', 'MANDAR_FOLLOWUP', 'ENVIAR_ABORDAGEM', 'AVANCAR_RESPONDEU', 'COBRAR_PROPOSTA', 'APROFUNDAR_FILA');

-- CreateTable
CREATE TABLE "tarefa_adiamento" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "tipo" "TipoTarefa" NOT NULL,
    "marco" TIMESTAMP(3) NOT NULL,
    "adiada_ate" TIMESTAMP(3),
    "dispensada_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefa_adiamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarefa_adiamento_user_id_idx" ON "tarefa_adiamento"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tarefa_adiamento_user_id_lead_id_tipo_key" ON "tarefa_adiamento"("user_id", "lead_id", "tipo");

-- AddForeignKey
ALTER TABLE "tarefa_adiamento" ADD CONSTRAINT "tarefa_adiamento_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_adiamento" ADD CONSTRAINT "tarefa_adiamento_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

