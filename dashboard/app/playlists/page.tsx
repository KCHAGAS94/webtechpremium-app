'use client';

import { useState } from 'react';
import { SiteHeader } from '../components/site-header';

function formatMacAddress(value: string) {
  const hex = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

export default function PlaylistsPage() {
  const [macAddress, setMacAddress] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-[#0b0a12] text-white">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-10">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-10">
            Ative seu dispositivo e
            <br />
            gerencie suas playlists
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="mac" className="block text-sm text-gray-400 mb-2">
                Endereço MAC *
              </label>
              <input
                id="mac"
                type="text"
                required
                placeholder="00:00:00:00:00:00"
                value={macAddress}
                onChange={(e) => setMacAddress(formatMacAddress(e.target.value))}
                maxLength={17}
                className="w-full rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-3 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
            </div>

            <div>
              <label htmlFor="deviceKey" className="block text-sm text-gray-400 mb-2">
                Chave do dispositivo *
              </label>
              <div className="relative">
                <input
                  id="deviceKey"
                  type={showKey ? 'text' : 'password'}
                  required
                  placeholder="Digite a chave do dispositivo"
                  value={deviceKey}
                  onChange={(e) => setDeviceKey(e.target.value)}
                  className="w-full rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-3 pr-12 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                >
                  {showKey ? (
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

            <button
              type="submit"
              className="w-full rounded-lg bg-white text-[#0b0a12] font-semibold py-3 hover:bg-gray-200 transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
