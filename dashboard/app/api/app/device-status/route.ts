import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';

// Backs the "Endereço MAC / Status / Expiração" card on the app's
// "Gerenciar suas playlists" screen. A device can have more than one Lista
// (e.g. one registered by the reseller in "Ativação App" and one pasted by
// the end user in-app), so we take the one with the furthest-out
// dataExpiracao and derive status from that, instead of the first one
// created — a device counts as active as long as ANY of its lists is valid.
export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 });
  }

  const macAddress = mac.toUpperCase();
  const listas = await prisma.lista.findMany({
    where: { app: { macAddress }, isActive: true },
  });

  if (listas.length === 0) {
    return NextResponse.json({ mac: macAddress, dataExpiracao: null, expirado: null }, { status: 200 });
  }

  const maisRecente = listas.reduce((max, lista) => {
    if (!max.dataExpiracao) return lista;
    if (!lista.dataExpiracao) return max;
    return lista.dataExpiracao > max.dataExpiracao ? lista : max;
  });

  return NextResponse.json(
    {
      mac: macAddress,
      dataExpiracao: maisRecente.dataExpiracao ? maisRecente.dataExpiracao.toISOString().slice(0, 10) : null,
      expirado: isExpirado(maisRecente.dataExpiracao),
    },
    { status: 200 }
  );
}
