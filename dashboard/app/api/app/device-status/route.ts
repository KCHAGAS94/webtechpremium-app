import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';

// Backs the "Endereço MAC / Status / Expiração" card on the app's
// "Gerenciar suas playlists" screen. Same priority rule as /api/devices:
// a reseller's painel lista wins over one the end user pasted themselves
// (ListaOrigem declares PAINEL before APP, so Prisma's enum ordering sorts
// it first) — we don't want the device to look "expired" or "active" based
// on a self-added list when a reseller already has one linked.
export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 });
  }

  const macAddress = mac.toUpperCase();
  const lista = await prisma.lista.findFirst({
    where: { app: { macAddress }, isActive: true },
    orderBy: [{ origem: 'asc' }, { createdAt: 'asc' }],
  });

  if (!lista) {
    return NextResponse.json({ mac: macAddress, dataExpiracao: null, expirado: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      mac: macAddress,
      dataExpiracao: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : null,
      expirado: isExpirado(lista.dataExpiracao),
    },
    { status: 200 }
  );
}
