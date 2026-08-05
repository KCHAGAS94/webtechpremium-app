import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Histórico de transferências de ativação: revendedor vê só as próprias
// ações; admin vê de todo mundo.
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const transferencias = await prisma.transferenciaAtivacao.findMany({
    where: auth.role === 'ADMIN' ? undefined : { userId: auth.id },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  return NextResponse.json(
    {
      transferencias: transferencias.map((t) => ({
        id: t.id,
        revendedorNome: t.user.name,
        revendedorEmail: t.user.email,
        macOrigem: t.macOrigem,
        macDestino: t.macDestino,
        tipo: t.tipo,
        dataExpiracao: t.dataExpiracao ? t.dataExpiracao.toISOString().slice(0, 10) : '',
        criadoEm: t.createdAt.toISOString(),
      })),
    },
    { status: 200 }
  );
}
