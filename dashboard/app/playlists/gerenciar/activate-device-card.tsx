'use client';

const PLANS = [
  { label: 'Assinatura vitalícia', price: '€9.99' },
];

export function ActivateDeviceCard() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-xl bg-yellow-900/20 border border-yellow-600/30 p-4">
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
          <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
        </svg>
        <div className="text-sm text-yellow-500/90 leading-relaxed">
          <p className="font-semibold mb-1">Aviso Legal</p>
          <p>
            Nós não fornecemos conteúdo; nosso serviço é um reprodutor de mídia puro. Para usar nosso
            reprodutor, você deve carregar sua própria playlist. Se você não tiver uma playlist, o
            reprodutor não funcionará, e portanto, você não precisa pagar. Além disso, não permitimos
            ativação para usuários que não tenham suas próprias playlists. Cada dispositivo tem um
            endereço MAC único, então um pagamento é válido apenas para um dispositivo.
          </p>
        </div>
      </div>

      {PLANS.map((plan) => (
        <div key={plan.label} className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
          <h3 className="text-xl font-bold mb-2">{plan.label}</h3>
          <p className="text-3xl font-extrabold text-fuchsia-400 mb-6">{plan.price}</p>
          <button className="rounded-lg border border-fuchsia-500/60 text-fuchsia-300 font-semibold px-6 py-2.5 hover:bg-fuchsia-500/10 transition-colors">
            Pagar com Cartão
          </button>
        </div>
      ))}
    </div>
  );
}
