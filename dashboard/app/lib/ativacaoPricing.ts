// Preços em R$ da ativação Pix direta pelo cliente final (página pública
// "Ativar Dispositivo"). Independente do custo em créditos que o revendedor
// paga na tela admin "Ativação App" (ver ATIVACAO_CREDITS em
// /api/painel/listas) — são dois jeitos de chegar na mesma Lista ativada.
export const ATIVACAO_PRECOS: Record<'ANUAL' | 'VITALICIO', number> = {
  ANUAL: 12,
  VITALICIO: 50,
};

export function isTipoAtivacaoPix(value: unknown): value is 'ANUAL' | 'VITALICIO' {
  return value === 'ANUAL' || value === 'VITALICIO';
}
