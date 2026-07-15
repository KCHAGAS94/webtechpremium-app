'use client';

import React, { useEffect, useState } from 'react';

type Servidor = {
  id: number;
  nome: string;
  url: string;
};

type Lista = {
  id: number;
  mac: string;
  servidorId: number;
  servidorNome: string;
  nome: string;
  usuario: string;
  senha: string;
  expiracaoData: string;
  expirado: boolean;
};

const mockListas: Lista[] = [];

// Formats free-typed input into AA:BB:CC:DD:EE:FF as the user types: strips
// anything but hex chars, uppercases, and inserts ':' every 2 characters.
function formatMacAddress(value: string): string {
  const hex = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

function EditModal({
  lista,
  servidores,
  onClose,
  onSave,
}: {
  lista: Lista | null;
  servidores: Servidor[];
  onClose: () => void;
  onSave: (lista: Lista) => void;
}) {
  const [formData, setFormData] = useState<Lista>(lista || ({} as Lista));

  useEffect(() => {
    if (lista) setFormData(lista);
  }, [lista]);

  if (!lista) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'mac' ? formatMacAddress(value) : name === 'servidorId' ? Number(value) : value,
    });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[70%] max-w-xl flex flex-col rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Usuário</h2>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Servidor</label>
            <select
              name="servidorId"
              value={formData.servidorId || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
            >
              <option value="" disabled>
                Selecione um servidor
              </option>
              {servidores.map((servidor) => (
                <option key={servidor.id} value={servidor.id}>
                  {servidor.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Usuário</label>
            <input
              type="text"
              name="usuario"
              value={formData.usuario}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
            <input
              type="text"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Lista</label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Ex: Lista principal"
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Data expira</label>
            <input
              type="date"
              name="expiracaoData"
              value={formData.expiracaoData}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
          </div>
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

export default function UsuariosPage() {
  const [listas, setListas] = useState(mockListas);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLista, setEditingLista] = useState<Lista | null>(null);

  const loadListas = async () => {
    try {
      const response = await fetch('/api/painel/listas');
      const data = await response.json();
      setListas(data.listas ?? []);
    } catch (error) {
      console.error('Falha ao carregar listas do painel', error);
    }
  };

  useEffect(() => {
    loadListas();

    (async () => {
      try {
        const response = await fetch('/api/painel/servidores');
        const data = await response.json();
        setServidores(data.servidores ?? []);
      } catch (error) {
        console.error('Falha ao carregar servidores', error);
      }
    })();
  }, []);

  const filteredListas = listas.filter(
    (lista) =>
      (lista.mac ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lista.usuario ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lista.nome ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (lista: Lista) => {
    if (!confirm('Tem certeza que deseja deletar esta lista?')) return;

    setListas(listas.filter((l) => l.id !== lista.id));
    try {
      await fetch(`/api/painel/listas?id=${lista.id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Falha ao remover lista do painel', error);
    }
  };

  const handleRemoveExpirados = async () => {
    const expirados = listas.filter((l) => l.expirado);
    if (expirados.length === 0) return;
    if (!confirm(`Remover ${expirados.length} lista(s) expirada(s)?`)) return;

    try {
      await Promise.all(
        expirados.map((lista) => fetch(`/api/painel/listas?id=${lista.id}`, { method: 'DELETE' }))
      );
      await loadListas();
    } catch (error) {
      console.error('Falha ao remover listas expiradas', error);
    }
  };

  const handleAddClick = () => {
    setEditingLista({
      id: 0,
      mac: '',
      servidorId: servidores[0]?.id ?? 0,
      servidorNome: '',
      nome: '',
      usuario: '',
      senha: '',
      expiracaoData: '',
      expirado: false,
    });
  };

  const handleSave = async (lista: Lista) => {
    try {
      await fetch('/api/painel/listas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lista.id || undefined,
          mac: lista.mac,
          servidorId: lista.servidorId,
          nome: lista.nome,
          usuario: lista.usuario,
          senha: lista.senha,
          expiracaoData: lista.expiracaoData,
        }),
      });
      await loadListas();
    } catch (error) {
      console.error('Falha ao salvar lista no painel', error);
    }

    setEditingLista(null);
  };

  const handleCloseModal = () => {
    setEditingLista(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Usuários</h2>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleAddClick}
          className="bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600 transition flex items-center gap-2"
        >
          ✓ Adicionar
        </button>
        <div className="flex-1 flex items-center bg-white rounded border border-gray-300 px-3">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Pesquisar Mac / Usuário / Lista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 outline-none"
          />
        </div>
        <button
          onClick={handleRemoveExpirados}
          className="bg-red-500 text-white px-6 py-2 rounded font-semibold hover:bg-red-600 transition"
        >
          🗑️ Remover Expirados
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Mac</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Usuário</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Senha</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Lista</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Data expira</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Expirado</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredListas.map((lista) => (
              <tr key={lista.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-600 font-mono text-xs">{lista.mac}</td>
                <td className="px-6 py-3 text-gray-600">{lista.usuario}</td>
                <td className="px-6 py-3 text-gray-600">{lista.senha}</td>
                <td className="px-6 py-3 text-gray-600">{lista.nome}</td>
                <td className="px-6 py-3 text-gray-600">{lista.expiracaoData}</td>
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

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredListas.length} de {listas.length} usuários
      </div>

      {/* Edit/Add Modal */}
      <EditModal lista={editingLista} servidores={servidores} onClose={handleCloseModal} onSave={handleSave} />
    </div>
  );
}
