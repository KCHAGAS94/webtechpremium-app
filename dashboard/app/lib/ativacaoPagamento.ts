import prisma from '@/lib/prisma';
import { mpPaymentClient } from '@/lib/mercadopago';
import { isExpirado } from '@/lib/hls-url';
import { getOrCreateSystemUser } from '@/lib/systemUser';

// Aplica a ativação (tipo + dataExpiracao) na Lista do App daquele mac —
// criando o App se for a primeira vez que esse mac aparece. Existe no
// máximo uma Lista com `tipo` por App (mesma regra da tela "Ativação App"),
// então isso sempre atualiza a linha existente em vez de empilhar novas.
//
// Renovação soma a partir do vencimento atual quando a ativação em vigor
// ainda não expirou (em vez de recalcular do zero), pra quem paga de novo
// antes de vencer não perder o tempo que já tinha pago. Pagar VITALICIO
// sempre vira permanente, não importa o que havia antes; pagar ANUAL
// enquanto já é VITALICIO não faz nada (já é permanente).
async function aplicarAtivacao(mac: string, tipo: 'ANUAL' | 'VITALICIO') {
  const macAddress = mac.toUpperCase();

  const app = await prisma.app.upsert({
    where: { macAddress },
    update: {},
    create: {
      macAddress,
      name: macAddress,
      version: '1.0.0',
      userId: (await getOrCreateSystemUser()).id,
    },
  });

  const existente = await prisma.lista.findFirst({ where: { appId: app.id, tipo: { not: null } } });

  if (tipo === 'VITALICIO') {
    if (existente) {
      await prisma.lista.update({ where: { id: existente.id }, data: { tipo: 'VITALICIO', dataExpiracao: null } });
    } else {
      await prisma.lista.create({
        data: { appId: app.id, nome: 'Ativação Pix', url: '', tipo: 'VITALICIO', dataExpiracao: null },
      });
    }
    return;
  }

  if (existente?.tipo === 'VITALICIO') return;

  const base = existente?.dataExpiracao && !isExpirado(existente.dataExpiracao) ? existente.dataExpiracao : new Date();
  const novaData = new Date(base);
  novaData.setFullYear(novaData.getFullYear() + 1);

  if (existente) {
    await prisma.lista.update({ where: { id: existente.id }, data: { tipo: 'ANUAL', dataExpiracao: novaData } });
  } else {
    await prisma.lista.create({
      data: { appId: app.id, nome: 'Ativação Pix', url: '', tipo: 'ANUAL', dataExpiracao: novaData },
    });
  }
}

// Mesma máquina de idempotência de creditPurchase.ts::syncPaymentStatus,
// usada tanto pelo polling do front (/api/app/ativacao/status) quanto pelo
// webhook (/api/app/ativacao/webhook).
export async function syncAtivacaoPaymentStatus(mpPaymentId: string) {
  const compra = await prisma.ativacaoPagamento.findUnique({ where: { mpPaymentId } });
  if (!compra) return null;

  const payment = await mpPaymentClient.get({ id: mpPaymentId });
  const status = payment.status;
  const newStatus =
    status === 'approved' ? 'APPROVED' : status === 'rejected' || status === 'cancelled' ? 'REJECTED' : 'PENDING';

  if (newStatus === 'APPROVED') {
    const updated = await prisma.ativacaoPagamento.updateMany({
      where: { id: compra.id, status: 'PENDING' },
      data: { status: 'APPROVED' },
    });

    if (updated.count > 0) {
      await aplicarAtivacao(compra.mac, compra.tipo as 'ANUAL' | 'VITALICIO');
    }
  } else if (newStatus !== compra.status) {
    await prisma.ativacaoPagamento.update({ where: { id: compra.id }, data: { status: newStatus } });
  }

  return payment;
}
