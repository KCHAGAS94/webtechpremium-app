import prisma from '@/lib/prisma';
import { mpPaymentClient } from '@/lib/mercadopago';

// Aplica o status vindo do Mercado Pago a uma CreditPurchase, somando os
// créditos ao User quando aprovado. Usado tanto pelo polling do front
// (/api/creditos/status) quanto pelo webhook (/api/creditos/webhook), então
// os dois caminhos ficam com a mesma garantia de idempotência.
export async function syncPaymentStatus(mpPaymentId: string) {
  const purchase = await prisma.creditPurchase.findUnique({ where: { mpPaymentId } });
  if (!purchase) return null;

  const payment = await mpPaymentClient.get({ id: mpPaymentId });
  const status = payment.status;
  const newStatus =
    status === 'approved' ? 'APPROVED' : status === 'rejected' || status === 'cancelled' ? 'REJECTED' : 'PENDING';

  if (newStatus === 'APPROVED') {
    // updateMany com where status: PENDING garante que o crédito só é
    // somado uma vez, mesmo que status e webhook cheguem em paralelo.
    const updated = await prisma.creditPurchase.updateMany({
      where: { id: purchase.id, status: 'PENDING' },
      data: { status: 'APPROVED' },
    });

    if (updated.count > 0) {
      await prisma.user.update({
        where: { id: purchase.userId },
        data: { credits: { increment: purchase.credits } },
      });
    }
  } else if (newStatus !== purchase.status) {
    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { status: newStatus },
    });
  }

  return payment;
}
