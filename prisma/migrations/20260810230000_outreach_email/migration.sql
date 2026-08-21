-- F027 — Outreach por e-mail.
-- Spec: /specs/02-features/F027-outreach-por-email.md
--
-- O e-mail é capturado do site que o próprio Lead publicou no Places
-- (ADR-016). Envio pela plataforma segue fora de escopo: o Orion prepara, o
-- cliente de e-mail do aluno envia.

-- CreateEnum
CREATE TYPE "EmailOrigem" AS ENUM ('site', 'manual');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "email" TEXT,
ADD COLUMN     "email_origem" "EmailOrigem";

-- AlterTable
ALTER TABLE "Outreach" ADD COLUMN     "assunto" TEXT;
