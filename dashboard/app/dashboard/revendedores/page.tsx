'use client';

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/components/confirm-dialog';

type Revendedor = {
  id: number;
  name: string;
  email: string;
  credits: number;
  createdAt: string;
};

const emptyForm = { name: '', email: '', password: '', credits: '0' };

export default function RevendedoresPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const openModal = () => {
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/revendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, credits: Number(form.credits) || 0 }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Erro ao criar revendedor');
      return;
    }

    setForm(emptyForm);
    setShowModal(false);
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Revendedores</h2>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded font-semibold hover:bg-green-600 transition"
        >
          <span className="text-lg leading-none">+</span> Adicionar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Créditos</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Criado em</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {revendedores.map((r) => (
              <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-600">{r.name}</td>
                <td className="px-6 py-3 text-gray-600">{r.email}</td>
                <td className="px-6 py-3 text-gray-600">{r.credits}</td>
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

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#181829] p-6 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Novo revendedor</h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Nome"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[#0f0f1e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500"
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[#0f0f1e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500"
              />
              <input
                type="password"
                placeholder="Senha"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[#0f0f1e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500"
              />
              <div>
                <label className="block text-sm text-gray-400 mb-1">Créditos iniciais</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#0f0f1e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition"
                >
                  Criar revendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
