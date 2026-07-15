import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildHlsUrl, isExpirado } from '@/lib/hls-url';

// Public endpoint the mobile app polls at boot / "Recarregar Lista": given a
// device's MAC, return the HLS playlists a reseller has linked to it in the
// painel. No auth — the MAC itself is the credential here, same as an
// Xtream/IPTV portal keying access off a device id.
export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 });
  }

  const app = await prisma.app.findUnique({
    where: { macAddress: mac.toUpperCase() },
    include: {
      listas: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: { servidor: true },
      },
    },
  });

  if (!app) {
    return NextResponse.json([], { status: 200 });
  }

  const playlists = app.listas
    .filter((lista) => !isExpirado(lista.dataExpiracao))
    .map((lista) => ({
      id: lista.id,
      name: lista.nome,
      url: buildHlsUrl(lista.servidor.url, lista.usuario, lista.senha),
      expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : null,
    }));

  return NextResponse.json(playlists, { status: 200 });
}
