import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Backs the "Usuários" panel screen. That screen has no login flow wired up
// yet (unlike /api/apps, which is gated on a JWT for a specific dashboard
// user), so these routes are intentionally open for now — tighten them once
// the panel gets real auth, rather than forcing today's UI through the
// per-tenant /api/apps API it was never built against.
async function getOrCreateSystemUser() {
  const existing = await prisma.user.findFirst();
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: 'system@webtechpremium.local',
      password: 'unused',
      name: 'Sistema',
    },
  });
}

// Fields the form edits that have no dedicated App column yet — round-
// tripped as-is through the `metadata` JSON blob.
type PanelMetadata = {
  usuario?: string;
  password?: string;
  dns?: string;
  expiracaoData?: string;
  expirado?: boolean;
};

export async function GET() {
  const apps = await prisma.app.findMany({
    include: {
      m3uLists: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  const devices = apps.map((app) => {
    const metadata = (app.metadata as PanelMetadata | null) ?? {};
    return {
      id: app.id,
      name: app.name,
      mac: app.macAddress,
      m3u: app.m3uLists[0]?.url ?? '',
      usuario: metadata.usuario ?? '',
      password: metadata.password ?? '',
      dns: metadata.dns ?? '',
      expiracaoData: metadata.expiracaoData ?? '',
      expirado: metadata.expirado ?? false,
    };
  });

  return NextResponse.json({ devices }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const { mac, name, m3u, usuario, password, dns, expiracaoData, expirado } =
    await request.json();

  if (!mac) {
    return NextResponse.json({ error: 'MAC é obrigatório' }, { status: 400 });
  }

  const macAddress = String(mac).toUpperCase();
  const systemUser = await getOrCreateSystemUser();
  const metadata: PanelMetadata = { usuario, password, dns, expiracaoData, expirado };

  const app = await prisma.app.upsert({
    where: { macAddress },
    update: { name: name || macAddress, metadata },
    create: {
      macAddress,
      name: name || macAddress,
      version: '1.0.0',
      userId: systemUser.id,
      metadata,
    },
  });

  if (m3u) {
    const existingList = await prisma.m3UList.findFirst({ where: { appId: app.id } });
    if (existingList) {
      await prisma.m3UList.update({
        where: { id: existingList.id },
        data: { url: m3u, name: name || 'Lista principal', isActive: true },
      });
    } else {
      await prisma.m3UList.create({
        data: { appId: app.id, url: m3u, name: name || 'Lista principal' },
      });
    }
  }

  return NextResponse.json({ app }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const mac = request.nextUrl.searchParams.get('mac');
  if (!mac) {
    return NextResponse.json({ error: 'Parâmetro mac é obrigatório' }, { status: 400 });
  }

  await prisma.app.delete({ where: { macAddress: mac.toUpperCase() } }).catch(() => null);
  return NextResponse.json({ ok: true }, { status: 200 });
}
