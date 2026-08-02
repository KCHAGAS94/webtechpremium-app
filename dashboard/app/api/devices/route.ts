import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';

// A device polling for the first time has no App/Lista rows yet. We register
// it here (rather than requiring a reseller to type the MAC in manually) so
// it shows up in the painel's "Usuários" table right away, with no Lista
// linked, ready for a reseller to paste the M3U link in.
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
  const systemUser = await getOrCreateSystemUser();
  return prisma.app.create({
    data: { macAddress, name: macAddress, version: '1.0.0', userId: systemUser.id },
    include: {
      listas: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// Public endpoint the mobile app polls when the user presses "Recarregar
// Lista": given a device's MAC, return the M3U links a reseller has linked
// to it in the painel. No auth — the MAC itself is the credential here, same
// as an Xtream/IPTV portal keying access off a device id.
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
      },
    },
  });

  if (!app) {
    app = await registerDevice(macAddress);
  }

  const playlists = app.listas
    .filter((lista) => lista.url && !isExpirado(lista.dataExpiracao))
    .map((lista) => ({
      id: lista.id,
      name: lista.nome,
      url: lista.url,
      expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : null,
    }));

  return NextResponse.json(playlists, { status: 200 });
}
