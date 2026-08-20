import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Checagem pura (sem side effects) de "esse MAC já está no cadastro de
// instalados (App)?" — usada pelos campos de MAC do painel (Ativação App,
// Usuários, Transferir) pra exigir um MAC que já rodou o app pelo menos uma
// vez, em vez de aceitar qualquer sequência de hex digitada.
export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 });
  }

  const app = await prisma.app.findUnique({ where: { macAddress: mac.toUpperCase() } });
  return NextResponse.json({ exists: Boolean(app) }, { status: 200 });
}
