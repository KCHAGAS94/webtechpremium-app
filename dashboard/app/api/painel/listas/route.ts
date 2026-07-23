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
    include: { servidor: true, app: true },
  });

  return NextResponse.json(
    {
      listas: listas.map((lista) => ({
        id: lista.id,
        mac: lista.app.macAddress,
        servidorId: lista.servidorId,
        servidorNome: lista.servidor.nome,
        nome: lista.nome,
        usuario: lista.usuario,
        senha: lista.senha,
        expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : '',
        expirado: isExpirado(lista.dataExpiracao),
        instaladoEm: lista.app.createdAt.toISOString(),
      })),
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const { id, mac, servidorId, nome, usuario, senha, expiracaoData } = await request.json();

  if (!mac) {
    return NextResponse.json({ error: 'MAC é obrigatório' }, { status: 400 });
  }
  if (!servidorId) {
    return NextResponse.json({ error: 'servidorId é obrigatório' }, { status: 400 });
  }

  const macAddress = String(mac).toUpperCase();
  const systemUser = await getOrCreateSystemUser();
  const app = await prisma.app.upsert({
    where: { macAddress },
    update: {},
    create: { macAddress, name: macAddress, version: '1.0.0', userId: systemUser.id },
  });

  const dataExpiracao = expiracaoData ? new Date(expiracaoData) : null;
  const data = {
    appId: app.id,
    servidorId: Number(servidorId),
    nome: nome || 'Lista',
    usuario,
    senha,
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
