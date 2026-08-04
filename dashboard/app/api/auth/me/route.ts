import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, email: true, role: true, credits: true },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { name, email, password } = await request.json();

  if (!name || !email) {
    return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser && existingUser.id !== auth.id) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
  }

  const data: { name: string; email: string; password?: string } = { name, email };
  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: auth.id },
    data,
    select: { id: true, name: true, email: true, role: true, credits: true },
  });

  return NextResponse.json({ user }, { status: 200 });
}
