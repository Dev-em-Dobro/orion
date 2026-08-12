-- F019 — entitlements Hubla + idempotência webhook.

CREATE TYPE "HublaEntitlementStatus" AS ENUM ('ativo', 'revogado');

CREATE TABLE "hubla_entitlement" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "status" "HublaEntitlementStatus" NOT NULL DEFAULT 'ativo',
    "hubla_user_id" TEXT,
    "subscription_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hubla_entitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hubla_entitlement_email_product_id_key" ON "hubla_entitlement"("email", "product_id");
CREATE INDEX "hubla_entitlement_email_idx" ON "hubla_entitlement"("email");
CREATE INDEX "hubla_entitlement_status_idx" ON "hubla_entitlement"("status");

CREATE TABLE "hubla_webhook_delivery" (
    "idempotency_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hubla_webhook_delivery_pkey" PRIMARY KEY ("idempotency_key")
);
