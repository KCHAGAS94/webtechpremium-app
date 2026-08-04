'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import { CREDIT_PACKAGES, type CreditPackage } from '@/lib/creditPackages';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type CheckoutState = 'form' | 'processing' | 'approved' | 'rejected';

function CheckoutModal({
  pkg,
  onClose,
}: {
  pkg: CreditPackage;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [mpLoaded, setMpLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qr, setQr] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [state, setState] = useState<CheckoutState>('form');
  const stoppedRef = useRef(false);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    if (publicKey) {
      initMercadoPago(publicKey);
      setMpLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!paymentId) return;
    stoppedRef.current = false;

    const check = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`/api/creditos/status?id=${paymentId}`);
        const data = await res.json();
        if (!res.ok) return;

        if (data.status === 'approved') {
          stoppedRef.current = true;
          setState('approved');
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          stoppedRef.current = true;
          setState('rejected');
          setError('Pagamento não aprovado.');
        }
      } catch {
        // ignora erros transitórios de rede
      }
    };

    check();
    const interval = setInterval(check, 4000);
    return () => clearInterval(interval);
  }, [paymentId]);

  const createPix = async () => {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Preencha nome e email.');
      return;
    }

    setLoading(true);
    setState('processing');
    try {
      const res = await fetch('/api/creditos/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: pkg.credits,
          payment_method: 'pix',
          payer: { email, first_name: name },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao gerar Pix');

      setPaymentId(String(data.id));
      const qrBase64 = data?.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCode = data?.point_of_interaction?.transaction_data?.qr_code;
      if (qrBase64) setQr(`data:image/png;base64,${qrBase64}`);
      if (qrCode) setPixCode(String(qrCode));
      setState('form');
    } catch (err: any) {
      setState('form');
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#151320] border border-white/10 w-full max-w-lg rounded-xl shadow-lg text-white">
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold">Comprar créditos</h2>
            <p className="text-sm text-gray-400">
              {pkg.credits} créditos por R$ {formatBRL(pkg.amount)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {state === 'approved' ? (
            <div className="text-center space-y-3 py-6">
              <div className="text-5xl">✅</div>
              <div className="text-lg font-semibold text-green-400">Pagamento aprovado!</div>
              <p className="text-sm text-gray-400">
                {pkg.credits} créditos foram adicionados à sua conta.
              </p>
              <button
                onClick={onClose}
                className="mt-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold px-6 py-2 rounded-lg"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-2 rounded bg-[#0b0a12] border border-white/10 text-white placeholder-gray-500 col-span-2 sm:col-span-1"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-2 rounded bg-[#0b0a12] border border-white/10 text-white placeholder-gray-500 col-span-2 sm:col-span-1"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMethod('pix')}
                  className={`flex-1 py-2 rounded-lg border font-semibold ${
                    method === 'pix' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-white/10 text-gray-300'
                  }`}
                >
                  ◈ Pix
                </button>
                <button
                  onClick={() => setMethod('card')}
                  className={`flex-1 py-2 rounded-lg border font-semibold ${
                    method === 'card' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-white/10 text-gray-300'
                  }`}
                >
                  ▣ Cartão
                </button>
              </div>

              {method === 'pix' && (
                <div className="space-y-4">
                  {!qr ? (
                    <button
                      onClick={createPix}
                      disabled={loading}
                      className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 transition-colors text-white font-semibold py-3 rounded-lg"
                    >
                      {loading ? 'Gerando...' : 'Gerar QR Code'}
                    </button>
                  ) : (
                    <div className="text-center space-y-3">
                      <img src={qr} alt="QR Code Pix" className="mx-auto rounded-lg border border-white/10 max-w-[220px]" />
                      {pixCode && (
                        <button
                          onClick={() => navigator.clipboard.writeText(pixCode)}
                          className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 transition-colors text-white font-semibold py-2 rounded-lg"
                        >
                          Copiar código Pix
                        </button>
                      )}
                      <p className="text-xs text-gray-400">
                        Aguardando pagamento — assim que for confirmado, os créditos são liberados aqui automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {method === 'card' && (
                <div>
                  <input
                    type="text"
                    placeholder="CPF do titular"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded bg-[#0b0a12] border border-white/10 text-white placeholder-gray-500"
                  />
                  {!name.trim() || !email.trim() ? (
                    <p className="text-sm text-gray-400">Preencha nome e email para carregar o formulário de cartão.</p>
                  ) : (
                    <CardPayment
                      key={pkg.credits}
                      initialization={{
                        amount: pkg.amount,
                        payer: {
                          email,
                          identification: cpf ? { type: 'CPF', number: cpf.replace(/\D/g, '') } : undefined,
                        },
                      }}
                      customization={{
                        paymentMethods: { minInstallments: 1, maxInstallments: 3 },
                        visual: { hideFormTitle: true },
                      }}
                      onReady={() => setMpLoaded(true)}
                      onError={(err) => {
                        console.error('CardPayment Brick error', err);
                        setError('Não foi possível carregar o formulário de cartão.');
                      }}
                      onSubmit={async (data) => {
                        setLoading(true);
                        setError(null);
                        setState('processing');
                        try {
                          const res = await fetch('/api/creditos/pagamento', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              credits: pkg.credits,
                              payment_method: 'card',
                              token: data.token,
                              installments: data.installments,
                              payment_method_id: data.payment_method_id,
                              issuer_id: data.issuer_id,
                              payer: {
                                email,
                                first_name: name,
                                identification: cpf ? { type: 'CPF', number: cpf.replace(/\D/g, '') } : undefined,
                              },
                            }),
                          });
                          const result = await res.json();
                          if (!res.ok) throw new Error(result?.error || 'Erro ao processar cartão');

                          if (result.status === 'approved') {
                            setState('approved');
                          } else {
                            setPaymentId(String(result.id));
                            setState('form');
                          }
                        } catch (err: any) {
                          setState('form');
                          setError(err?.message ?? String(err));
                        } finally {
                          setLoading(false);
                        }
                      }}
                    />
                  )}
                  {!mpLoaded && <p className="text-xs text-gray-500 mt-2">Carregando SDK do Mercado Pago...</p>}
                </div>
              )}

              {state === 'processing' && (
                <p className="text-sm text-blue-400">Processando pagamento, aguarde a confirmação...</p>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreditosPage() {
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);

  return (
    <div className="-m-4 md:-m-6 min-h-full bg-[#0b0a12] p-4 md:p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Comprar Crédito</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CREDIT_PACKAGES.map((pkg) => (
          <div key={pkg.credits} className="rounded-xl bg-[#151320] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="rounded-lg bg-white/10 text-white text-sm font-semibold px-3 py-1.5">
                {pkg.credits} Créditos
              </span>
              <span className="rounded-lg bg-white/10 text-gray-300 text-sm font-semibold px-3 py-1.5">
                Total R$ {formatBRL(pkg.amount)}
              </span>
            </div>

            <div className="rounded-lg border border-dashed border-blue-500/60 text-center text-gray-200 font-semibold py-3 mb-4">
              R$ {formatBRL(pkg.amount / pkg.credits)} cada crédito
            </div>

            <button
              onClick={() => setSelectedPkg(pkg)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold py-3"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <circle cx="12" cy="12" r="10" fillOpacity="0.25" />
                <path d="M12 6a1 1 0 011 1v.09a3 3 0 012 2.81 1 1 0 11-2 0 1 1 0 00-1-1h-.17a1 1 0 00-.33 1.94l1.7.57A3 3 0 0112 17v.09a1 1 0 11-2 0V17a3 3 0 01-2-2.81 1 1 0 112 0 1 1 0 001 1h.17a1 1 0 00.33-1.94l-1.7-.57A3 3 0 0111 7v-.09A1 1 0 0112 6z" />
              </svg>
              Comprar {pkg.credits} créditos por R$ {formatBRL(pkg.amount)}
            </button>
          </div>
        ))}
      </div>

      {selectedPkg && <CheckoutModal pkg={selectedPkg} onClose={() => setSelectedPkg(null)} />}
    </div>
  );
}
