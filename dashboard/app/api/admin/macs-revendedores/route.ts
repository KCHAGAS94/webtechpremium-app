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
        appId: lista.app.id,
        mac: lista.app.macAddress,
        revendedorId: lista.app.user.id,
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

// Corrige o "dono" de um App (App.userId) cuja atribuição ficou errada em
// MACs ativados antes do fix que reatribui o App ao ativar (ver
// dashboard/app/api/painel/listas/route.ts). Não mexe em Lista nenhuma —
// só reamarra o App ao revendedor correto.
export async function PATCH(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { appId, revendedorId } = await request.json();
  if (!appId || !revendedorId) {
    return NextResponse.json({ error: 'Parâmetros appId e revendedorId são obrigatórios' }, { status: 400 });
  }

  const revendedor = await prisma.user.findUnique({ where: { id: Number(revendedorId) } });
  if (!revendedor || revendedor.role !== 'REVENDA') {
    return NextResponse.json({ error: 'Revendedor inválido' }, { status: 400 });
  }

  await prisma.app.update({ where: { id: Number(appId) }, data: { userId: Number(revendedorId) } });
  return NextResponse.json({ ok: true }, { status: 200 });
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
