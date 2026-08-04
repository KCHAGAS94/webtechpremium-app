import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { mpPaymentClient, hasMercadoPagoAccessToken } from '@/lib/mercadopago';
import { findCreditPackage } from '@/lib/creditPackages';

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  if (!hasMercadoPagoAccessToken()) {
    return NextResponse.json(
      { error: 'Mercado Pago não configurado (MERCADOPAGO_ACCESS_TOKEN ausente)' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { credits, payment_method, payer, token, installments, payment_method_id, issuer_id } = body;

  const pkg = findCreditPackage(Number(credits));
  if (!pkg) {
    return NextResponse.json({ error: 'Pacote de créditos inválido' }, { status: 400 });
  }

  if (payment_method !== 'pix' && payment_method !== 'card') {
    return NextResponse.json({ error: 'payment_method inválido' }, { status: 400 });
  }

  try {
    if (payment_method === 'pix') {
      const appUrl = process.env.NEXT_PUBLIC_API_URL;
      const payment = await mpPaymentClient.create({
        body: {
          transaction_amount: pkg.amount,
          description: `${pkg.credits} créditos - WebTech Premium`,
          payment_method_id: 'pix',
          payer: {
            email: payer?.email || 'no-reply@webtechpremium.local',
            first_name: payer?.first_name || payer?.name || '',
          },
          ...(appUrl && { notification_url: `${appUrl}/api/creditos/webhook` }),
        },
      });

      await prisma.creditPurchase.create({
        data: {
          userId: auth.id,
          credits: pkg.credits,
          amount: pkg.amount,
          paymentMethod: 'PIX',
          status: 'PENDING',
          mpPaymentId: String(payment.id),
        },
      });

      return NextResponse.json(payment);
    }

    // card
    if (!token || !payment_method_id) {
      return NextResponse.json({ error: 'Dados do cartão incompletos' }, { status: 400 });
    }

    const requestedInstallments = Number(installments || 1);
    const safeInstallments = Math.min(Math.max(requestedInstallments, 1), 12);
    const appUrl = process.env.NEXT_PUBLIC_API_URL;

    const payment = await mpPaymentClient.create({
      body: {
        transaction_amount: pkg.amount,
        token,
        description: `${pkg.credits} créditos - WebTech Premium`,
        installments: safeInstallments,
        payment_method_id,
        issuer_id: issuer_id ? Number(issuer_id) : undefined,
        payer: {
          email: payer?.email || 'no-reply@webtechpremium.local',
          first_name: payer?.first_name || payer?.name || '',
          ...(payer?.identification && {
            identification: {
              type: payer.identification.type || 'CPF',
              number: payer.identification.number,
            },
          }),
        },
        ...(appUrl && { notification_url: `${appUrl}/api/creditos/webhook` }),
      },
    });

    await prisma.creditPurchase.create({
      data: {
        userId: auth.id,
        credits: pkg.credits,
        amount: pkg.amount,
        paymentMethod: 'CARD',
        status: payment.status === 'approved' ? 'APPROVED' : 'PENDING',
        mpPaymentId: String(payment.id),
      },
    });

    if (payment.status === 'approved') {
      await prisma.user.update({
        where: { id: auth.id },
        data: { credits: { increment: pkg.credits } },
      });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('[creditos/pagamento] erro', error);

    const errorDescription = error?.cause?.[0]?.description;
    const userMessage = errorDescription || error?.message || 'Erro ao processar pagamento';

    return NextResponse.json({ error: userMessage }, { status: 400 });
  }
}
