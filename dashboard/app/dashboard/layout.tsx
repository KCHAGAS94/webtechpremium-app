'use client';

import React from 'react';

const menuItems = [
  { label: 'USUÁRIOS', icon: '👥' },
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
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-48 bg-gradient-to-b from-purple-900 to-purple-800 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-purple-700">
          <div className="text-2xl font-bold">webtech</div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          {menuItems.slice(0, -1).map((item) => (
            <button
              key={item.label}
              className="w-full text-left px-4 py-2 rounded hover:bg-purple-700 transition text-sm font-medium flex items-center gap-2"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
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
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">ULTRA PAINEL</h1>
            <p className="text-sm text-gray-500">Web Tech Premium</p>
          </div>
          <button className="bg-red-500 text-white px-4 py-2 rounded font-semibold hover:bg-red-600 transition">
            Logout
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
