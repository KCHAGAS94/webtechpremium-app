'use client';

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/components/confirm-dialog';

type Servidor = {
  id: number;
  nome: string;
  url: string;
};

function EditModal({
  servidor,
  onClose,
  onSave,
}: {
  servidor: Servidor | null;
  onClose: () => void;
  onSave: (servidor: Servidor) => void;
}) {
  const [formData, setFormData] = useState<Servidor>(servidor || ({} as Servidor));

  useEffect(() => {
    setFormData(servidor || ({} as Servidor));
  }, [servidor]);

  if (!servidor) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[70%] max-w-xl flex flex-col rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Servidor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Ex: Servidor 1"
              className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">URL</label>
            <input
              type="text"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="http://e.distcdn.online"
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

export default function ServidoresPage() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [editingServidor, setEditingServidor] = useState<Servidor | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const confirm = useConfirm();

  const loadServidores = async () => {
    try {
      const response = await fetch('/api/painel/servidores');
      const data = await response.json();
      setServidores(data.servidores ?? []);
    } catch (error) {
      console.error('Falha ao carregar servidores', error);
    }
  };

  useEffect(() => {
    loadServidores();
  }, []);

  const handleAddClick = () => {
    setEditingServidor({ id: 0, nome: '', url: '' });
    setIsAdding(true);
  };

  const handleSave = async (servidor: Servidor) => {
    try {
      await fetch('/api/painel/servidores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isAdding ? undefined : servidor.id,
          nome: servidor.nome,
          url: servidor.url,
        }),
      });
      await loadServidores();
    } catch (error) {
      console.error('Falha ao salvar servidor', error);
    }

    setEditingServidor(null);
    setIsAdding(false);
  };

  const handleDelete = async (servidor: Servidor) => {
    if (!(await confirm('Tem certeza que deseja deletar este servidor?', { confirmLabel: 'Deletar', danger: true }))) return;

    try {
      await fetch(`/api/painel/servidores?id=${servidor.id}`, { method: 'DELETE' });
      await loadServidores();
    } catch (error) {
      console.error('Falha ao remover servidor', error);
    }
  };

  const handleCloseModal = () => {
    setEditingServidor(null);
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Servidores</h2>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAddClick}
          className="bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600 transition flex items-center gap-2"
        >
          ✓ Adicionar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">URL</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servidores.map((servidor) => (
              <tr key={servidor.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-600">{servidor.nome}</td>
                <td className="px-6 py-3 text-gray-600 font-mono text-xs">{servidor.url}</td>
                <td className="px-6 py-3 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setEditingServidor(servidor);
                      setIsAdding(false);
                    }}
                    className="text-blue-500 hover:text-blue-700 font-semibold text-xl"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(servidor)}
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

      <div className="text-sm text-gray-600">{servidores.length} servidor(es) cadastrado(s)</div>

      <EditModal servidor={editingServidor} onClose={handleCloseModal} onSave={handleSave} />
    </div>
  );
}
