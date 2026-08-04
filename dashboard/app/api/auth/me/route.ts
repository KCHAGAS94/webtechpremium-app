import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Créditos ainda não têm lógica de compra via API — placeholder fixo até
  // isso ser implementado.
  return NextResponse.json({ user: { ...user, credits: 0 } }, { status: 200 });
}
