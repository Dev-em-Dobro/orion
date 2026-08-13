-- Rename de linguagem ubíqua: Outreach -> Abordagem ("outreach" ninguém fala).
--
-- Escrita à mão de propósito. O `prisma migrate dev` geraria DROP TYPE +
-- CREATE TYPE pros enums, o que apagaria os contadores de cota já gravados.
-- `RENAME VALUE` preserva as linhas: é troca de rótulo, não de dado.
--
-- A TABELA "Outreach" NÃO é renomeada — o model Prisma aponta pra ela por
-- @@map. Renomear tabela é migração destrutiva com janela de indisponibilidade,
-- e o nome físico não é lido por ninguém.

ALTER TYPE "QuotaOperacao" RENAME VALUE 'outreach' TO 'abordagem';
ALTER TYPE "OperacaoMensal" RENAME VALUE 'outreach' TO 'abordagem';
