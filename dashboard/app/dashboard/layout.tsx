'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const baseMenuItems = [
  { label: 'USUÁRIOS', icon: '👥', href: '/dashboard/usuarios' },
  { label: 'ATIVAÇÃO APP', icon: '📱', href: '/dashboard/ativacao-app' },
  { label: 'TRANSFERÊNCIAS', icon: '🔁', href: '/dashboard/transferencias' },
  { label: 'SERVIDORES', icon: '🖥️', href: '/dashboard/servidores' },
  { label: 'CRÉDITO', icon: '💳', href: '/dashboard/creditos' },
];

const adminMenuItems = [
  { label: 'REVENDEDORES', icon: '🧑‍💼', href: '/dashboard/revendedores' },
  { label: 'MACS POR REVENDEDOR', icon: '📋', href: '/dashboard/macs-revendedores' },
  { label: 'CADASTROS', icon: '🗂️', href: '/dashboard/cadastros' },
  { label: 'INSTALADOS', icon: '📲', href: '/dashboard/instalados' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<{ name: string; credits: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    axios
      .get('/api/auth/me')
      .then((res) => {
        setIsAdmin(res.data.user?.role === 'ADMIN');
        setMe(res.data.user ? { name: res.data.user.name, credits: res.data.user.credits } : null);
      })
      .catch(() => {
        setIsAdmin(false);
        setMe(null);
      });
  }, []);

  const menuItems = [...baseMenuItems, ...(isAdmin ? adminMenuItems : [])];

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-[#0b0a12] overflow-hidden">
      {/* Mobile overlay behind the drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-fuchsia-950 via-[#151320] to-[#0b0a12] text-white flex flex-col transform transition-transform duration-200 ease-in-out border-r border-white/10
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:w-48`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-fuchsia-500">webtech</div>
            <Link
              href="/dashboard/configuracoes"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-white transition text-lg leading-none"
              aria-label="Configurações"
              title="Configurações"
            >
              ⚙️
            </Link>
          </div>
          <button
            className="md:hidden text-white text-2xl leading-none"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        {/* Revendedor logado + créditos */}
        {me && (
          <div className="px-4 py-3 border-b border-white/10 space-y-1">
            <div className="text-sm font-medium text-gray-200 truncate">{me.name}</div>
            <div className="text-xs text-fuchsia-400 flex items-center gap-1">
              💳 {me.credits} créditos
            </div>
          </div>
        )}

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          {menuItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="w-full text-left px-4 py-2 rounded hover:bg-fuchsia-700/40 hover:border hover:border-fuchsia-500/60 border border-transparent transition text-sm font-medium flex items-center gap-2 text-gray-200 hover:text-white"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                className="w-full text-left px-4 py-2 rounded hover:bg-fuchsia-700/40 hover:border hover:border-fuchsia-500/60 border border-transparent transition text-sm font-medium flex items-center gap-2 text-gray-200 hover:text-white"
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            )
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 rounded hover:bg-red-600/80 transition text-sm font-medium flex items-center gap-2 text-gray-200 hover:text-white"
          >
            <span>🚪</span>
            SAIR
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 bg-[#0b0a12] border-b border-white/10 px-4 py-3">
          <button
            className="text-2xl leading-none text-white"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <div className="text-lg font-bold text-fuchsia-500">webtech</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
