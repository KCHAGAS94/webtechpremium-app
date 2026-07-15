export function buildHlsUrl(servidorUrl: string, usuario: string, senha: string): string {
  const base = servidorUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    username: usuario,
    password: senha,
    type: 'm3u_plus',
    output: 'hls',
  });
  return `${base}/get.php?${params.toString()}`;
}

export function isExpirado(dataExpiracao: Date | null): boolean {
  return !!dataExpiracao && dataExpiracao.getTime() < Date.now();
}
