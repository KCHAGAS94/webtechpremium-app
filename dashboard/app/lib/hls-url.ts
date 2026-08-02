export function isExpirado(dataExpiracao: Date | null): boolean {
  return !!dataExpiracao && dataExpiracao.getTime() < Date.now();
}
