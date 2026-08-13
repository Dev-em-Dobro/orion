-- F035/F038 — `email` sai do enum Canal.
--
-- Postgres não remove valor de enum: o tipo é recriado e a coluna migrada.
-- A conversão `USING canal::text::"Canal"` FALHA se sobrar alguma linha com
-- 'email' — e isso é o comportamento desejado, não um acidente:
--
--   uma Abordagem com canal=email é REGISTRO DE CONTATO QUE FOI FEITO. Apagar
--   ou reescrever pra 'whatsapp' seria mentir sobre o histórico do aluno.
--
-- O bloco abaixo antecipa a falha com uma mensagem acionável, em vez de deixar
-- o erro cru do cast aparecer no deploy.
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM "Outreach" WHERE canal = 'email';
  IF n > 0 THEN
    RAISE EXCEPTION
      'Existem % Abordagem(ns) com canal=email. Decida o que fazer com esse histórico ANTES de rodar esta migração (arquivar, exportar, ou manter o valor no enum).', n;
  END IF;
END $$;

ALTER TYPE "Canal" RENAME TO "Canal_old";
CREATE TYPE "Canal" AS ENUM ('whatsapp', 'ligacao');
ALTER TABLE "Outreach"
  ALTER COLUMN "canal" TYPE "Canal" USING "canal"::text::"Canal";
DROP TYPE "Canal_old";
