-- CreateTable
CREATE TABLE "TransferenciaAtivacao" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "macOrigem" TEXT NOT NULL,
    "macDestino" TEXT NOT NULL,
    "tipo" "TipoAtivacao" NOT NULL,
    "dataExpiracao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferenciaAtivacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferenciaAtivacao_userId_idx" ON "TransferenciaAtivacao"("userId");

-- AddForeignKey
ALTER TABLE "TransferenciaAtivacao" ADD CONSTRAINT "TransferenciaAtivacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
