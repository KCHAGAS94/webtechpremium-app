import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';
import { corsPreflight, withCors } from '@/lib/cors';

export function OPTIONS() {
  return corsPreflight();
}

// Backs the "Endereço MAC / Status / Expiração" card on the app's
// "Gerenciar suas playlists" screen, and the "Conta" modal's "Estado da
// conta"/"Data de validade" rows. A device can have more than one Lista —
// the "Ativação App" row (tipo ANUAL/VITALICIO, no url — see
// /api/painel/listas' POST) that represents the MAC's actual plan with the
// reseller, plus zero or more playlist rows (tipo null, url set, own
// expiracaoData) added either by the reseller in "Usuários" or by the end
// user in-app. Those playlist dates are about specific credentials, not the
// device's plan, so this endpoint prefers the tipo'd ativação row — falling
// back to the furthest-out dataExpiracao among the rest only for older
// devices activated before `tipo` existed (see schema.prisma comment).
export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return withCors(NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 }));
  }

  const macAddress = mac.toUpperCase();
  const listas = await prisma.lista.findMany({
    where: { app: { macAddress }, isActive: true },
  });

  if (listas.length === 0) {
    return withCors(
      NextResponse.json({ mac: macAddress, dataExpiracao: null, expirado: null, tipo: null }, { status: 200 })
    );
  }

  const ativacao = listas.find((lista) => lista.tipo !== null);

  const maisRecente =
    ativacao ??
    listas.reduce((max, lista) => {
      if (!max.dataExpiracao) return max;
      if (!lista.dataExpiracao) return lista;
      return lista.dataExpiracao > max.dataExpiracao ? lista : max;
    });

  return withCors(
    NextResponse.json(
      {
        mac: macAddress,
        dataExpiracao: maisRecente.dataExpiracao ? maisRecente.dataExpiracao.toISOString().slice(0, 10) : null,
        expirado: isExpirado(maisRecente.dataExpiracao),
        tipo: maisRecente.tipo,
      },
      { status: 200 }
    )
  );
}
