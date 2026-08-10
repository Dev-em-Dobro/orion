-- F028 — índices de desempenho.
-- Spec: /specs/02-features/F028-desempenho.md (hipótese H4)
--
-- Sem estes índices, a ordenação da lista `/leads` (score desc, created_at
-- desc) é Seq Scan + Sort a cada request, e a fila de follow-up varre as
-- Outreaches do tenant inteiro.
--
-- CREATE INDEX comum (não CONCURRENTLY): o Prisma roda a migração dentro de
-- uma transação, onde CONCURRENTLY é proibido. Nos volumes atuais o lock é de
-- milissegundos; se a base crescer muito, criar o índice à mão com
-- CONCURRENTLY antes de aplicar a migração.

-- CreateIndex
CREATE INDEX "Lead_user_id_score_created_at_idx" ON "Lead"("user_id", "score" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "Lead_user_id_status_idx" ON "Lead"("user_id", "status");

-- CreateIndex
CREATE INDEX "Diagnostico_lead_id_executado_em_idx" ON "Diagnostico"("lead_id", "executado_em" DESC);

-- CreateIndex
CREATE INDEX "Outreach_lead_id_enviado_enviado_em_idx" ON "Outreach"("lead_id", "enviado", "enviado_em" DESC);
