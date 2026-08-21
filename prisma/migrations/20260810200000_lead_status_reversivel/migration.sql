-- F024 — estado do Lead reversível.
-- Spec: /specs/02-features/F024-estado-do-lead-reversivel.md

-- AlterEnum
-- `descartado`: terminal lateral, reversível. Não confundir com `perdido`
-- (resultado de venda) — aqui é limpeza de base e fica fora do funil.
ALTER TYPE "LeadStatus" ADD VALUE 'descartado';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "motivo_descarte" TEXT,
ADD COLUMN     "status_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: para os Leads que já existem, a melhor aproximação de "quando o
-- status atual foi assumido" é a última escrita no Lead. Sem isso, toda a base
-- antiga nasceria com status_em = agora e a Central de Tarefas (F031) acharia
-- que nada está parado.
UPDATE "Lead" SET "status_em" = "updated_at";
