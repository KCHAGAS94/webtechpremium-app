'use client';

import { useEffect, useState } from 'react';
import { useConfirm } from '@/components/confirm-dialog';
import { useMacExists } from '@/lib/use-mac-exists';
import { MacStatus } from '@/components/mac-status';

function formatMacAddress(value: string) {
  const hex = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

type Props = {
  mac: string;
  onTransferred: (novoMac: string) => void;
};

// Trocar o MAC ativado é ação de revendedor/admin (a API já garante isso —
// só o dono do MAC ou um admin consegue), não do cliente final. Antes essa
// aba chamava a API autenticada direto: sem sessão, dava 401 silencioso;
// com uma sessão de revendedor aberta por acaso no mesmo navegador, ela
// agia sobre os dados desse revendedor em vez de pedir login. Agora checa
// /api/auth/me primeiro e pede login explicitamente quando não há sessão.
export function TransferActivationCard({ mac, onTransferred }: Props) {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [novoMac, setNovoMac] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirm = useConfirm();
  const macStatus = useMacExists(novoMac);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setLoggedIn(!!data.user))
      .catch(() => setLoggedIn(false))
      .finally(() => setAuthChecked(true));
  }, []);

  const handleTransfer = async () => {
    setError('');

    if (macStatus !== 'valid') {
      setError('Adicione um MAC válido');
      return;
    }

    const confirmado = await confirm(
      `Tem certeza que deseja trocar o MAC ativado de ${mac} para ${novoMac}?\n\n` +
        'Essa ação vai apagar automaticamente todas as playlists cadastradas no MAC atual e não pode ser desfeita.',
      { confirmLabel: 'Trocar MAC', danger: true }
    );
    if (!confirmado) return;

    setLoading(true);
    try {
      const listasResponse = await fetch(`/api/painel/listas?mac=${encodeURIComponent(mac)}`);
      const listasData = await listasResponse.json();
      const ativacao = (listasData.listas ?? []).find((l: { tipo: string | null }) => l.tipo);

      if (!ativacao) {
        throw new Error('Nenhuma ativação encontrada para este MAC');
      }

      const response = await fetch('/api/painel/listas/transferir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ativacao.id, novoMac }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao transferir ativação');
      }

      setNovoMac('');
      onTransferred(novoMac);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao transferir ativação');
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) return null;

  if (!loggedIn) {
    const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/playlists/gerenciar';
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-8 max-w-xl text-center space-y-4">
        <h2 className="text-xl font-bold">Transferir ativação para outro dispositivo</h2>
        <p className="text-sm text-gray-400">
          Essa ação é feita pelo revendedor ou pelo administrador responsável pelo seu MAC. Faça login no
          painel para continuar.
        </p>
        <a
          href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-block rounded-lg bg-white text-[#0b0a12] font-semibold px-6 py-2.5 hover:bg-gray-200 transition-colors"
        >
          Fazer login
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-8 max-w-xl">
      <h2 className="text-xl font-bold mb-6">Transferir ativação para outro dispositivo</h2>

      <label htmlFor="novoMac" className="sr-only">
        Novo endereço MAC
      </label>
      <input
        id="novoMac"
        type="text"
        required
        placeholder="Novo endereço MAC *"
        value={novoMac}
        onChange={(e) => setNovoMac(formatMacAddress(e.target.value))}
        maxLength={17}
        className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
      />
      {macStatus === 'checking' && <p className="text-sm text-gray-400 mb-6 mt-1">Verificando…</p>}
      {macStatus === 'valid' && <p className="text-sm text-green-400 mb-6 mt-1">✅ MAC válido</p>}
      {macStatus === 'invalid' && <p className="text-sm text-red-400 mb-6 mt-1">Adicione um MAC válido</p>}
      {macStatus === 'idle' && <div className="mb-6" />}

      <div className="flex gap-3 rounded-xl bg-yellow-900/20 border border-yellow-600/30 p-4 mb-6">
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
          <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-yellow-500/90 leading-relaxed">
          Ao trocar o MAC ativado, todas as playlists cadastradas no dispositivo atual serão apagadas
          automaticamente.
        </p>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="flex justify-end gap-6">
        <button
          type="button"
          onClick={() => setNovoMac('')}
          className="text-sm font-semibold text-gray-300 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading || macStatus !== 'valid'}
          onClick={handleTransfer}
          className="rounded-lg bg-white text-[#0b0a12] font-semibold px-6 py-2.5 hover:bg-gray-200 transition-colors disabled:opacity-60"
        >
          {loading ? 'Transferindo...' : 'Transferir ativação'}
        </button>
      </div>
    </div>
  );
}
