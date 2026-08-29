import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Move uma ativação (Lista com `tipo` preenchido) de um MAC para outro sem
// cobrar créditos de novo: tipo e dataExpiracao são preservados, só o
// dispositivo (App) muda. Como o dispositivo muda, todas as demais listas
// (playlists) cadastradas no MAC de origem deixam de fazer sentido e são
// apagadas junto — o MAC de origem sempre some do painel após a troca.
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
    if (appDestino.listas.length > 0) {
      // Já tem ativação paga: só bloqueia por dono se de fato pertencer a
      // outra ativação em uso. MAC ainda em teste grátis (sem lista com
      // tipo) pode ser tomado por qualquer revendedor, mesmo que o App já
      // exista sob outro userId — o dono do App não muda na transferência.
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

  // A ativação já foi movida para o novo App; qualquer outra lista que
  // ainda aponte para o MAC de origem (playlists do usuário final) fica
  // órfã de dispositivo ativo e é apagada automaticamente, junto com o App.
  const listasApagadas = await prisma.lista.deleteMany({ where: { appId: appOrigemId } });
  await prisma.app.delete({ where: { id: appOrigemId } }).catch(() => null);

  return NextResponse.json(
    { lista: listaMovida, listasApagadas: listasApagadas.count },
    { status: 200 }
  );
}
