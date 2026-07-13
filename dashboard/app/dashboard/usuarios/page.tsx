'use client';

import React, { useEffect, useState } from 'react';

type User = {
  id: number;
  name: string;
  mac: string;
  usuario: string;
  password: string;
  expiracaoData: string;
  m3u: string;
  dns: string;
  expirado: boolean;
};

const mockUsers: User[] = [];

// Formats free-typed input into AA:BB:CC:DD:EE:FF as the user types: strips
// anything but hex chars, uppercases, and inserts ':' every 2 characters.
function formatMacAddress(value: string): string {
  const hex = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

function EditModal({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (user: User) => void }) {
  const [formData, setFormData] = useState<User>(
    user || ({} as User)
  );

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'mac' ? formatMacAddress(value) : value });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[70%] h-screen flex flex-col rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Atualizar Usuário</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                👤 Edição de Usuário
              </label>
              <div className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Endereço MAC, Lista M3U e Acesso</p>
              </div>
            </div>

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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lista M3U</label>
              <input
                type="text"
                name="m3u"
                value={formData.m3u}
                onChange={handleChange}
                placeholder="Digite o link M3U"
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">DNS</label>
              <input
                type="text"
                name="dns"
                value={formData.dns}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Validade</label>
              <input
                type="date"
                name="expiracaoData"
                value={formData.expiracaoData}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
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
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/painel/devices');
        const data = await response.json();
        setUsers(data.devices ?? []);
      } catch (error) {
        console.error('Falha ao carregar dispositivos do painel', error);
      }
    })();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      (user.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.mac ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.usuario ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (user: User) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    setUsers(users.filter((u) => u.id !== user.id));
    try {
      await fetch(`/api/painel/devices?mac=${encodeURIComponent(user.mac)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Falha ao remover dispositivo do painel', error);
    }
  };

  const handleAddClick = () => {
    setEditingUser({
      id: Date.now(),
      name: '',
      mac: '',
      usuario: '',
      password: '',
      expiracaoData: '',
      m3u: '',
      dns: '',
      expirado: false,
    } as User);
    setIsAdding(true);
  };

  const handleSave = async (updatedUser: User) => {
    try {
      const response = await fetch('/api/painel/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac: updatedUser.mac,
          name: updatedUser.name,
          m3u: updatedUser.m3u,
          usuario: updatedUser.usuario,
          password: updatedUser.password,
          dns: updatedUser.dns,
          expiracaoData: updatedUser.expiracaoData,
          expirado: updatedUser.expirado,
        }),
      });
      const { app } = await response.json();

      const savedUser: User = app ? { ...updatedUser, id: app.id } : updatedUser;
      if (isAdding) {
        setUsers([...users, savedUser]);
      } else {
        setUsers(users.map((user) => (user.id === updatedUser.id ? savedUser : user)));
      }
    } catch (error) {
      console.error('Falha ao salvar dispositivo no painel', error);
    }

    setEditingUser(null);
    setIsAdding(false);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setIsAdding(false);
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
            placeholder="Pesquisar Mac / Nome / Usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 outline-none"
          />
        </div>
        <button className="bg-red-500 text-white px-6 py-2 rounded font-semibold hover:bg-red-600 transition">
          🗑️ Remover Expirados
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Endereço MAC</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Usuário</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Data de Expiração</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Expirado?</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">DNS</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-600">{user.name}</td>
                <td className="px-6 py-3 text-gray-600 font-mono text-xs">{user.mac}</td>
                <td className="px-6 py-3 text-gray-600">{user.usuario}</td>
                <td className="px-6 py-3 text-gray-600">{user.expiracaoData}</td>
                <td className="px-6 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    Não
                  </span>
                </td>
                <td className="px-6 py-3">
                  {user.dns ? (
                    <a href={user.dns} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline text-xs truncate">
                      {user.dns.substring(0, 50)}...
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-6 py-3 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setIsAdding(false);
                    }}
                    className="text-blue-500 hover:text-blue-700 font-semibold text-xl"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
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
        Mostrando {filteredUsers.length} de {users.length} usuários
      </div>

      {/* Edit/Add Modal */}
      <EditModal
        user={editingUser}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}
