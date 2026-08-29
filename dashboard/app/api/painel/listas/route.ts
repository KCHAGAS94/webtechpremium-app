import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isExpirado } from '@/lib/hls-url';
import { getAuthUser } from '@/lib/auth';

// Custo em créditos de cada tipo de ativação. ANUAL expira 1 ano após a
// ativação; VITALICIO nunca expira (dataExpiracao fica null); TRIAL é
// gratuito e expira 7 dias após a concessão (ver página admin "Instalados").
const ATIVACAO_CREDITS: Record<'ANUAL' | 'VITALICIO' | 'TRIAL', number> = {
  ANUAL: 1,
  VITALICIO: 5,
  TRIAL: 0,
};

// Backs the flat "Usuários" table in the panel — one row por Lista
// (credential), not per device. A device (App) is created/reused
// automatically from the `mac` field; there's no separate device CRUD UI.
// O App é sempre criado com o userId do revendedor logado, o que é o que
// amarra cada MAC ao revendedor que o cadastrou (usado pela página de admin
// "MACs por revendedor").

export async function GET(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get('appId');
  const mac = request.nextUrl.searchParams.get('mac');
  // A tela "Usuários" manda minhas=1: só o que o próprio usuário logado
  // cadastrou aparece ali, admin incluso — ninguém vê cadastro alheio nessa
  // tela. Sem o parâmetro (tela "Ativação App"), mantém o comportamento
  // antigo: admin vê tudo, revendedor só os MACs que possui — mas só
  // ativações de verdade (tipo setado pelo botão "Adicionar" dessa tela).
  // MACs auto-registrados por /api/devices (sem nenhuma ativação) não têm
  // linha de Lista com tipo, então não aparecem aqui — só em "Instalados".
  const minhas = request.nextUrl.searchParams.get('minhas') === '1';

  const listas = await prisma.lista.findMany({
    where: {
      ...(appId && { appId: Number(appId) }),
      // TRIAL fica de fora da tela "Ativação App": ela só mostra ativação de
      // verdade (ANUAL/VITALICIO); teste grátis tem tela própria
      // ("Teste grátis") justamente para não se misturar com o que já foi
      // pago.
      ...(minhas ? { criadoPorId: auth.id } : { tipo: { in: ['ANUAL', 'VITALICIO'] } }),
      app: {
        ...(mac && { macAddress: mac.toUpperCase() }),
        ...(!minhas && auth.role !== 'ADMIN' && { userId: auth.id }),
      },
    },
    orderBy: { createdAt: 'asc' },
    include: { app: true },
  });

  return NextResponse.json(
    {
      listas: listas.map((lista) => ({
        id: lista.id,
        mac: lista.app.macAddress,
        nome: lista.nome,
        url: lista.url,
        expiracaoData: lista.dataExpiracao ? lista.dataExpiracao.toISOString().slice(0, 10) : '',
        expirado: isExpirado(lista.dataExpiracao),
        instaladoEm: lista.app.createdAt.toISOString(),
        tipo: lista.tipo,
        observacao: lista.observacao ?? '',
      })),
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id, mac, nome, url, enforceUniqueMac, tipo, observacao } = await request.json();

  if (!mac) {
    return NextResponse.json({ error: 'MAC é obrigatório' }, { status: 400 });
  }

  const macAddress = String(mac).toUpperCase();

  // Ativação App has one row per device: creating a second activation entry
  // for a mac that's already registered would be a silent duplicate (the
  // "Data expira" row the reseller means to edit already exists). Usuários
  // doesn't set this flag since a device can legitimately have more than
  // one playlist.
  if (!id && enforceUniqueMac) {
    const existingApp = await prisma.app.findUnique({ where: { macAddress }, include: { listas: true } });
    if (existingApp && existingApp.listas.length > 0) {
      return NextResponse.json({ error: 'MAC já está cadastrado' }, { status: 409 });
    }
  }

  let existingLista: Prisma.ListaGetPayload<{ include: { app: true } }> | null = null;
  if (id) {
    existingLista = await prisma.lista.findUnique({ where: { id }, include: { app: true } });
    if (!existingLista || (auth.role !== 'ADMIN' && existingLista.app.userId !== auth.id)) {
      return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
    }
  } else {
    // Não há mais restrição de dono do MAC aqui: qualquer revendedor logado
    // pode cadastrar lista em qualquer App, desde que ele esteja ativo (ver
    // checagem abaixo). Só existe uma data de ativação por App, e ela vale
    // para todos — não é mais "propriedade" exclusiva de quem ativou.

    // A tela "Usuários" (sem `tipo`) só pode adicionar playlist a um MAC que
    // já tenha passado pela "Ativação App" e continue ativo (Vitalício ou
    // dentro da data). `tipo` presente aqui é a própria ativação, que segue
    // sem essa exigência.
    if (!tipo) {
      const appComAtivacoes = await prisma.app.findUnique({
        where: { macAddress },
        include: { listas: { where: { tipo: { not: null } } } },
      });
      const ativo = appComAtivacoes?.listas.some((l) => !isExpirado(l.dataExpiracao));
      if (!ativo) {
        return NextResponse.json(
          { error: 'MAC não está ativado ou a ativação expirou' },
          { status: 400 }
        );
      }
    }
  }

  // A data de expiração é sempre calculada pelo servidor, nunca aceita do
  // cliente: nem na criação (depende do tipo escolhido) nem na edição (uma
  // vez ativada, a data não muda — "ninguém" pode alterá-la, nem admin).
  // Cobrança de créditos é exclusiva da tela "Ativação App" (que sempre
  // manda `tipo`). A tela "Usuários" cria linhas de Lista para o mesmo
  // dispositivo sem passar `tipo`, e continua sem custo — ela só adiciona
  // playlists a um app já existente, não ativa um app novo.
  let dataExpiracao: Date | null = null;
  let tipoAtivacao: 'ANUAL' | 'VITALICIO' | 'TRIAL' | null = null;

  // Upgrade de um app em teste grátis: só permitido enquanto o tipo
  // cadastrado ainda é TRIAL, e só para ANUAL/VITALICIO (não faz sentido
  // "ativar" de volta pra TRIAL). Cobra crédito e recalcula a data de
  // expiração exatamente como na ativação nova — a diferença é que aqui
  // troca o tipo/data de uma Lista já existente em vez de criar uma.
  const isTrialUpgrade = Boolean(id) && Boolean(tipo) && existingLista?.tipo === 'TRIAL';

  if (isTrialUpgrade) {
    if (tipo !== 'ANUAL' && tipo !== 'VITALICIO') {
      return NextResponse.json({ error: 'Tipo de ativação inválido' }, { status: 400 });
    }
  }

  if ((!id && tipo) || isTrialUpgrade) {
    if (tipo !== 'ANUAL' && tipo !== 'VITALICIO' && tipo !== 'TRIAL') {
      return NextResponse.json({ error: 'Tipo de ativação inválido' }, { status: 400 });
    }
    tipoAtivacao = tipo;

    const cost = ATIVACAO_CREDITS[tipo as 'ANUAL' | 'VITALICIO' | 'TRIAL'];
    if (cost > 0) {
      const debited = await prisma.user.updateMany({
        where: { id: auth.id, credits: { gte: cost } },
        data: { credits: { decrement: cost } },
      });
      if (debited.count === 0) {
        return NextResponse.json({ error: 'Créditos insuficientes para ativar este app' }, { status: 402 });
      }
    }

    if (tipoAtivacao === 'ANUAL') {
      const expira = new Date();
      expira.setFullYear(expira.getFullYear() + 1);
      dataExpiracao = expira;
    } else if (tipoAtivacao === 'TRIAL') {
      const expira = new Date();
      expira.setDate(expira.getDate() + 7);
      dataExpiracao = expira;
    } else {
      dataExpiracao = null;
    }
  }

  const app = await prisma.app.upsert({
    where: { macAddress },
    update: {},
    create: { macAddress, name: macAddress, version: '1.0.0', userId: auth.id },
  });

  const lista = id
    ? // Edição normal: dataExpiracao/tipo nunca mudam. Exceção: upgrade de
      // TRIAL para ANUAL/VITALICIO, tratado acima e aplicado aqui.
      await prisma.lista.update({
        where: { id },
        data: {
          appId: app.id,
          nome: nome || 'Lista',
          url: url || '',
          observacao: observacao ?? undefined,
          ...(isTrialUpgrade && { tipo: tipoAtivacao, dataExpiracao }),
        },
      })
    : await prisma.lista.create({
        data: {
          appId: app.id,
          nome: nome || 'Lista',
          url: url || '',
          dataExpiracao,
          criadoPorId: auth.id,
          observacao: observacao || null,
          ...(tipoAtivacao && { tipo: tipoAtivacao }),
        },
      });

  return NextResponse.json({ lista }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const auth = getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 });
  }

  const lista = await prisma.lista.findUnique({ where: { id: Number(id) }, include: { app: true } });
  if (!lista || (auth.role !== 'ADMIN' && lista.app.userId !== auth.id)) {
    return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 });
  }

  await prisma.lista.delete({ where: { id: Number(id) } }).catch(() => null);
  return NextResponse.json({ ok: true }, { status: 200 });
}
