-- F019.1 — campos de verificação de compra Hubla no User.

ALTER TABLE "user" ADD COLUMN "purchaseEmail" TEXT;
ALTER TABLE "user" ADD COLUMN "purchaseVerifiedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "purchaseProductId" TEXT;

CREATE INDEX "user_purchaseEmail_idx" ON "user"("purchaseEmail");
