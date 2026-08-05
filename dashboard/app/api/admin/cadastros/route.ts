import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Relatório admin: todo cadastro (Lista) existente no sistema, com o
// revendedor dono do MAC e a data em que a lista foi criada. Cobre tanto as
// listas de "Ativação App" quanto as de "Usuários" — uma linha por Lista.
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const listas = await prisma.lista.findMany({
    orderBy: { createdAt: 'desc' },
    include: { app: { include: { user: true } } },
  });

  return NextResponse.json(
    {
      cadastros: listas.map((lista) => ({
        id: lista.id,
        revendedorNome: lista.app.user.name,
        revendedorEmail: lista.app.user.email,
        mac: lista.app.macAddress,
        lista: lista.nome,
        url: lista.url,
        cadastradoEm: lista.createdAt.toISOString(),
      })),
    },
    { status: 200 }
  );
}
