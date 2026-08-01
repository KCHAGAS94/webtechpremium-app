'use client';

type CreditPackage = {
  creditos: number;
  total: number;
  precoUnitario: number;
};

const CREDIT_PACKAGES: CreditPackage[] = [
  { creditos: 5, total: 40, precoUnitario: 8 },
  { creditos: 10, total: 70, precoUnitario: 7 },
  { creditos: 20, total: 120, precoUnitario: 6 },
  { creditos: 30, total: 150, precoUnitario: 5 },
  { creditos: 50, total: 220, precoUnitario: 4.4 },
  { creditos: 100, total: 350, precoUnitario: 3.5 },
];

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CreditosPage() {
  const handleBuy = (pkg: CreditPackage) => {
    // Front-only por enquanto: sem integração de pagamento.
  };

  return (
    <div className="-m-4 md:-m-6 min-h-full bg-[#0b0a12] p-4 md:p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Comprar Crédito</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CREDIT_PACKAGES.map((pkg) => (
          <div key={pkg.creditos} className="rounded-xl bg-[#151320] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="rounded-lg bg-white/10 text-white text-sm font-semibold px-3 py-1.5">
                {pkg.creditos} Créditos
              </span>
              <span className="rounded-lg bg-white/10 text-gray-300 text-sm font-semibold px-3 py-1.5">
                Total R$ {formatBRL(pkg.total)}
              </span>
            </div>

            <div className="rounded-lg border border-dashed border-blue-500/60 text-center text-gray-200 font-semibold py-3 mb-4">
              R$ {formatBRL(pkg.precoUnitario)} cada crédito
            </div>

            <button
              onClick={() => handleBuy(pkg)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold py-3"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <circle cx="12" cy="12" r="10" fillOpacity="0.25" />
                <path d="M12 6a1 1 0 011 1v.09a3 3 0 012 2.81 1 1 0 11-2 0 1 1 0 00-1-1h-.17a1 1 0 00-.33 1.94l1.7.57A3 3 0 0112 17v.09a1 1 0 11-2 0V17a3 3 0 01-2-2.81 1 1 0 112 0 1 1 0 001 1h.17a1 1 0 00.33-1.94l-1.7-.57A3 3 0 0111 7v-.09A1 1 0 0112 6z" />
              </svg>
              Comprar {pkg.creditos} créditos por R$ {formatBRL(pkg.total)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
