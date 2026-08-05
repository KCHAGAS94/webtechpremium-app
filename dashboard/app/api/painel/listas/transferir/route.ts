import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Move uma ativação (Lista com `tipo` preenchido) de um MAC para outro sem
// cobrar créditos de novo: tipo e dataExpiracao são preservados, só o
// dispositivo (App) muda. O MAC de origem some do painel se não sobrar
// nenhuma outra lista nele.
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id, novoMac } = await request.json();

  if (!id || !novoMac) {
    return NextResponse.json({ error: 'id e novoMac são obrigatórios' }, { status: 400 });
  }

  const novoMacAddress = String(novoMac).toUpperCase();

  const lista = await prisma.lista.findUnique({ where: { id: Number(id) }, include: { app: true } });
  if (!lista || (auth.role !== 'ADMIN' && lista.app.userId !== auth.id)) {
    return NextResponse.json({ error: 'Ativação não encontrada' }, { status: 404 });
  }

  if (!lista.tipo) {
    return NextResponse.json({ error: 'Só é possível transferir uma ativação (Anual ou Vitalício)' }, { status: 400 });
  }

  if (novoMacAddress === lista.app.macAddress) {
    return NextResponse.json({ error: 'O novo MAC precisa ser diferente do atual' }, { status: 400 });
  }

  const appDestino = await prisma.app.findUnique({
    where: { macAddress: novoMacAddress },
    include: { listas: { where: { tipo: { not: null } } } },
  });

  if (appDestino) {
    if (auth.role !== 'ADMIN' && appDestino.userId !== auth.id) {
      return NextResponse.json({ error: 'MAC de destino pertence a outro revendedor' }, { status: 403 });
    }
    if (appDestino.listas.length > 0) {
      return NextResponse.json({ error: 'MAC de destino já possui uma ativação' }, { status: 409 });
    }
  }

  const appOrigemId = lista.appId;

  const novoApp = await prisma.app.upsert({
    where: { macAddress: novoMacAddress },
    update: {},
    create: { macAddress: novoMacAddress, name: novoMacAddress, version: '1.0.0', userId: lista.app.userId },
  });

  const listaMovida = await prisma.lista.update({
    where: { id: lista.id },
    data: { appId: novoApp.id },
  });

  // Registrado à parte porque o MAC de origem costuma ser apagado logo a
  // seguir — sem isso não sobraria rastro nenhum de quem transferiu o quê.
  await prisma.transferenciaAtivacao.create({
    data: {
      userId: auth.id,
      macOrigem: lista.app.macAddress,
      macDestino: novoMacAddress,
      tipo: lista.tipo,
      dataExpiracao: lista.dataExpiracao,
    },
  });

  // Se não sobrou nenhuma lista no MAC de origem, ele deixa de existir no painel.
  const restantesNaOrigem = await prisma.lista.count({ where: { appId: appOrigemId } });
  if (restantesNaOrigem === 0) {
    await prisma.app.delete({ where: { id: appOrigemId } }).catch(() => null);
  }

  return NextResponse.json({ lista: listaMovida }, { status: 200 });
}
