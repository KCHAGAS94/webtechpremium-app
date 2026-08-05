'use client';

import React, { useEffect, useState } from 'react';

type TipoAtivacao = 'ANUAL' | 'VITALICIO';

type Transferencia = {
  id: number;
  revendedorNome: string;
  revendedorEmail: string;
  macOrigem: string;
  macDestino: string;
  tipo: TipoAtivacao;
  dataExpiracao: string;
  criadoEm: string;
};

const ATIVACAO_LABEL: Record<TipoAtivacao, string> = {
  ANUAL: 'Anual',
  VITALICIO: 'Vitalício',
};

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

export default function TransferenciasPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadMe = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setIsAdmin(data.user?.role === 'ADMIN');
  };

  const loadTransferencias = async () => {
    const res = await fetch('/api/painel/transferencias');
    if (!res.ok) return;
    const data = await res.json();
    setTransferencias(data.transferencias ?? []);
  };

  useEffect(() => {
    loadMe();
    loadTransferencias();
  }, []);

  const filtered = transferencias.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.macOrigem.toLowerCase().includes(term) ||
      t.macDestino.toLowerCase().includes(term) ||
      t.revendedorNome.toLowerCase().includes(term) ||
      t.revendedorEmail.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Histórico de Transferências</h2>

      <div className="flex items-center bg-white rounded border border-gray-300 px-3">
        <span>🔍</span>
        <input
          type="text"
          placeholder={isAdmin ? 'Pesquisar revendedor, email ou MAC...' : 'Pesquisar MAC...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 outline-none min-w-0"
        />
      </div>

      {/* Cards (mobile) */}
      <div className="sm:hidden space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white rounded-lg shadow p-4 space-y-2">
            {isAdmin && (
              <div>
                <div className="text-xs text-gray-400">Revendedor</div>
                <div className="text-gray-700">{t.revendedorNome}</div>
                <div className="text-gray-500 text-xs">{t.revendedorEmail}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div>
                <div className="text-xs text-gray-400">MAC origem</div>
                <div className="font-mono text-xs text-gray-700">{t.macOrigem}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">MAC destino</div>
                <div className="font-mono text-xs text-gray-700">{t.macDestino}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Tipo</div>
                <div className="text-gray-700">{ATIVACAO_LABEL[t.tipo]}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Expira</div>
                <div className="text-gray-700">{t.dataExpiracao || 'Vitalício'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-400">Transferido em</div>
                <div className="text-gray-700">{formatDataHora(t.criadoEm)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Revendedor</th>
                )}
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">MAC origem</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">MAC destino</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Tipo</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Data expira</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Transferido em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50">
                  {isAdmin && (
                    <td className="px-6 py-3 text-gray-700">
                      <div>{t.revendedorNome}</div>
                      <div className="text-gray-400 text-xs">{t.revendedorEmail}</div>
                    </td>
                  )}
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{t.macOrigem}</td>
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{t.macDestino}</td>
                  <td className="px-6 py-3 text-gray-600">{ATIVACAO_LABEL[t.tipo]}</td>
                  <td className="px-6 py-3 text-gray-600">{t.dataExpiracao || 'Vitalício'}</td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDataHora(t.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Mostrando {filtered.length} de {transferencias.length} transferências
      </div>
    </div>
  );
}
