-- CreateEnum
CREATE TYPE "ListaOrigem" AS ENUM ('PAINEL', 'APP');

-- AlterTable
ALTER TABLE "Lista" ADD COLUMN "origem" "ListaOrigem" NOT NULL DEFAULT 'PAINEL';
