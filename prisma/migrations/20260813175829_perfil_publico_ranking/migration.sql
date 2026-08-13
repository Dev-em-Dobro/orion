-- CreateTable
CREATE TABLE "perfil_publico" (
    "user_id" TEXT NOT NULL,
    "ranking_optin" BOOLEAN NOT NULL DEFAULT false,
    "nome_exibicao" TEXT NOT NULL,
    "optin_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_publico_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "Lead_status_status_em_idx" ON "Lead"("status", "status_em");

-- AddForeignKey
ALTER TABLE "perfil_publico" ADD CONSTRAINT "perfil_publico_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
