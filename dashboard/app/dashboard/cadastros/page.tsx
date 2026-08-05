'use client';

import React, { useEffect, useState } from 'react';

type Cadastro = {
  id: number;
  revendedorNome: string;
  revendedorEmail: string;
  mac: string;
  lista: string;
  url: string;
  cadastradoEm: string;
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

export default function CadastrosPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadMe = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setAllowed(data.user?.role === 'ADMIN');
  };

  const loadCadastros = async () => {
    const res = await fetch('/api/admin/cadastros');
    if (!res.ok) return;
    const data = await res.json();
    setCadastros(data.cadastros ?? []);
  };

  useEffect(() => {
    loadMe();
    loadCadastros();
  }, []);

  const filtered = cadastros.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.revendedorNome.toLowerCase().includes(term) ||
      c.revendedorEmail.toLowerCase().includes(term) ||
      c.mac.toLowerCase().includes(term) ||
      c.lista.toLowerCase().includes(term)
    );
  });

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
      <h2 className="text-2xl font-bold text-white">Cadastros</h2>

      <div className="flex items-center bg-white rounded border border-gray-300 px-3">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar revendedor, email, MAC ou lista..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 outline-none min-w-0"
        />
      </div>

      {/* Cards (mobile) */}
      <div className="sm:hidden space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow p-4 space-y-2">
            <div>
              <div className="text-xs text-gray-400">Revendedor</div>
              <div className="text-gray-700">{c.revendedorNome}</div>
              <div className="text-gray-500 text-xs">{c.revendedorEmail}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div>
                <div className="text-xs text-gray-400">Mac</div>
                <div className="font-mono text-xs text-gray-700">{c.mac}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Lista</div>
                <div className="text-gray-700">{c.lista}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-400">Link</div>
                <div className="text-gray-700 truncate" title={c.url}>{c.url || '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-400">Cadastrado em</div>
                <div className="text-gray-700">{formatDataHora(c.cadastradoEm)}</div>
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
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Revendedor</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Mac</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Lista</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Link</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-700">
                    <div>{c.revendedorNome}</div>
                    <div className="text-gray-400 text-xs">{c.revendedorEmail}</div>
                  </td>
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{c.mac}</td>
                  <td className="px-6 py-3 text-gray-600">{c.lista}</td>
                  <td className="px-6 py-3 text-gray-600 max-w-xs truncate" title={c.url}>{c.url}</td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDataHora(c.cadastradoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Mostrando {filtered.length} de {cadastros.length} cadastros
      </div>
    </div>
  );
}
