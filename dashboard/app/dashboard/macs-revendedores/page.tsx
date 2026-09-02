'use client';

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/components/confirm-dialog';

type TipoAtivacao = 'ANUAL' | 'VITALICIO';

type Registro = {
  id: number;
  appId: number;
  mac: string;
  revendedorId: number;
  revendedorNome: string;
  revendedorEmail: string;
  tipo: TipoAtivacao | null;
  dataExpiracao: string;
  expirado: boolean;
  cadastradoEm: string;
};

type Revendedor = {
  id: number;
  name: string;
  email: string;
};

const ATIVACAO_LABEL: Record<TipoAtivacao, string> = {
  ANUAL: 'Anual',
  VITALICIO: 'Vitalício',
};

function formatData(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function MacsRevendedoresPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<Registro | null>(null);
  const [novoRevendedorId, setNovoRevendedorId] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAtivacao | ''>('');
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const loadMe = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setAllowed(data.user?.role === 'ADMIN');
  };

  const loadRegistros = async () => {
    const res = await fetch('/api/admin/macs-revendedores');
    if (!res.ok) return;
    const data = await res.json();
    setRegistros(data.registros ?? []);
  };

  const loadRevendedores = async () => {
    const res = await fetch('/api/revendedores');
    if (!res.ok) return;
    const data = await res.json();
    setRevendedores(data.revendedores ?? []);
  };

  useEffect(() => {
    loadMe();
    loadRegistros();
    loadRevendedores();
  }, []);

  const handleDelete = async (id: number) => {
    if (!(await confirm('Remover este MAC?', { confirmLabel: 'Remover', danger: true }))) return;
    await fetch(`/api/admin/macs-revendedores?id=${id}`, { method: 'DELETE' });
    await loadRegistros();
  };

  const openEdit = (r: Registro) => {
    setEditing(r);
    setNovoRevendedorId(String(r.revendedorId));
    setNovoTipo(r.tipo ?? '');
  };

  const handleSaveRevendedor = async () => {
    if (!editing || !novoRevendedorId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/macs-revendedores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: editing.appId,
          revendedorId: Number(novoRevendedorId),
          // Só manda listaId/tipo quando o registro nunca teve tipo (legado);
          // a API ignora se a Lista já tiver um tipo definido.
          ...(editing.tipo === null && novoTipo && { listaId: editing.id, tipo: novoTipo }),
        }),
      });
      if (res.ok) {
        setEditing(null);
        await loadRegistros();
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = registros.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.mac.toLowerCase().includes(term) ||
      r.revendedorNome.toLowerCase().includes(term) ||
      r.revendedorEmail.toLowerCase().includes(term)
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
      <h2 className="text-2xl font-bold text-white">MACs por Revendedor</h2>

      <div className="flex items-center bg-white rounded border border-gray-300 px-3">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar revendedor, email ou MAC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 outline-none min-w-0"
        />
      </div>

      {/* Cards (mobile) */}
      <div className="sm:hidden space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white rounded-lg shadow p-4 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-gray-600">{r.mac}</span>
              {r.expirado ? (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                  Expirado
                </span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  Ativo
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="col-span-2">
                <div className="text-xs text-gray-400">Revendedor</div>
                <div className="text-gray-700">{r.revendedorNome}</div>
                <div className="text-gray-500 text-xs">{r.revendedorEmail}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Tipo</div>
                <div className="text-gray-700">{r.tipo ? ATIVACAO_LABEL[r.tipo] : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Expira</div>
                <div className="text-gray-700">{r.dataExpiracao ? formatData(r.dataExpiracao) : 'Vitalício'}</div>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => openEdit(r)}
                className="text-blue-500 hover:text-blue-700 text-sm font-semibold"
              >
                Editar revendedor
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-red-500 hover:text-red-700 text-sm font-semibold"
              >
                Excluir
              </button>
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
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Tipo</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Data expira</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Expirado</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700 bg-gray-100">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-700">
                    <div>{r.revendedorNome}</div>
                    <div className="text-gray-400 text-xs">{r.revendedorEmail}</div>
                  </td>
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{r.mac}</td>
                  <td className="px-6 py-3 text-gray-600">{r.tipo ? ATIVACAO_LABEL[r.tipo] : '—'}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {r.dataExpiracao ? formatData(r.dataExpiracao) : 'Vitalício'}
                  </td>
                  <td className="px-6 py-3">
                    {r.expirado ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        Sim
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                        Não
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-blue-500 hover:text-blue-700 text-lg mr-3"
                      title="Editar revendedor"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-500 hover:text-red-700 text-lg"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Mostrando {filtered.length} de {registros.length} MACs
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Editar revendedor</h3>
            <p className="text-sm text-gray-500 font-mono">{editing.mac}</p>
            <select
              value={novoRevendedorId}
              onChange={(e) => setNovoRevendedorId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-700"
            >
              {revendedores.map((rev) => (
                <option key={rev.id} value={rev.id}>
                  {rev.name} ({rev.email})
                </option>
              ))}
            </select>
            {editing.tipo === null && (
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Este MAC nunca teve um tipo de ativação — sem isso ele não aparece na tela
                  &quot;Ativação App&quot; do revendedor. Defina um tipo para corrigir:
                </p>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as TipoAtivacao | '')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-700"
                >
                  <option value="">Manter sem tipo</option>
                  <option value="VITALICIO">Vitalício</option>
                  <option value="ANUAL">Anual (expira em 1 ano a partir de hoje)</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRevendedor}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={saving || !novoRevendedorId}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
