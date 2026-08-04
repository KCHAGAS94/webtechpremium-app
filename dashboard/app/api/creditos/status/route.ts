import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { mpPaymentClient, hasMercadoPagoAccessToken } from '@/lib/mercadopago';

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  if (!hasMercadoPagoAccessToken()) {
    return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 });
  }

  const purchase = await prisma.creditPurchase.findUnique({ where: { mpPaymentId: id } });
  if (!purchase || purchase.userId !== auth.id) {
    return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
  }

  try {
    const payment = await mpPaymentClient.get({ id });
    const status = payment.status;
    const newStatus = status === 'approved' ? 'APPROVED' : status === 'rejected' || status === 'cancelled' ? 'REJECTED' : 'PENDING';

    if (newStatus === 'APPROVED') {
      // updateMany com where status: PENDING garante que o crédito só é
      // somado uma vez, mesmo que o polling chegue aqui mais de uma vez.
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

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('[creditos/status] erro', error);
    return NextResponse.json({ error: error?.message || 'Erro ao consultar pagamento' }, { status: 500 });
  }
}
