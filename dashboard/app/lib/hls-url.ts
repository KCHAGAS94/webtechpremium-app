// Menor que hoje = expirado; igual ou maior que hoje = ativo. Compara só a
// data (sem horário) para que uma expiração marcada para "hoje" não vire
// expirada só porque já passou meia-noite.
export function isExpirado(dataExpiracao: Date | null): boolean {
  if (!dataExpiracao) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const expira = new Date(dataExpiracao);
  expira.setHours(0, 0, 0, 0);
  return expira.getTime() < hoje.getTime();
}
