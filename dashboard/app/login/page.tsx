'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { SiteHeader } from '../components/site-header';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Ex: revendedor clica "Fazer login" na aba de transferência da página
  // pública de gerenciamento — sem isso, ele voltaria sempre pro painel em
  // vez de continuar de onde parou.
  const returnTo = searchParams.get('returnTo');
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      // Só aceita caminho relativo local — evita open redirect via returnTo.
      const safeReturnTo = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null;
      router.push(safeReturnTo || '/dashboard/usuarios');
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
      <div className="min-h-screen bg-[#0b0a12]">
        <SiteHeader />
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="min-h-screen bg-[#0b0a12]">
        <SiteHeader />
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
          <div className="bg-[#151320] border border-white/10 rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">WebTech Premium</h1>
            <p className="text-sm text-red-400">
              Não foi possível conectar ao banco de dados. Verifique se o Postgres está acessível e tente novamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0a12]">
      <SiteHeader />
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 73px)' }}>
      <div className="bg-[#151320] border border-white/10 rounded-2xl shadow-xl w-full max-w-md p-10">
        <div className="flex flex-col items-center mb-8">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-fuchsia-500 mb-2" fill="currentColor">
            <path d="M6 3l14 9-14 9V3z" />
          </svg>
          <span className="font-bold text-lg text-white tracking-tight">WebTech Premium</span>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-8">
          {isFirstAccess ? 'Crie sua conta de administrador' : 'Faça login para gerenciar seus usuários'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isFirstAccess && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">E-mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Senha *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-3 pr-12 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.3A10.4 10.4 0 0112 5c6.5 0 10 7 10 7a13.2 13.2 0 01-3.1 4M6.6 6.6C4 8.3 2 12 2 12s3.5 7 10 7a10.4 10.4 0 004.6-1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!isFirstAccess && (
            <p className="text-sm text-gray-400">
              <span className="block">Criar uma nova conta?</span>
              <a
                href="https://wa.me/5535997615634"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fuchsia-400 hover:underline"
              >
                Entre em contato conosco <br />
                (WhatsApp: +55 35 99761-5634)
              </a>
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-white text-[#0b0a12] font-semibold py-3 hover:bg-gray-200 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Aguarde...' : isFirstAccess ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
