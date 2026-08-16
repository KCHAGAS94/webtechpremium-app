'use client';

import React, { useEffect, useState } from 'react';

type AppInstalado = {
  id: number;
  mac: string;
  revendedorNome: string;
  revendedorEmail: string;
  instaladoEm: string;
  ativado: boolean;
  tipo: 'ANUAL' | 'VITALICIO' | 'TRIAL' | null;
  expiracaoData: string;
  temPlaylist: boolean;
};

const TIPO_LABEL: Record<'ANUAL' | 'VITALICIO' | 'TRIAL', string> = {
  ANUAL: 'Anual',
  VITALICIO: 'Vitalício',
  TRIAL: 'Teste grátis (7 dias)',
};

function formatData(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

// Sem ativação, expiracaoData é a data prevista do trial (instalação + 7
// dias) caso o admin conceda agora — não uma expiração real ainda.
function formatExpira(a: AppInstalado): string {
  if (a.tipo === 'VITALICIO') return 'Vitalício';
  if (!a.expiracaoData) return '—';
  return a.ativado ? formatData(a.expiracaoData) : `${formatData(a.expiracaoData)} (previsto)`;
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

export default function InstaladosPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [apps, setApps] = useState<AppInstalado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [grantingId, setGrantingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadMe = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setAllowed(data.user?.role === 'ADMIN');
  };

  const loadApps = async () => {
    const res = await fetch('/api/admin/instalados');
    if (!res.ok) return;
    const data = await res.json();
    setApps(data.apps ?? []);
  };

  useEffect(() => {
    loadMe();
    loadApps();
  }, []);

  const filtered = apps.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.mac.toLowerCase().includes(term) ||
      a.revendedorNome.toLowerCase().includes(term) ||
      a.revendedorEmail.toLowerCase().includes(term)
    );
  });

  const handleGrantTrial = async (app: AppInstalado) => {
    if (!confirm(`Conceder 7 dias grátis ao MAC ${app.mac}?`)) return;

    setGrantingId(app.id);
    setError('');
    try {
      const res = await fetch('/api/admin/instalados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: app.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Falha ao conceder trial');
        return;
      }
      await loadApps();
    } catch (e) {
      console.error('Falha ao conceder trial', e);
      setError('Falha ao conceder trial');
    } finally {
      setGrantingId(null);
    }
  };

  if (allowed === null) return null;

  if (!allowed) {
    return (
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-2">Acesso negado</h2>
        <p className="text-gray-400">Só o administrador pode acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Instalados</h2>
        <p className="text-sm text-gray-400">
          Todos os MACs que já abriram o app, ativados ou não. Conceda 7 dias grátis a um MAC novo e
          depois adicione a playlist dele em &quot;Usuários&quot;.
        </p>
      </div>

      <div className="flex items-center bg-white rounded border border-gray-300 px-3">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar MAC, revendedor ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 outline-none min-w-0"
        />
      </div>

      {error && <p className="text-sm text-red-400 font-medium">{error}</p>}

      {/* Cards (mobile) */}
      <div className="sm:hidden space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="bg-white rounded-lg shadow p-4 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-gray-600">{a.mac}</span>
              {a.ativado ? (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  Ativado
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                  Não ativado
                </span>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-400">Revendedor</div>
              <div className="text-gray-700">{a.revendedorNome}</div>
              <div className="text-gray-500 text-xs">{a.revendedorEmail}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div>
                <div className="text-xs text-gray-400">Instalado em</div>
                <div className="text-gray-700">{formatDataHora(a.instaladoEm)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Tipo</div>
                <div className="text-gray-700">{a.tipo ? TIPO_LABEL[a.tipo] : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Expira</div>
                <div className="text-gray-700">{formatExpira(a)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Playlist</div>
                <div className="text-gray-700">{a.temPlaylist ? 'Sim' : 'Não'}</div>
              </div>
            </div>
            {!a.ativado && (
              <button
                onClick={() => handleGrantTrial(a)}
                disabled={grantingId === a.id}
                className="w-full bg-fuchsia-600 text-white px-4 py-2 rounded font-semibold hover:bg-fuchsia-700 disabled:opacity-50 transition"
              >
                {grantingId === a.id ? 'Concedendo...' : '🎁 Dar 7 dias grátis'}
              </button>
            )}
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
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Revendedor</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Instalado em</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Tipo</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Expira</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Playlist</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700 bg-gray-100">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{a.mac}</td>
                  <td className="px-6 py-3 text-gray-700">
                    <div>{a.revendedorNome}</div>
                    <div className="text-gray-400 text-xs">{a.revendedorEmail}</div>
                  </td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDataHora(a.instaladoEm)}</td>
                  <td className="px-6 py-3">
                    {a.ativado ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                        Ativado
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        Não ativado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{a.tipo ? TIPO_LABEL[a.tipo] : '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{formatExpira(a)}</td>
                  <td className="px-6 py-3 text-gray-600">{a.temPlaylist ? 'Sim' : 'Não'}</td>
                  <td className="px-6 py-3 text-center">
                    {!a.ativado && (
                      <button
                        onClick={() => handleGrantTrial(a)}
                        disabled={grantingId === a.id}
                        className="bg-fuchsia-600 text-white px-3 py-1.5 rounded font-semibold text-xs hover:bg-fuchsia-700 disabled:opacity-50 transition whitespace-nowrap"
                      >
                        {grantingId === a.id ? 'Concedendo...' : '🎁 7 dias grátis'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Mostrando {filtered.length} de {apps.length} instalados
      </div>
    </div>
  );
}
