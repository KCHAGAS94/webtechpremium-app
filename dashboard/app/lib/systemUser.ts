import prisma from '@/lib/prisma';

// Dono padrão de um App/Lista criado sem um revendedor logado por trás (MAC
// que só bateu em /api/devices, ou ativação paga direto via Pix pelo
// cliente final). App.userId é obrigatório, então tudo que não tem
// revendedor real precisa de algum User pra apontar — reaproveita o
// primeiro User existente no banco em vez de criar um "Sistema" por
// registro.
export async function getOrCreateSystemUser() {
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
