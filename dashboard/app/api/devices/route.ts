import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Public endpoint the mobile app polls at boot / "Recarregar Lista": given a
// device's MAC, return the M3U lists a reseller has linked to it in the
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
      m3uLists: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!app) {
    return NextResponse.json([], { status: 200 });
  }

  const playlists = app.m3uLists.map((list) => ({
    id: list.id,
    name: list.name,
    url: list.url,
  }));

  return NextResponse.json(playlists, { status: 200 });
}
