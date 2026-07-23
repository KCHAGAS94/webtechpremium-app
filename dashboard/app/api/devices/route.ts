import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildHlsUrl, isExpirado } from '@/lib/hls-url';

// A device polling for the first time has no App/Lista rows yet. We register
// it here (rather than requiring a reseller to type the MAC in manually) so
// it shows up in the painel's "Usuários" table right away, with blank
// usuario/senha, ready for a reseller to fill in.
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

async function registerDevice(macAddress: string) {
  const servidores = await prisma.servidor.findMany({ orderBy: { id: 'asc' } });
  if (servidores.length === 0) return null;

  const systemUser = await getOrCreateSystemUser();
  const app = await prisma.app.create({
    data: { macAddress, name: macAddress, version: '1.0.0', userId: systemUser.id },
  });

  await prisma.lista.createMany({
    data: servidores.map((servidor) => ({
      appId: app.id,
      servidorId: servidor.id,
      nome: servidor.nome,
      usuario: '',
      senha: '',
    })),
  });

  return prisma.app.findUnique({
    where: { id: app.id },
    include: {
      listas: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: { servidor: true },
      },
    },
  });
}

// Public endpoint the mobile app polls at boot / "Recarregar Lista": given a
// device's MAC, return the HLS playlists a reseller has linked to it in the
// painel. No auth — the MAC itself is the credential here, same as an
// Xtream/IPTV portal keying access off a device id.
export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 });
  }

  const macAddress = mac.toUpperCase();
  let app = await prisma.app.findUnique({
    where: { macAddress },
    include: {
      listas: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: { servidor: true },
      },
    },
  });

  if (!app) {
    app = await registerDevice(macAddress);
  }

  if (!app) {
    return NextResponse.json([], { status: 200 });
  }

  const playlists = app.listas
    .filter((lista) => lista.usuario && lista.senha && !isExpirado(lista.dataExpiracao))
    .map((lista) => ({
      id: lista.id,
      name: lista.nome,
      url: buildHlsUrl(lista.servidor.url, lista.usuario, lista.senha),
      expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : null,
    }));

  return NextResponse.json(playlists, { status: 200 });
}
