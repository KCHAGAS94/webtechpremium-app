import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { isExpirado } from '@/lib/hls-url';

// Relatório admin: todo MAC cadastrado, o revendedor que o cadastrou (App.userId)
// e a data de expiração da ativação (Lista.dataExpiracao). Uma linha por Lista,
// já que um device pode ter mais de uma (ex: reseller trocou de playlist).
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const listas = await prisma.lista.findMany({
    orderBy: [{ app: { user: { name: 'asc' } } }, { createdAt: 'asc' }],
    include: { app: { include: { user: true } } },
  });

  return NextResponse.json(
    {
      registros: listas.map((lista) => ({
        id: lista.id,
        mac: lista.app.macAddress,
        revendedorNome: lista.app.user.name,
        revendedorEmail: lista.app.user.email,
        tipo: lista.tipo,
        dataExpiracao: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : '',
        expirado: isExpirado(lista.dataExpiracao),
        cadastradoEm: lista.createdAt.toISOString(),
      })),
    },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 });
  }

  await prisma.lista.deleteMany({ where: { id: Number(id) } }).catch(() => null);
  return NextResponse.json({ ok: true }, { status: 200 });
}
