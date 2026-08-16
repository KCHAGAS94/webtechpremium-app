import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';
import { getAuthUser } from '@/lib/auth';

// Página admin "Instalados": todo App (MAC) já registrado no sistema, tenha
// ou não uma ativação (Lista com tipo) associada — inclui os MACs que só
// bateram em /api/devices (auto-registrados no primeiro boot do app) e nunca
// passaram pela "Ativação App". É daqui que o admin identifica um MAC novo
// e concede o trial de 7 dias em um clique.
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
        return {
          id: app.id,
          mac: app.macAddress,
          revendedorNome: app.user.name,
          revendedorEmail: app.user.email,
          instaladoEm: app.createdAt.toISOString(),
          ativado: !!ativacao,
          tipo: ativacao?.tipo ?? null,
          expiracaoData: ativacao?.dataExpiracao ? ativacao.dataExpiracao.toISOString().slice(0, 10) : '',
          temPlaylist: app.listas.some((l) => l.url),
        };
      }),
    },
    { status: 200 }
  );
}

// Concede 7 dias grátis (tipo TRIAL, 0 créditos) a um App já registrado, sem
// exigir uma ativação prévia — o revendedor só precisa depois adicionar a
// playlist na tela "Usuários" para o MAC já ativado.
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

  const expira = new Date();
  expira.setDate(expira.getDate() + 7);

  const lista = await prisma.lista.create({
    data: {
      appId: app.id,
      nome: 'Teste grátis',
      url: '',
      dataExpiracao: expira,
      tipo: 'TRIAL',
    },
  });

  return NextResponse.json({ lista }, { status: 200 });
}
