-- F025 — Triagem (score estimado) e cota de diagnóstico.
-- Spec: /specs/02-features/F025-fila-do-dia.md

-- AlterEnum
ALTER TYPE "QuotaOperacao" ADD VALUE 'diagnostico';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "score_estimado" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: Lead com score > 0 foi priorizado a partir de um Diagnóstico real
-- (era o único caminho antes da F025), então o score dele é confirmado.
-- Score 0 = nunca priorizado → segue como estimado (default).
UPDATE "Lead" SET "score_estimado" = false WHERE "score" > 0;
