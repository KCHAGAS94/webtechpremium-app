'use client';

import { useState } from 'react';

function formatMacAddress(value: string) {
  const hex = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

export function TransferActivationCard() {
  const [novoMac, setNovoMac] = useState('');

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-8 max-w-xl">
      <h2 className="text-xl font-bold mb-6">Transferir ativação para outro dispositivo</h2>

      <label htmlFor="novoMac" className="sr-only">
        Novo endereço MAC
      </label>
      <input
        id="novoMac"
        type="text"
        required
        placeholder="Novo endereço MAC *"
        value={novoMac}
        onChange={(e) => setNovoMac(formatMacAddress(e.target.value))}
        maxLength={17}
        className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 mb-6"
      />

      <div className="flex gap-3 rounded-xl bg-yellow-900/20 border border-yellow-600/30 p-4 mb-6">
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
          <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-yellow-500/90 leading-relaxed">
          Para transferir sua assinatura para outro endereço MAC, entre em contato com nossa equipe de
          suporte.
        </p>
      </div>

      <div className="flex justify-end gap-6">
        <button type="button" className="text-sm font-semibold text-gray-300 hover:text-white">
          Cancelar
        </button>
        <button
          type="button"
          className="rounded-lg bg-white text-[#0b0a12] font-semibold px-6 py-2.5 hover:bg-gray-200 transition-colors"
        >
          Entrar em contato com o suporte
        </button>
      </div>
    </div>
  );
}
