'use client';

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/components/confirm-dialog';

type Revendedor = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

export default function RevendedoresPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const confirm = useConfirm();

  const loadMe = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setAllowed(data.user?.role === 'ADMIN');
  };

  const loadRevendedores = async () => {
    const res = await fetch('/api/revendedores');
    if (!res.ok) return;
    const data = await res.json();
    setRevendedores(data.revendedores ?? []);
  };

  useEffect(() => {
    loadMe();
    loadRevendedores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/revendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Erro ao criar revendedor');
      return;
    }

    setForm({ name: '', email: '', password: '' });
    await loadRevendedores();
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('Remover este revendedor?', { confirmLabel: 'Remover', danger: true }))) return;
    await fetch(`/api/revendedores?id=${id}`, { method: 'DELETE' });
    await loadRevendedores();
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
      <h2 className="text-2xl font-bold text-white">Revendedores</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded"
        />
        <input
          type="password"
          placeholder="Senha"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600 transition"
        >
          Criar revendedor
        </button>
      </form>

      {error && <p className="text-red-400">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Criado em</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {revendedores.map((r) => (
              <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-600">{r.name}</td>
                <td className="px-6 py-3 text-gray-600">{r.email}</td>
                <td className="px-6 py-3 text-gray-600">
                  {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-3 text-center">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-500 hover:text-red-700 text-lg"
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
  );
}
