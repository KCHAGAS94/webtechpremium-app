'use client';

import { useEffect, useRef, useState } from 'react';
import { ATIVACAO_PRECOS } from '@/lib/ativacaoPricing';

const PLANS: { tipo: 'ANUAL' | 'VITALICIO'; label: string; hint: string }[] = [
  { tipo: 'ANUAL', label: 'Ativação Anual', hint: 'Válida por 1 ano a partir de hoje (ou do vencimento atual, se ainda ativo)' },
  { tipo: 'VITALICIO', label: 'Ativação Vitalícia', hint: 'Nunca expira' },
];

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = {
  mac: string;
  onActivated: () => void;
};

type CheckoutState = 'idle' | 'loading' | 'aguardando' | 'aprovado' | 'erro';

export function ActivateDeviceCard({ mac, onActivated }: Props) {
  const [tipo, setTipo] = useState<'ANUAL' | 'VITALICIO' | null>(null);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<CheckoutState>('idle');
  const [error, setError] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const stoppedRef = useRef(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    stoppedRef.current = false;

    const check = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`/api/app/ativacao/status?id=${paymentId}`);
        const data = await res.json();
        if (!res.ok) return;

        if (data.status === 'approved') {
          stoppedRef.current = true;
          setState('aprovado');
          onActivated();
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          stoppedRef.current = true;
          setState('erro');
          setError('Pagamento não aprovado.');
        }
      } catch {
        // ignora erros transitórios de rede
      }
    };

    check();
    const interval = setInterval(check, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const gerarPix = async () => {
    if (!tipo) return;
    if (!email.trim()) {
      setError('Informe seu email para gerar o Pix.');
      return;
    }

    setError('');
    setState('loading');
    try {
      const res = await fetch('/api/app/ativacao/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, tipo, payer: { email } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao gerar Pix');

      setPaymentId(String(data.id));
      const qrBase64 = data?.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCode = data?.point_of_interaction?.transaction_data?.qr_code;
      if (qrBase64) setQr(`data:image/png;base64,${qrBase64}`);
      if (qrCode) setPixCode(String(qrCode));
      setState('aguardando');
    } catch (err) {
      setState('erro');
      setError(err instanceof Error ? err.message : 'Erro ao gerar Pix');
    }
  };

  const reiniciar = () => {
    setTipo(null);
    setState('idle');
    setError('');
    setQr(null);
    setPixCode(null);
    setPaymentId(null);
  };

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
            Nós não fornecemos conteúdo; nosso serviço é um reprodutor de mídia puro. Cada dispositivo tem
            um endereço MAC único, então um pagamento é válido apenas para o MAC <strong>{mac}</strong>.
          </p>
        </div>
      </div>

      {state === 'aprovado' ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center space-y-3">
          <div className="text-5xl">✅</div>
          <div className="text-lg font-semibold text-green-400">Pagamento aprovado!</div>
          <p className="text-sm text-gray-400">Seu dispositivo já está ativado. Você pode fechar esta tela.</p>
        </div>
      ) : state === 'aguardando' ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center space-y-4">
          <h3 className="text-lg font-semibold">Escaneie o QR Code Pix</h3>
          {qr && <img src={qr} alt="QR Code Pix" className="mx-auto rounded-lg border border-white/10 max-w-[220px]" />}
          {pixCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(pixCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full max-w-xs mx-auto block rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 transition-colors text-white font-semibold py-2.5"
            >
              {copied ? 'Copiado!' : 'Copiar código Pix'}
            </button>
          )}
          <p className="text-xs text-gray-400">
            Aguardando pagamento — assim que for confirmado, a ativação é aplicada aqui automaticamente.
          </p>
          <button onClick={reiniciar} className="text-sm text-gray-400 hover:text-white underline">
            Cancelar e escolher outro plano
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.tipo}
                type="button"
                onClick={() => setTipo(plan.tipo)}
                className={`rounded-xl border p-6 text-center transition-colors ${
                  tipo === plan.tipo
                    ? 'border-fuchsia-500 bg-fuchsia-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <h3 className="text-lg font-bold mb-1">{plan.label}</h3>
                <p className="text-2xl font-extrabold text-fuchsia-400 mb-2">
                  R$ {formatBRL(ATIVACAO_PRECOS[plan.tipo])}
                </p>
                <p className="text-xs text-gray-400">{plan.hint}</p>
              </button>
            ))}
          </div>

          {tipo && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-4 max-w-md">
              <input
                type="email"
                placeholder="Seu email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                onClick={gerarPix}
                disabled={state === 'loading'}
                className="w-full rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 transition-colors text-white font-semibold py-3"
              >
                {state === 'loading' ? 'Gerando...' : `Gerar Pix — R$ ${formatBRL(ATIVACAO_PRECOS[tipo])}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
