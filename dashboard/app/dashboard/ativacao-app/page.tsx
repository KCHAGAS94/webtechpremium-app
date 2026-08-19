'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/confirm-dialog';

type TipoAtivacao = 'ANUAL' | 'VITALICIO' | 'TRIAL';

type Lista = {
  id: number;
  mac: string;
  nome: string;
  url: string;
  expiracaoData: string;
  expirado: boolean;
  instaladoEm: string;
  tipo: TipoAtivacao | null;
};

const ATIVACAO_LABEL: Record<TipoAtivacao, string> = {
  ANUAL: 'Anual (1 crédito)',
  VITALICIO: 'Vitalício (5 créditos)',
  TRIAL: 'Teste grátis (7 dias)',
};

const mockListas: Lista[] = [];

function formatInstaladoEm(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Formats free-typed input into AA:BB:CC:DD:EE:FF as the user types: strips
// anything but hex chars, uppercases, and inserts ':' every 2 characters.
function formatMacAddress(value: string): string {
  const hex = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

function EditModal({
  lista,
  onClose,
  onSave,
}: {
  lista: Lista | null;
  onClose: () => void;
  onSave: (lista: Lista) => Promise<string | void>;
}) {
  const [formData, setFormData] = useState<Lista>(lista || ({} as Lista));
  const [error, setError] = useState('');
  const isNew = !lista?.id;

  useEffect(() => {
    if (lista) setFormData(lista);
    setError('');
  }, [lista]);

  if (!lista) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'mac' ? formatMacAddress(value) : value,
    });
    setError('');
  };

  const handleTipoChange = (tipo: TipoAtivacao) => {
    setFormData({ ...formData, tipo });
    setError('');
  };

  const handleSave = async () => {
    const errorMessage = await onSave(formData);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[70%] max-w-xl flex flex-col rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Ativação App</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Endereço MAC</label>
            <input
              type="text"
              name="mac"
              value={formData.mac}
              onChange={handleChange}
              maxLength={17}
              placeholder="00:1A:3M:A3:02:11"
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 uppercase"
            />
          </div>

          {isNew ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de ativação</label>
              <div className="flex gap-3">
                {(Object.keys(ATIVACAO_LABEL) as TipoAtivacao[])
                  .filter((tipo) => tipo !== 'TRIAL')
                  .map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleTipoChange(tipo)}
                    className={`flex-1 px-4 py-2 rounded border font-semibold text-sm transition ${
                      formData.tipo === tipo
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-gray-50 text-gray-600'
                    }`}
                  >
                    {ATIVACAO_LABEL[tipo]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Anual expira automaticamente 1 ano após a ativação. Vitalício nunca expira.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Data expira</label>
              <div className="w-full px-4 py-2 border border-gray-200 rounded bg-gray-100 text-gray-600">
                {formData.expiracaoData || 'Vitalício'}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                A data de expiração é calculada automaticamente no momento da ativação e não pode ser
                alterada.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-500 text-white px-6 py-3 rounded font-semibold hover:bg-green-600 transition"
          >
            ✓ Salvar
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

function TransferModal({
  lista,
  onClose,
  onTransfer,
}: {
  lista: Lista | null;
  onClose: () => void;
  onTransfer: (novoMac: string) => Promise<string | void>;
}) {
  const [novoMac, setNovoMac] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNovoMac('');
    setError('');
  }, [lista]);

  if (!lista) return null;

  const handleConfirm = async () => {
    setLoading(true);
    const errorMessage = await onTransfer(novoMac);
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
          <h2 className="text-xl font-bold text-gray-800">Transferir ativação</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            MAC atual: <span className="font-mono">{lista.mac}</span>
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Novo MAC</label>
            <input
              type="text"
              value={novoMac}
              onChange={(e) => {
                setNovoMac(formatMacAddress(e.target.value));
                setError('');
              }}
              maxLength={17}
              placeholder="00:1A:3M:A3:02:11"
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 uppercase"
            />
          </div>
          <p className="text-xs text-gray-500">
            O MAC atual deixa de existir no painel. O tipo de ativação e a data de expiração continuam
            os mesmos no novo MAC.
          </p>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
          <button
            onClick={handleConfirm}
            disabled={loading || !novoMac}
            className="flex-1 bg-green-500 text-white px-6 py-3 rounded font-semibold hover:bg-green-600 disabled:opacity-50 transition"
          >
            {loading ? 'Transferindo...' : '✓ Transferir'}
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

function ActivateModal({
  lista,
  onClose,
  onActivate,
}: {
  lista: Lista | null;
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
  }, [lista]);

  if (!lista) return null;

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
          <h2 className="text-xl font-bold text-gray-800">Ativar app</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            MAC: <span className="font-mono">{lista.mac}</span> — atualmente em teste grátis.
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
              Anual expira automaticamente 1 ano após a ativação. Vitalício nunca expira.
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

export default function AtivacaoAppPage() {
  const [listas, setListas] = useState(mockListas);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLista, setEditingLista] = useState<Lista | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [transferindoLista, setTransferindoLista] = useState<Lista | null>(null);
  const [ativandoLista, setAtivandoLista] = useState<Lista | null>(null);
  const confirm = useConfirm();

  const loadListas = async () => {
    try {
      const response = await fetch('/api/painel/listas');
      const data = await response.json();
      setListas(data.listas ?? []);
    } catch (error) {
      console.error('Falha ao carregar apps do painel', error);
    }
  };

  useEffect(() => {
    loadListas();
  }, []);

  const filteredListas = listas.filter((lista) =>
    (lista.mac ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (lista: Lista) => {
    if (!(await confirm('Tem certeza que deseja deletar este app?', { confirmLabel: 'Deletar', danger: true }))) return;

    setListas(listas.filter((l) => l.id !== lista.id));
    try {
      await fetch(`/api/painel/listas?id=${lista.id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Falha ao remover app do painel', error);
    }
  };

  const handleRemoveExpirados = async () => {
    const expirados = listas.filter((l) => l.expirado);
    if (expirados.length === 0) return;
    if (!(await confirm(`Remover ${expirados.length} app(s) expirado(s)?`, { confirmLabel: 'Remover', danger: true }))) return;

    try {
      await Promise.all(
        expirados.map((lista) => fetch(`/api/painel/listas?id=${lista.id}`, { method: 'DELETE' }))
      );
      await loadListas();
    } catch (error) {
      console.error('Falha ao remover apps expirados', error);
    }
  };

  const handleAddClick = () => {
    setEditingLista({
      id: 0,
      mac: '',
      nome: '',
      url: '',
      expiracaoData: '',
      expirado: false,
      instaladoEm: '',
      tipo: null,
    });
  };

  const handleSave = async (lista: Lista): Promise<string | void> => {
    if (!lista.id && !lista.tipo) {
      return 'Selecione o tipo de ativação';
    }

    try {
      const response = await fetch('/api/painel/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lista.id || undefined,
          mac: lista.mac,
          nome: lista.nome,
          url: lista.url,
          enforceUniqueMac: true,
          tipo: lista.id ? undefined : lista.tipo,
        }),
      });
      if (!response.ok) {
        if (response.status === 402) {
          setEditingLista(null);
          setShowBuyCredits(true);
          return;
        }
        const data = await response.json().catch(() => ({}));
        return data.error || 'Falha ao salvar app';
      }
      await loadListas();
    } catch (error) {
      console.error('Falha ao salvar app no painel', error);
      return 'Falha ao salvar app';
    }

    setEditingLista(null);
  };

  const handleCloseModal = () => {
    setEditingLista(null);
  };

  const handleActivate = async (tipo: 'ANUAL' | 'VITALICIO'): Promise<string | void> => {
    if (!ativandoLista) return;

    try {
      const response = await fetch('/api/painel/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ativandoLista.id,
          mac: ativandoLista.mac,
          nome: ativandoLista.nome,
          url: ativandoLista.url,
          tipo,
        }),
      });
      if (!response.ok) {
        if (response.status === 402) {
          setAtivandoLista(null);
          setShowBuyCredits(true);
          return;
        }
        const data = await response.json().catch(() => ({}));
        return data.error || 'Falha ao ativar app';
      }
      await loadListas();
    } catch (error) {
      console.error('Falha ao ativar app', error);
      return 'Falha ao ativar app';
    }
  };

  const handleTransfer = async (novoMac: string): Promise<string | void> => {
    if (!transferindoLista) return;

    try {
      const response = await fetch('/api/painel/listas/transferir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transferindoLista.id, novoMac }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return data.error || 'Falha ao transferir ativação';
      }
      await loadListas();
    } catch (error) {
      console.error('Falha ao transferir ativação', error);
      return 'Falha ao transferir ativação';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Ativação App</h2>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-3">
          <button
            onClick={handleAddClick}
            className="flex-1 sm:flex-none bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600 transition flex items-center justify-center gap-2"
          >
            ✓ Adicionar
          </button>
          <button
            onClick={handleRemoveExpirados}
            className="sm:hidden flex-1 bg-red-500 text-white px-6 py-2 rounded font-semibold hover:bg-red-600 transition"
          >
            🗑️ Expirados
          </button>
        </div>
        <div className="flex-1 flex items-center bg-white rounded border border-gray-300 px-3">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Pesquisar Mac..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 outline-none min-w-0"
          />
        </div>
        <button
          onClick={handleRemoveExpirados}
          className="hidden sm:block bg-red-500 text-white px-6 py-2 rounded font-semibold hover:bg-red-600 transition whitespace-nowrap"
        >
          🗑️ Remover Expirados
        </button>
      </div>

      {/* Cards (mobile) */}
      <div className="sm:hidden space-y-3">
        {filteredListas.map((lista) => (
          <div key={lista.id} className="bg-white rounded-lg shadow p-4 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-mono text-xs text-gray-600">{lista.mac}</span>
              <div className="flex gap-3">
                {lista.tipo === 'TRIAL' && (
                  <button
                    onClick={() => setAtivandoLista(lista)}
                    className="text-green-500 hover:text-green-700 text-lg"
                    title="Ativar"
                  >
                    ⭐
                  </button>
                )}
                {lista.tipo && (
                  <button
                    onClick={() => setTransferindoLista(lista)}
                    className="text-purple-500 hover:text-purple-700 text-lg"
                    title="Transferir ativação"
                  >
                    🔁
                  </button>
                )}
                <button
                  onClick={() => setEditingLista(lista)}
                  className="text-blue-500 hover:text-blue-700 text-lg"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(lista)}
                  className="text-red-500 hover:text-red-700 text-lg"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div>
                <div className="text-xs text-gray-400">Instalado em</div>
                <div className="text-gray-700">{formatInstaladoEm(lista.instaladoEm)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Data expira</div>
                <div className="text-gray-700">{lista.expiracaoData || 'Vitalício'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Tipo</div>
                <div className="text-gray-700">{lista.tipo ? ATIVACAO_LABEL[lista.tipo] : '—'}</div>
              </div>
            </div>
            <div>
              {lista.expirado ? (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                  Expirado
                </span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  Ativo
                </span>
              )}
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
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Mac</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Tipo</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Data expira</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 bg-gray-100">Expirado</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700 bg-gray-100">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredListas.map((lista) => (
                <tr key={lista.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{lista.mac}</td>
                  <td className="px-6 py-3 text-gray-600">{lista.tipo ? ATIVACAO_LABEL[lista.tipo] : '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{lista.expiracaoData || 'Vitalício'}</td>
                  <td className="px-6 py-3">
                    {lista.expirado ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        Sim
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                        Não
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 flex justify-center gap-2">
                    {lista.tipo === 'TRIAL' && (
                      <button
                        onClick={() => setAtivandoLista(lista)}
                        className="text-green-500 hover:text-green-700 font-semibold text-xl"
                        title="Ativar"
                      >
                        ⭐
                      </button>
                    )}
                    {lista.tipo && (
                      <button
                        onClick={() => setTransferindoLista(lista)}
                        className="text-purple-500 hover:text-purple-700 font-semibold text-xl"
                        title="Transferir ativação"
                      >
                        🔁
                      </button>
                    )}
                    <button
                      onClick={() => setEditingLista(lista)}
                      className="text-blue-500 hover:text-blue-700 font-semibold text-xl"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(lista)}
                      className="text-red-500 hover:text-red-700 font-semibold text-xl"
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

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredListas.length} de {listas.length} apps
      </div>

      {/* Edit/Add Modal */}
      <EditModal lista={editingLista} onClose={handleCloseModal} onSave={handleSave} />

      {showBuyCredits && <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />}

      <TransferModal
        lista={transferindoLista}
        onClose={() => setTransferindoLista(null)}
        onTransfer={handleTransfer}
      />

      <ActivateModal
        lista={ativandoLista}
        onClose={() => setAtivandoLista(null)}
        onActivate={handleActivate}
      />
    </div>
  );
}
