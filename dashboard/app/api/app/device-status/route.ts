import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';
import { corsPreflight, withCors } from '@/lib/cors';

export function OPTIONS() {
  return corsPreflight();
}

// Backs the "Endereço MAC / Status / Expiração" card on the app's
// "Gerenciar suas playlists" screen, e a "Conta" modal's "Estado da
// conta"/"Data de validade" rows. A device can have more than one Lista —
// the "Ativação App" row (tipo ANUAL/VITALICIO/TRIAL, no url — see
// /api/painel/listas' POST) that represents the MAC's actual plan with o
// revendedor, plus zero or more playlist rows (tipo null, url set) added
// either by the reseller in "Usuários" or by the end user in-app. Those
// playlist rows não são o plano do dispositivo — só a linha com `tipo` é.
// Usar a data de uma delas aqui fazia o app mostrar "ativado até X" pra um
// MAC que o painel (tela "Instalados"/"Ativação App") já mostrava como "Não
// ativado", sempre que sobrava alguma playlist antiga com dataExpiracao
// preenchida. O app deve sempre bater com o que o painel mostra.
export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return withCors(NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 }));
  }

  const macAddress = mac.toUpperCase();
  const ativacao = await prisma.lista.findFirst({
    where: { app: { macAddress }, isActive: true, tipo: { not: null } },
  });

  if (!ativacao) {
    return withCors(
      NextResponse.json({ mac: macAddress, dataExpiracao: null, expirado: null, tipo: null }, { status: 200 })
    );
  }

  return withCors(
    NextResponse.json(
      {
        mac: macAddress,
        dataExpiracao: ativacao.dataExpiracao ? ativacao.dataExpiracao.toISOString().slice(0, 10) : null,
        expirado: isExpirado(ativacao.dataExpiracao),
        tipo: ativacao.tipo,
      },
      { status: 200 }
    )
  );
}
