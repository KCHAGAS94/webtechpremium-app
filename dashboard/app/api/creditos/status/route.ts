import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { hasMercadoPagoAccessToken } from '@/lib/mercadopago';
import { syncPaymentStatus } from '@/lib/creditPurchase';

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
    const payment = await syncPaymentStatus(id);
    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('[creditos/status] erro', error);
    return NextResponse.json({ error: error?.message || 'Erro ao consultar pagamento' }, { status: 500 });
  }
}
