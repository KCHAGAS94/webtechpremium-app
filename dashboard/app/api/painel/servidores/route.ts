import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Backs the "Servidores" panel screen. Same intentionally-open pattern as
// painel/devices — tighten once the panel gets real auth.
export async function GET() {
  const servidores = await prisma.servidor.findMany({ orderBy: { nome: 'asc' } });
  return NextResponse.json({ servidores }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const { id, nome, url } = await request.json();

  if (!nome || !url) {
    return NextResponse.json({ error: 'Nome e URL são obrigatórios' }, { status: 400 });
  }

  const servidor = id
    ? await prisma.servidor.update({ where: { id }, data: { nome, url } })
    : await prisma.servidor.create({ data: { nome, url } });

  return NextResponse.json({ servidor }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 });
  }

  try {
    await prisma.servidor.delete({ where: { id: Number(id) } });
  } catch {
    return NextResponse.json(
      { error: 'Não é possível remover: servidor em uso por alguma lista' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
