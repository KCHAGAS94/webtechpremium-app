import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hasMercadoPagoAccessToken } from '@/lib/mercadopago';
import { syncAtivacaoPaymentStatus } from '@/lib/ativacaoPagamento';
import { corsPreflight, withCors } from '@/lib/cors';

export function OPTIONS() {
  return corsPreflight();
}

// Polling do front público (tela "Ativar Dispositivo") enquanto aguarda o
// Pix ser pago. Sem auth — o próprio mpPaymentId (id do pagamento) já é a
// única coisa que dá acesso a esse registro, mesmo padrão de
// /api/creditos/status.
export async function GET(request: NextRequest) {
  if (!hasMercadoPagoAccessToken()) {
    return withCors(NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 }));
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return withCors(NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 }));
  }

  const compra = await prisma.ativacaoPagamento.findUnique({ where: { mpPaymentId: id } });
  if (!compra) {
    return withCors(NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 }));
  }

  try {
    const payment = await syncAtivacaoPaymentStatus(id);
    return withCors(NextResponse.json(payment));
  } catch (error: any) {
    console.error('[app/ativacao/status] erro', error);
    return withCors(NextResponse.json({ error: error?.message || 'Erro ao consultar pagamento' }, { status: 500 }));
  }
}
