-- F026 — sinal de atendimento automatizado no WhatsApp.
-- Spec: /specs/02-features/F026-sinal-atendimento-automatizado.md
--
-- Diagnósticos antigos ficam em `nao_avaliado` (default): não reprocessamos a
-- base — o sinal aparece no próximo Diagnóstico de cada Lead.

-- CreateEnum
CREATE TYPE "AtendimentoAutomatizado" AS ENUM ('detectado', 'indicios', 'nao_detectado', 'nao_avaliado');

-- AlterEnum
ALTER TYPE "TipoDor" ADD VALUE 'SEM_ATENDIMENTO_AUTOMATIZADO';

-- AlterTable
ALTER TABLE "Diagnostico" ADD COLUMN     "atendimento_automatizado" "AtendimentoAutomatizado" NOT NULL DEFAULT 'nao_avaliado',
ADD COLUMN     "atendimento_evidencia" TEXT;
