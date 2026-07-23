'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const menuItems = [
  { label: 'USUÁRIOS', icon: '👥', href: '/dashboard/usuarios' },
  { label: 'SERVIDORES', icon: '🖥️', href: '/dashboard/servidores' },
  { label: 'BANNERS', icon: '📋' },
  { label: 'BACKGROUND', icon: '🖼️' },
  { label: 'LOGO', icon: '🏠' },
  { label: 'TEMAS', icon: '🎨' },
  { label: 'CHATBOT', icon: '🤖' },
  { label: 'PERFIL', icon: '⚙️' },
  { label: 'COR DO PAINEL', icon: '🎭' },
  { label: 'SUPORTE', icon: '💬' },
  { label: 'SAIR', icon: '🚪' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile overlay behind the drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-purple-900 to-purple-800 text-white flex flex-col transform transition-transform duration-200 ease-in-out
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:w-48`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-purple-700 flex items-center justify-between">
          <div className="text-2xl font-bold">webtech</div>
          <button
            className="md:hidden text-white text-2xl leading-none"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          {menuItems.slice(0, -1).map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="w-full text-left px-4 py-2 rounded hover:bg-purple-700 transition text-sm font-medium flex items-center gap-2"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                className="w-full text-left px-4 py-2 rounded hover:bg-purple-700 transition text-sm font-medium flex items-center gap-2"
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            )
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-purple-700">
          <button className="w-full text-left px-4 py-2 rounded hover:bg-red-600 transition text-sm font-medium flex items-center gap-2">
            <span>🚪</span>
            SAIR
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 bg-white shadow px-4 py-3">
          <button
            className="text-2xl leading-none text-gray-700"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <div className="text-lg font-bold text-purple-900">webtech</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
