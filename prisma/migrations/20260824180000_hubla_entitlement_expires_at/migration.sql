-- F035 — cortesia Pro por aluno (expires_at no HublaEntitlement).

ALTER TABLE "hubla_entitlement" ADD COLUMN "expires_at" TIMESTAMP(3);
