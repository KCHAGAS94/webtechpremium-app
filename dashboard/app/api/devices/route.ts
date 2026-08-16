import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';
import { corsPreflight, withCors } from '@/lib/cors';
import { getOrCreateSystemUser } from '@/lib/systemUser';

export function OPTIONS() {
  return corsPreflight();
}

// A device polling for the first time has no App/Lista rows yet. We register
// it here (rather than requiring a reseller to type the MAC in manually) so
// it shows up in the painel's "Usuários" table right away, with no Lista
// linked, ready for a reseller to paste the M3U link in.
//
// It also gets 7 days grátis (tipo TRIAL) automatically, right here at
// registration — the admin "Instalados" page used to require a manual
// "Dar 7 dias grátis" click per MAC, which doesn't scale. The button there
// stays as a catch-up for devices registered before this existed.
async function registerDevice(macAddress: string) {
  const systemUser = await getOrCreateSystemUser();
  const expiraTrial = new Date();
  expiraTrial.setDate(expiraTrial.getDate() + 7);

  return prisma.app.create({
    data: {
      macAddress,
      name: macAddress,
      version: '1.0.0',
      userId: systemUser.id,
      listas: {
        create: {
          nome: 'Teste grátis',
          url: '',
          tipo: 'TRIAL',
          dataExpiracao: expiraTrial,
        },
      },
    },
    include: {
      listas: {
        where: { isActive: true },
        orderBy: [{ origem: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
}

// Public endpoint the mobile app polls when the user presses "Recarregar
// Lista": given a device's MAC, return the M3U links assigned to it — either
// by a reseller in the painel, or pasted by the end user in the app's own
// "Gerenciamento de Playlist" screen when no reseller has linked one. Panel
// lists come first (ListaOrigem declares PAINEL before APP, and Prisma sorts
// enums by declaration order), so the app tries those before falling back to
// self-added ones. No auth — the MAC itself is the credential here, same as
// an Xtream/IPTV portal keying access off a device id.
export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return withCors(NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 }));
  }

  const macAddress = mac.toUpperCase();
  let app = await prisma.app.findUnique({
    where: { macAddress },
    include: {
      listas: {
        where: { isActive: true },
        orderBy: [{ origem: 'asc' }, { createdAt: 'asc' }],
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
      // Surfaced so the app's tela "Conta" can show the real plan/status
      // instead of a hardcoded placeholder — tipo drives "Vitalício" vs a
      // date, expirado drives "Ativo"/"Expirado". Always false here since
      // the filter above already drops expired listas; kept in the response
      // anyway so the app's display logic doesn't have to assume that.
      tipo: lista.tipo,
      expirado: isExpirado(lista.dataExpiracao),
    }));

  return withCors(NextResponse.json(playlists, { status: 200 }));
}
