'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type TesteGratis = {
  id: number;
  mac: string;
  instaladoEm: string;
  expiracaoData: string;
};

const ATIVACAO_LABEL: Record<'ANUAL' | 'VITALICIO', string> = {
  ANUAL: 'Anual (1 crédito)',
  VITALICIO: 'Vitalício (5 créditos)',
};

function formatData(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatDataHora(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivateModal({
  item,
  onClose,
  onActivate,
}: {
  item: TesteGratis | null;
  onClose: () => void;
  onActivate: (tipo: 'ANUAL' | 'VITALICIO') => Promise<string | void>;
}) {
  const [tipo, setTipo] = useState<'ANUAL' | 'VITALICIO' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTipo(null);
    setError('');
    setLoading(false);
  }, [item]);

  if (!item) return null;

  const handleConfirm = async () => {
    if (!tipo) {
      setError('Selecione o tipo de ativação');
      return;
    }
    setLoading(true);
    const errorMessage = await onActivate(tipo);
    setLoading(false);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-md rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Ativar teste grátis</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            MAC: <span className="font-mono">{item.mac}</span> — em teste grátis até{' '}
            {formatData(item.expiracaoData)}.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de ativação</label>
            <div className="flex gap-3">
              {(['ANUAL', 'VITALICIO'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => {
                    setTipo(opcao);
                    setError('');
                  }}
                  className={`flex-1 px-4 py-2 rounded border font-semibold text-sm transition ${
                    tipo === opcao
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-gray-50 text-gray-600'
                  }`}
                >
                  {ATIVACAO_LABEL[opcao]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Anual expira automaticamente 1 ano após a ativação. Vitalício nunca expira. Depois de
              ativado, esse MAC passa a aparecer só no seu painel.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
          <button
            onClick={handleConfirm}
            disabled={loading || !tipo}
            className="flex-1 bg-green-500 text-white px-6 py-3 rounded font-semibold hover:bg-green-600 disabled:opacity-50 transition"
          >
            {loading ? 'Ativando...' : '✓ Ativar'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded font-semibold hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyCreditsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-sm rounded-lg shadow-lg p-6 text-center space-y-4">
        <div className="text-4xl">💳</div>
        <h2 className="text-lg font-bold text-gray-800">Créditos insuficientes</h2>
        <p className="text-sm text-gray-600">
          Você não tem créditos suficientes para ativar este app. Compre mais créditos para continuar.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.push('/dashboard/creditos')}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded font-semibold hover:bg-green-600 transition"
          >
            Comprar créditos
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TesteGratisPage() {
  const [itens, setItens] = useState<TesteGratis[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ativandoItem, setAtivandoItem] = useState<TesteGratis | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [error, setError] = useState('');

  const loadItens = async () => {
    const res = await fetch('/api/painel/teste-gratis');
    if (!res.ok) return;
    const data = await res.json();
    setItens(data.listas ?? []);
  };

  useEffect(() => {
    loadItens();
  }, []);

  const filtered = itens.filter((item) => item.mac.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleActivate = async (tipo: 'ANUAL' | 'VITALICIO'): Promise<string | void> => {
    if (!ativandoItem) return;

    try {
      const response = await fetch('/api/painel/teste-gratis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ativandoItem.id, tipo }),
      });
      if (!response.ok) {
        if (response.status === 402) {
          setAtivandoItem(null);
          setShowBuyCredits(true);
          return;
        }
        const data = await response.json().catch(() => ({}));
        return data.error || 'Falha ao ativar app';
      }
      await loadItens();
      window.dispatchEvent(new Event('webtech:credits-changed'));
    } catch (e) {
      console.error('Falha ao ativar app', e);
      return 'Falha ao ativar app';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Teste grátis</h2>
        <p className="text-sm text-gray-400">
          MACs recém-instalados, ainda no teste grátis de 7 dias. Ative qualquer um deles antes que
          outro revendedor o faça — ao ativar, o MAC passa a aparecer só no seu painel.
        </p>
      </div>

      <div className="flex items-center bg-white rounded border border-gray-300 px-3">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar Mac..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 outline-none min-w-0"
        />
      </div>

      {error && <p className="text-sm text-red-400 font-medium">{error}</p>}

      {/* Cards (mobile) */}
      <div className="sm:hidden space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-gray-600">{item.mac}</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                Teste grátis
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div>
                <div className="text-xs text-gray-400">Instalado em</div>
                <div className="text-gray-700">{formatDataHora(item.instaladoEm)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Expira</div>
                <div className="text-gray-700">{formatData(item.expiracaoData)}</div>
              </div>
            </div>
            <button
              onClick={() => setAtivandoItem(item)}
              className="w-full bg-green-500 text-white px-4 py-2 rounded font-semibold hover:bg-green-600 transition"
            >
              ✓ Ativar
            </button>
          </div>
        ))}
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Mac</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Instalado em</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Expira</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700 bg-gray-100">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{item.mac}</td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {formatDataHora(item.instaladoEm)}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{formatData(item.expiracaoData)}</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => setAtivandoItem(item)}
                      className="bg-green-500 text-white px-3 py-1.5 rounded font-semibold text-xs hover:bg-green-600 transition whitespace-nowrap"
                    >
                      ✓ Ativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Mostrando {filtered.length} de {itens.length} em teste grátis
      </div>

      {showBuyCredits && <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />}

      <ActivateModal item={ativandoItem} onClose={() => setAtivandoItem(null)} onActivate={handleActivate} />
    </div>
  );
}
