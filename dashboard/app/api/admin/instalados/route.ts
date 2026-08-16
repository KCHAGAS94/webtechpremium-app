import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';
import { getAuthUser } from '@/lib/auth';

// Página admin "Instalados": todo App (MAC) já registrado no sistema, tenha
// ou não uma ativação (Lista com tipo) associada. Desde que /api/devices
// passou a conceder o trial de 7 dias automaticamente no primeiro boot, um
// MAC "Não ativado" aqui só acontece pra devices registrados antes dessa
// mudança — o botão "7 dias grátis" abaixo existe só como catch-up manual
// pra esses casos.
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const apps = await prisma.app.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true, listas: true },
  });

  return NextResponse.json(
    {
      apps: apps.map((app) => {
        const ativacao = app.listas.find((l) => l.tipo !== null && !isExpirado(l.dataExpiracao));

        // Sem ativação: mostra a data em que o trial de 7 dias venceria se
        // fosse concedido agora mesmo (sempre contado da instalação — ver
        // cálculo idêntico no POST abaixo), pra o admin já ver de cara o
        // prazo antes de clicar em "7 dias grátis".
        const expiraTrialPrevisto = new Date(app.createdAt);
        expiraTrialPrevisto.setDate(expiraTrialPrevisto.getDate() + 7);

        return {
          id: app.id,
          mac: app.macAddress,
          revendedorNome: app.user.name,
          revendedorEmail: app.user.email,
          instaladoEm: app.createdAt.toISOString(),
          ativado: !!ativacao,
          tipo: ativacao?.tipo ?? null,
          expiracaoData: ativacao?.dataExpiracao
            ? ativacao.dataExpiracao.toISOString().slice(0, 10)
            : expiraTrialPrevisto.toISOString().slice(0, 10),
          temPlaylist: app.listas.some((l) => l.url),
        };
      }),
    },
    { status: 200 }
  );
}

// Concede 7 dias grátis (tipo TRIAL, 0 créditos) a um App já registrado, sem
// exigir uma ativação prévia — o revendedor só precisa depois adicionar a
// playlist na tela "Usuários" para o MAC já ativado. Os 7 dias contam a
// partir da instalação do app, não do clique do admin (ver cálculo abaixo).
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { appId } = await request.json();
  if (!appId) {
    return NextResponse.json({ error: 'appId é obrigatório' }, { status: 400 });
  }

  const app = await prisma.app.findUnique({ where: { id: Number(appId) }, include: { listas: true } });
  if (!app) {
    return NextResponse.json({ error: 'App não encontrado' }, { status: 404 });
  }

  const jaAtivo = app.listas.some((l) => l.tipo !== null && !isExpirado(l.dataExpiracao));
  if (jaAtivo) {
    return NextResponse.json({ error: 'Este MAC já está ativado' }, { status: 409 });
  }

  // Conta a partir da instalação (app.createdAt), não do clique do admin —
  // senão bastaria demorar pra conceder o trial pra "esticar" os 7 dias.
  const expira = new Date(app.createdAt);
  expira.setDate(expira.getDate() + 7);

  const lista = await prisma.lista.create({
    data: {
      appId: app.id,
      nome: 'Teste grátis',
      url: '',
      dataExpiracao: expira,
      tipo: 'TRIAL',
      criadoPorId: auth.id,
    },
  });

  return NextResponse.json({ lista }, { status: 200 });
}

// Remove um MAC inteiro (App) e todas as suas Listas junto (onDelete:
// Cascade no schema) — usado quando o admin quer limpar um MAC de teste ou
// nunca mais utilizado da lista de "Instalados".
export async function DELETE(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 });
  }

  await prisma.app.delete({ where: { id: Number(id) } }).catch(() => null);
  return NextResponse.json({ ok: true }, { status: 200 });
}
