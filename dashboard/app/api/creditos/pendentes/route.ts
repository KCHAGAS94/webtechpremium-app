import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { hasMercadoPagoAccessToken } from '@/lib/mercadopago';
import { syncPaymentStatus } from '@/lib/creditPurchase';

// Rede de segurança além do webhook: sempre que o usuário abre a tela de
// créditos, reconcilia qualquer CreditPurchase que ficou PENDING (ex: o
// usuário fechou a aba antes da confirmação e o webhook não chegou a ser
// configurado/entregue) diretamente com o status atual no Mercado Pago.
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  if (!hasMercadoPagoAccessToken()) {
    return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
  }

  const pending = await prisma.creditPurchase.findMany({
    where: { userId: auth.id, status: 'PENDING' },
  });

  let approvedCount = 0;
  for (const purchase of pending) {
    try {
      const payment = await syncPaymentStatus(purchase.mpPaymentId);
      if (payment?.status === 'approved') approvedCount++;
    } catch (error) {
      console.error('[creditos/pendentes] erro ao sincronizar', purchase.mpPaymentId, error);
    }
  }

  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { credits: true } });
  return NextResponse.json({ credits: user?.credits ?? 0, approvedCount });
}
