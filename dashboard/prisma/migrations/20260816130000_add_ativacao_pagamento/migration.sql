-- CreateTable
CREATE TABLE "AtivacaoPagamento" (
    "id" SERIAL NOT NULL,
    "mac" TEXT NOT NULL,
    "tipo" "TipoAtivacao" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CreditPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "mpPaymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtivacaoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtivacaoPagamento_mpPaymentId_key" ON "AtivacaoPagamento"("mpPaymentId");

-- CreateIndex
CREATE INDEX "AtivacaoPagamento_mac_idx" ON "AtivacaoPagamento"("mac");
