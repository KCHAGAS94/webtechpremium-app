import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isExpirado } from '@/lib/hls-url';

// Custo em créditos de cada tipo de ativação (mesma tabela de
// /api/painel/listas, duplicada aqui porque essa rota só lida com upgrade
// de TRIAL, nunca com ANUAL/VITALICIO criados do zero).
const ATIVACAO_CREDITS: Record<'ANUAL' | 'VITALICIO', number> = {
  ANUAL: 1,
  VITALICIO: 5,
};

// Lista todo MAC ainda em teste grátis (tipo TRIAL, não expirado) — de
// qualquer revendedor. Diferente de "Ativação App" e "Usuários", que só
// mostram os MACs do próprio dono: aqui o objetivo é justamente deixar
// qualquer revendedor ver e reivindicar um MAC em teste antes de outro.
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const listas = await prisma.lista.findMany({
    where: { tipo: 'TRIAL' },
    orderBy: { createdAt: 'desc' },
    include: { app: true },
  });

  const ativos = listas.filter((lista) => !isExpirado(lista.dataExpiracao));

  return NextResponse.json(
    {
      listas: ativos.map((lista) => ({
        id: lista.id,
        mac: lista.app.macAddress,
        instaladoEm: lista.app.createdAt.toISOString(),
        expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : '',
      })),
    },
    { status: 200 }
  );
}

// Ativa (compra) um MAC que ainda está em teste grátis, cobrando crédito de
// quem estiver logado — não precisa ser o dono do App. Ao concluir, o MAC
// passa a pertencer a quem ativou: só esse revendedor volta a enxergá-lo em
// "Ativação App"/"Usuários" a partir daí.
export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id, tipo } = await request.json();

  if (!id || (tipo !== 'ANUAL' && tipo !== 'VITALICIO')) {
    return NextResponse.json({ error: 'id e tipo (ANUAL ou VITALICIO) são obrigatórios' }, { status: 400 });
  }

  const lista = await prisma.lista.findUnique({ where: { id: Number(id) }, include: { app: true } });
  if (!lista || lista.tipo !== 'TRIAL') {
    return NextResponse.json({ error: 'MAC não está em teste grátis' }, { status: 404 });
  }
  if (isExpirado(lista.dataExpiracao)) {
    return NextResponse.json({ error: 'Teste grátis desse MAC já expirou' }, { status: 400 });
  }

  const cost = ATIVACAO_CREDITS[tipo as 'ANUAL' | 'VITALICIO'];
  const debited = await prisma.user.updateMany({
    where: { id: auth.id, credits: { gte: cost } },
    data: { credits: { decrement: cost } },
  });
  if (debited.count === 0) {
    return NextResponse.json({ error: 'Créditos insuficientes para ativar este app' }, { status: 402 });
  }

  let dataExpiracao: Date | null = null;
  if (tipo === 'ANUAL') {
    const expira = new Date();
    expira.setFullYear(expira.getFullYear() + 1);
    dataExpiracao = expira;
  }

  const [listaAtivada] = await prisma.$transaction([
    prisma.lista.update({
      where: { id: lista.id },
      data: { tipo, dataExpiracao },
    }),
    prisma.app.update({
      where: { id: lista.appId },
      data: { userId: auth.id },
    }),
  ]);

  return NextResponse.json({ lista: listaAtivada }, { status: 200 });
}
