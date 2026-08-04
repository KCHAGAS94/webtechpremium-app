export type CreditPackage = {
  id: string;
  credits: number;
  amount: number;
};

// Fonte única de verdade dos pacotes. A API valida o pedido de compra
// contra esta lista para que o valor cobrado nunca venha só do cliente.
// `id` existe porque pode haver mais de um pacote com o mesmo número de
// créditos (ex: os pacotes de teste abaixo), então não dá pra usar
// `credits` sozinho como chave de busca.
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'teste-1-1', credits: 1, amount: 1 },
  { id: 'teste-1-01', credits: 1, amount: 0.1 },
  { id: 'creditos-5', credits: 5, amount: 40 },
  { id: 'creditos-10', credits: 10, amount: 70 },
  { id: 'creditos-20', credits: 20, amount: 120 },
  { id: 'creditos-30', credits: 30, amount: 150 },
  { id: 'creditos-50', credits: 50, amount: 220 },
  { id: 'creditos-100', credits: 100, amount: 350 },
];

export function findCreditPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}
