-- AlterTable
ALTER TABLE "Lista" ADD COLUMN "criadoPorId" INTEGER;

-- Backfill: para linhas já existentes não há registro de quem clicou
-- "Adicionar", então usamos o dono do App (melhor aproximação disponível)
-- para não fazer cadastros existentes sumirem da tela de quem já os via.
UPDATE "Lista" l
SET "criadoPorId" = a."userId"
FROM "App" a
WHERE l."appId" = a."id";

-- CreateIndex
CREATE INDEX "Lista_criadoPorId_idx" ON "Lista"("criadoPorId");

-- AddForeignKey
ALTER TABLE "Lista" ADD CONSTRAINT "Lista_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
