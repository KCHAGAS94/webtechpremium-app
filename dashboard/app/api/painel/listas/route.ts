import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';

// Backs the flat "Usuários" table in the panel — one row per Lista
// (credential), not per device. A device (App) is created/reused
// automatically from the `mac` field; there's no separate device CRUD UI.
// Same intentionally-open pattern as the other painel/* routes — tighten
// once the panel gets real auth.
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
  const appId = request.nextUrl.searchParams.get('appId');

  const listas = await prisma.lista.findMany({
    where: appId ? { appId: Number(appId) } : undefined,
    orderBy: { createdAt: 'asc' },
    include: { app: true },
  });

  return NextResponse.json(
    {
      listas: listas.map((lista) => ({
        id: lista.id,
        mac: lista.app.macAddress,
        nome: lista.nome,
        url: lista.url,
        expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : '',
        expirado: isExpirado(lista.dataExpiracao),
        instaladoEm: lista.app.createdAt.toISOString(),
      })),
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const { id, mac, nome, url, expiracaoData, enforceUniqueMac } = await request.json();

  if (!mac) {
    return NextResponse.json({ error: 'MAC é obrigatório' }, { status: 400 });
  }

  const macAddress = String(mac).toUpperCase();

  // Ativação App has one row per device: creating a second activation entry
  // for a mac that's already registered would be a silent duplicate (the
  // "Data expira" row the reseller means to edit already exists). Usuários
  // doesn't set this flag since a device can legitimately have more than
  // one playlist.
  if (!id && enforceUniqueMac) {
    const existingApp = await prisma.app.findUnique({ where: { macAddress }, include: { listas: true } });
    if (existingApp && existingApp.listas.length > 0) {
      return NextResponse.json({ error: 'MAC já está cadastrado' }, { status: 409 });
    }
  }

  const systemUser = await getOrCreateSystemUser();
  const app = await prisma.app.upsert({
    where: { macAddress },
    update: {},
    create: { macAddress, name: macAddress, version: '1.0.0', userId: systemUser.id },
  });

  const dataExpiracao = expiracaoData ? new Date(expiracaoData) : null;
  const data = {
    appId: app.id,
    nome: nome || 'Lista',
    url: url || '',
    dataExpiracao,
  };

  const lista = id
    ? await prisma.lista.update({ where: { id }, data })
    : await prisma.lista.create({ data });

  return NextResponse.json({ lista }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 });
  }

  await prisma.lista.delete({ where: { id: Number(id) } }).catch(() => null);
  return NextResponse.json({ ok: true }, { status: 200 });
}
