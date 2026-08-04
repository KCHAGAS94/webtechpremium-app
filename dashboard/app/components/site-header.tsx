'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Início', href: '/#inicio' },
  { label: 'Gerenciar Playlists', href: '/playlists' },
  { label: 'Entre em Contato', href: '/contato' },
];

export function SiteHeader() {
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Fragment>
    <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b0a12]/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="hidden md:flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-fuchsia-500" fill="currentColor">
            <path d="M6 3l14 9-14 9V3z" />
          </svg>
          <span className="font-bold text-lg tracking-tight text-white">WebTech Premium</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-200">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="hover:text-fuchsia-400 transition-colors">
              {link.label}
            </a>
          ))}
          <Link href="/login" className="hover:text-fuchsia-400 transition-colors">
            Torne-se Revendedor
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-fuchsia-500/60 text-sm text-white"
            >
              Português
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded-lg bg-[#15121f] border border-white/10 py-1 text-sm text-white">
                <button className="w-full text-left px-3 py-2 hover:bg-white/5">Português</button>
                <button className="w-full text-left px-3 py-2 hover:bg-white/5">English</button>
              </div>
            )}
          </div>
          <button aria-label="Configurações" className="p-2 rounded-lg hover:bg-white/5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-fuchsia-950 via-[#151320] to-[#0b0a12] text-white flex flex-col transform transition-transform duration-200 ease-in-out border-r border-white/10 md:hidden
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-fuchsia-500">webtech</div>
            <button
              aria-label="Configurações"
              className="text-gray-300 hover:text-white transition text-lg leading-none"
            >
              ⚙️
            </button>
          </div>
          <button
            className="text-white text-2xl leading-none"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-4 py-2 rounded hover:bg-fuchsia-700/40 hover:border hover:border-fuchsia-500/60 border border-transparent transition text-sm font-medium flex items-center gap-2 text-gray-200 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="w-full text-left px-4 py-2 rounded hover:bg-fuchsia-700/40 hover:border hover:border-fuchsia-500/60 border border-transparent transition text-sm font-medium flex items-center gap-2 text-gray-200 hover:text-white"
          >
            Torne-se Revendedor
          </Link>
        </nav>
      </aside>
    </Fragment>
  );
}
