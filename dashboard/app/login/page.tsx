'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get('/api/auth/status')
      .then((res) => setIsFirstAccess(!res.data.hasUsers))
      .catch(() => setStatusError(true))
      .finally(() => setCheckingStatus(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const endpoint = isFirstAccess ? '/api/auth/register' : '/api/auth/login';
      await axios.post(endpoint, { email, password, name });
      router.push('/dashboard/usuarios');
      router.refresh();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error
        : null;
      setError(message || 'Não foi possível continuar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <p className="text-blue-100">Carregando...</p>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-blue-900 mb-2">WebTech Premium</h1>
          <p className="text-sm text-red-600">
            Não foi possível conectar ao banco de dados. Verifique se o Postgres está acessível e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-center text-blue-900 mb-1">WebTech Premium</h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          {isFirstAccess ? 'Primeiro acesso: crie sua conta de administrador' : 'Entre com sua conta'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFirstAccess && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition"
          >
            {submitting ? 'Aguarde...' : isFirstAccess ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
