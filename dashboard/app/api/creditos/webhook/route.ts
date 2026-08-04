import { NextRequest, NextResponse } from 'next/server';
import { hasMercadoPagoAccessToken } from '@/lib/mercadopago';
import { syncPaymentStatus } from '@/lib/creditPurchase';

// Recebido pelo Mercado Pago sempre que o status de um pagamento muda
// (ex: Pix aprovado). Garante que os créditos sejam liberados mesmo que o
// usuário tenha fechado a aba antes do polling de /api/creditos/status
// confirmar o pagamento. Configurado como notification_url na criação do
// pagamento em /api/creditos/pagamento.
export async function POST(request: NextRequest) {
  if (!hasMercadoPagoAccessToken()) {
    return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
  }

  let paymentId: string | null = null;
  try {
    const body = await request.json().catch(() => null);
    paymentId = body?.data?.id ? String(body.data.id) : null;
  } catch {
    // corpo vazio/inválido — tenta pelos query params abaixo
  }

  if (!paymentId) {
    paymentId = request.nextUrl.searchParams.get('data.id') || request.nextUrl.searchParams.get('id');
  }

  if (!paymentId) {
    return NextResponse.json({ error: 'id do pagamento ausente' }, { status: 400 });
  }

  try {
    await syncPaymentStatus(paymentId);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[creditos/webhook] erro', error);
    // 200 mesmo em erro evita que o Mercado Pago fique reenviando
    // indefinidamente uma notificação para um pagamento que não existe aqui.
    return NextResponse.json({ received: true });
  }
}
