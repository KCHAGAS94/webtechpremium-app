export type CreditPackage = {
  credits: number;
  amount: number;
};

// Fonte única de verdade dos pacotes. A API valida o pedido de compra
// contra esta lista para que o valor cobrado nunca venha só do cliente.
export const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 5, amount: 40 },
  { credits: 10, amount: 70 },
  { credits: 20, amount: 120 },
  { credits: 30, amount: 150 },
  { credits: 50, amount: 220 },
  { credits: 100, amount: 350 },
];

export function findCreditPackage(credits: number): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.credits === credits);
}
