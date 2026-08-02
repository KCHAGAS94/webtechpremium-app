import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';

// Counterpart to /api/painel/listas, but for the end user pasting their own
// playlist directly in the app's "Gerenciamento de Playlist" screen instead
// of a reseller assigning one in the painel. Scoped by `mac` (not `appId`)
// since the app only ever knows its own device's MAC, never an internal id.
async function getOrCreateSystemUser() {
  const existing = await prisma.user.findFirst();
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: 'system@webtechpremium.local',
      password: 'unused',
      name: 'Sistema',
    },
  });
}

export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 });
  }

  const macAddress = mac.toUpperCase();
  const listas = await prisma.lista.findMany({
    where: { app: { macAddress }, origem: 'APP' },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    {
      listas: listas.map((lista) => ({
        id: lista.id,
        nome: lista.nome,
        url: lista.url,
        expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : '',
        expirado: isExpirado(lista.dataExpiracao),
      })),
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const { mac, nome, url, expiracaoData } = await request.json();

  if (!mac) {
    return NextResponse.json({ error: 'MAC é obrigatório' }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: 'Link da lista é obrigatório' }, { status: 400 });
  }

  const macAddress = String(mac).toUpperCase();
  const systemUser = await getOrCreateSystemUser();
  const app = await prisma.app.upsert({
    where: { macAddress },
    update: {},
    create: { macAddress, name: macAddress, version: '1.0.0', userId: systemUser.id },
  });

  const dataExpiracao = expiracaoData ? new Date(expiracaoData) : null;
  const lista = await prisma.lista.create({
    data: {
      appId: app.id,
      nome: nome || 'Minha lista',
      url,
      dataExpiracao,
      origem: 'APP',
    },
  });

  return NextResponse.json({ lista }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 });
  }

  const lista = await prisma.lista.findUnique({ where: { id: Number(id) } });
  if (!lista) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (lista.origem !== 'APP') {
    return NextResponse.json(
      { error: 'Esta lista foi cadastrada pelo painel e não pode ser removida pelo app' },
      { status: 403 }
    );
  }

  await prisma.lista.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
