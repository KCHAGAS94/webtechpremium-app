'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '../components/site-header';

function formatMacAddress(value: string) {
  const hex = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

export default function PlaylistsPage() {
  const router = useRouter();
  const [macAddress, setMacAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/playlists/gerenciar?mac=${encodeURIComponent(macAddress)}`);
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
