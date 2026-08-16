import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { mpPaymentClient, hasMercadoPagoAccessToken } from '@/lib/mercadopago';
import { ATIVACAO_PRECOS, isTipoAtivacaoPix } from '@/lib/ativacaoPricing';
import { corsPreflight, withCors } from '@/lib/cors';

export function OPTIONS() {
  return corsPreflight();
}

// Gera um Pix pra ativação direta do cliente final, sem revendedor no meio
// — página pública "Ativar Dispositivo". Sem auth: o mac é só um campo do
// formulário, não uma credencial (mesmo modelo que /api/devices).
export async function POST(request: NextRequest) {
  if (!hasMercadoPagoAccessToken()) {
    return withCors(
      NextResponse.json({ error: 'Mercado Pago não configurado (MERCADOPAGO_ACCESS_TOKEN ausente)' }, { status: 500 })
    );
  }

  const { mac, tipo, payer } = await request.json();

  if (!mac || typeof mac !== 'string') {
    return withCors(NextResponse.json({ error: 'MAC é obrigatório' }, { status: 400 }));
  }
  if (!isTipoAtivacaoPix(tipo)) {
    return withCors(NextResponse.json({ error: 'Tipo de ativação inválido' }, { status: 400 }));
  }

  const macAddress = mac.toUpperCase();
  const amount = ATIVACAO_PRECOS[tipo];

  try {
    const appUrl = process.env.NEXT_PUBLIC_API_URL;
    const payment = await mpPaymentClient.create({
      body: {
        transaction_amount: amount,
        description: `Ativação ${tipo === 'ANUAL' ? 'Anual' : 'Vitalícia'} - ${macAddress} - WebTech Premium`,
        payment_method_id: 'pix',
        payer: {
          email: payer?.email || 'no-reply@webtechpremium.local',
          first_name: payer?.first_name || payer?.name || '',
        },
        ...(appUrl && { notification_url: `${appUrl}/api/app/ativacao/webhook` }),
      },
    });

    await prisma.ativacaoPagamento.create({
      data: {
        mac: macAddress,
        tipo,
        amount,
        status: 'PENDING',
        mpPaymentId: String(payment.id),
      },
    });

    return withCors(NextResponse.json(payment));
  } catch (error: any) {
    console.error('[app/ativacao/pagamento] erro', error);
    const errorDescription = error?.cause?.[0]?.description;
    const userMessage = errorDescription || error?.message || 'Erro ao gerar Pix';
    return withCors(NextResponse.json({ error: userMessage }, { status: 400 }));
  }
}
