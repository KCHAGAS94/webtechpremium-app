'use client';

import React, { useEffect, useState } from 'react';

export default function ConfiguracoesPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState<'ADMIN' | 'REVENDA' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMe = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      setForm({ name: data.user.name, email: data.user.email, password: '' });
      setRole(data.user.role);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Erro ao salvar');
      return;
    }

    setForm((f) => ({ ...f, password: '' }));
    setSuccess('Dados atualizados com sucesso');
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-2xl font-bold text-white">Configurações</h2>

      {role && (
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            role === 'ADMIN'
              ? 'bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/60'
              : 'bg-sky-600/30 text-sky-300 border border-sky-500/60'
          }`}
        >
          {role === 'ADMIN' ? 'Administrador' : 'Revendedor'}
        </span>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nova senha (deixe em branco para manter a atual)
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600 transition"
        >
          Salvar
        </button>
      </form>

      {error && <p className="text-red-400">{error}</p>}
      {success && <p className="text-green-400">{success}</p>}
    </div>
  );
}
