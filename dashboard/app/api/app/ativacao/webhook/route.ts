import { NextRequest, NextResponse } from 'next/server';
import { hasMercadoPagoAccessToken } from '@/lib/mercadopago';
import { syncAtivacaoPaymentStatus } from '@/lib/ativacaoPagamento';

// Recebido pelo Mercado Pago quando o status de um Pix de ativação muda.
// Garante que a ativação seja aplicada mesmo que o cliente tenha fechado a
// aba antes do polling de /api/app/ativacao/status confirmar. Configurado
// como notification_url na criação do pagamento em .../pagamento.
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
    await syncAtivacaoPaymentStatus(paymentId);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[app/ativacao/webhook] erro', error);
    // 200 mesmo em erro evita que o Mercado Pago fique reenviando
    // indefinidamente uma notificação para um pagamento que não existe aqui.
    return NextResponse.json({ received: true });
  }
}
