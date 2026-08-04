-- CreateEnum
CREATE TYPE "TipoAtivacao" AS ENUM ('ANUAL', 'VITALICIO');

-- AlterTable
ALTER TABLE "Lista" ADD COLUMN "tipo" "TipoAtivacao";
