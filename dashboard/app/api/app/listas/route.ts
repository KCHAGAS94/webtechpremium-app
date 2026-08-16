import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';
import { corsPreflight, withCors } from '@/lib/cors';
import { getOrCreateSystemUser } from '@/lib/systemUser';

export function OPTIONS() {
  return corsPreflight();
}

// Counterpart to /api/painel/listas, but for the end user pasting their own
// playlist directly in the app's "Gerenciamento de Playlist" screen instead
// of a reseller assigning one in the painel. Scoped by `mac` (not `appId`)
// since the app only ever knows its own device's MAC, never an internal id.

export async function GET(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return withCors(NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 }));
  }

  const macAddress = mac.toUpperCase();
  const listas = await prisma.lista.findMany({
    where: { app: { macAddress }, origem: 'APP' },
    orderBy: { createdAt: 'asc' },
  });

  return withCors(
    NextResponse.json(
      {
        listas: listas.map((lista) => ({
          id: lista.id,
          nome: lista.nome,
          url: lista.url,
          expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : '',
          expirado: isExpirado(lista.dataExpiracao),
        })),
      },
      { status: 200 }
    )
  );
}

export async function POST(request: NextRequest) {
  const { mac, nome, url, expiracaoData } = await request.json();

  if (!mac) {
    return withCors(NextResponse.json({ error: 'MAC é obrigatório' }, { status: 400 }));
  }
  if (!url) {
    return withCors(NextResponse.json({ error: 'Link da lista é obrigatório' }, { status: 400 }));
  }

  const macAddress = String(mac).toUpperCase();
  const systemUser = await getOrCreateSystemUser();
  const app = await prisma.app.upsert({
    where: { macAddress },
    update: {},
    create: { macAddress, name: macAddress, version: '1.0.0', userId: systemUser.id },
  });

  const dataExpiracao = expiracaoData ? new Date(expiracaoData) : null;
  const lista = await prisma.lista.create({
    data: {
      appId: app.id,
      nome: nome || 'Minha lista',
      url,
      dataExpiracao,
      origem: 'APP',
    },
  });

  return withCors(NextResponse.json({ lista }, { status: 200 }));
}

// "Editar" na tela pública "Gerenciamento de Playlist" — só permite mudar
// nome/url de uma lista que o próprio usuário final cadastrou (origem
// APP), mesma restrição do DELETE abaixo. Listas atribuídas pelo painel
// (origem PAINEL) continuam só editáveis por um revendedor/admin logado.
export async function PATCH(request: NextRequest) {
  const { id, nome, url } = await request.json();

  if (!id) {
    return withCors(NextResponse.json({ error: 'id é obrigatório' }, { status: 400 }));
  }
  if (!url) {
    return withCors(NextResponse.json({ error: 'Link da lista é obrigatório' }, { status: 400 }));
  }

  const lista = await prisma.lista.findUnique({ where: { id: Number(id) } });
  if (!lista) {
    return withCors(NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 }));
  }
  if (lista.origem !== 'APP') {
    return withCors(
      NextResponse.json(
        { error: 'Esta lista foi cadastrada pelo painel e não pode ser editada pelo app' },
        { status: 403 }
      )
    );
  }

  const atualizada = await prisma.lista.update({
    where: { id: Number(id) },
    data: { nome: nome || lista.nome, url },
  });

  return withCors(NextResponse.json({ lista: atualizada }, { status: 200 }));
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return withCors(NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 }));
  }

  const lista = await prisma.lista.findUnique({ where: { id: Number(id) } });
  if (!lista) {
    return withCors(NextResponse.json({ ok: true }, { status: 200 }));
  }
  if (lista.origem !== 'APP') {
    return withCors(
      NextResponse.json(
        { error: 'Esta lista foi cadastrada pelo painel e não pode ser removida pelo app' },
        { status: 403 }
      )
    );
  }

  await prisma.lista.delete({ where: { id: Number(id) } });
  return withCors(NextResponse.json({ ok: true }, { status: 200 }));
}
