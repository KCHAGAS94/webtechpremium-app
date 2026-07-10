import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token) as any;
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const apps = await prisma.app.findMany({
      where: { userId: decoded.id },
      include: {
        sessions: true,
      },
    });

    return NextResponse.json({ apps }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao buscar apps' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token) as any;
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const { name, macAddress, version } = await request.json();

    if (!macAddress) {
      return NextResponse.json(
        { error: 'MAC address é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se MAC já existe
    const existingApp = await prisma.app.findUnique({
      where: { macAddress },
    });

    if (existingApp) {
      return NextResponse.json(
        { error: 'Esse MAC já foi registrado' },
        { status: 409 }
      );
    }

    const app = await prisma.app.create({
      data: {
        name: name || `App ${macAddress}`,
        macAddress,
        version: version || '1.0.0',
        userId: decoded.id,
      },
    });

    return NextResponse.json(
      { message: 'App registrado com sucesso', app },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao registrar app' },
      { status: 500 }
    );
  }
}
