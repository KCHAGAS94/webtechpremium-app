import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const revendedores = await prisma.user.findMany({
    where: { role: 'REVENDA' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ revendedores }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { email, password, name } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const revendedor = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'REVENDA',
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ revendedor }, { status: 201 });
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

  await prisma.user.deleteMany({ where: { id: Number(id), role: 'REVENDA' } }).catch(() => null);
  return NextResponse.json({ ok: true }, { status: 200 });
}
