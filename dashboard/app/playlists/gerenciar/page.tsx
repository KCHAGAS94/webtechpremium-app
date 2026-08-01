'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '../../components/site-header';

type Playlist = {
  id: string;
  nome: string;
  url: string;
  tipo: 'M3U' | 'XC';
  protegido: boolean;
};

const SIDEBAR_ITEMS = [
  {
    key: 'gerenciamento',
    label: 'Gerenciamento de\nPlaylist',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <rect x="3" y="10" width="18" height="4" rx="1" />
        <rect x="3" y="16" width="18" height="4" rx="1" />
      </svg>
    ),
  },
  {
    key: 'ativar',
    label: 'Ativar Dispositivo',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    ),
  },
  {
    key: 'transferir',
    label: 'Transferir ativação',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-4M20 15a8 8 0 01-14 4" />
      </svg>
    ),
  },
];

function GerenciarPlaylistsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mac = searchParams.get('mac') || '52:91:FA:0D:91:95';

  const [activeTab, setActiveTab] = useState<'m3u' | 'xc'>('m3u');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const [m3uNome, setM3uNome] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');

  const [xcNome, setXcNome] = useState('');
  const [xcServidor, setXcServidor] = useState('');
  const [xcUsuario, setXcUsuario] = useState('');
  const [xcSenha, setXcSenha] = useState('');

  const handleAddM3u = (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3uNome || !m3uUrl) return;
    setPlaylists((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: m3uNome, url: m3uUrl, tipo: 'M3U', protegido: false },
    ]);
    setM3uNome('');
    setM3uUrl('');
  };

  const handleAddXc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!xcNome || !xcServidor || !xcUsuario || !xcSenha) return;
    setPlaylists((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: xcNome,
        url: `${xcServidor} · ${xcUsuario}`,
        tipo: 'XC',
        protegido: true,
      },
    ]);
    setXcNome('');
    setXcServidor('');
    setXcUsuario('');
    setXcSenha('');
  };

  const handleRemove = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0b0a12] text-white">
      <SiteHeader />

      {/* Hero com dados do dispositivo */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/40 via-purple-950/60 to-[#0b0a12]" />
        <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-10">Gerenciar suas playlists</h1>

          <div className="inline-block rounded-xl bg-black/40 border border-white/10 px-8 py-6">
            <dl className="space-y-2 text-sm">
              <div className="flex gap-6">
                <dt className="font-semibold w-32">Endereço MAC :</dt>
                <dd className="text-gray-300">{mac}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="font-semibold w-32">Status :</dt>
                <dd className="text-gray-300">Teste</dd>
              </div>
              <div className="flex gap-6">
                <dt className="font-semibold w-32">Expiração :</dt>
                <dd className="text-gray-300">2026-08-31</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Gerenciamento */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-3">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-left whitespace-pre-line transition-colors ${
                  item.key === 'gerenciamento'
                    ? 'bg-fuchsia-700/40 border border-fuchsia-500/60 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-left bg-teal-700/40 border border-teal-500/50 text-white hover:bg-teal-700/60 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sair
            </button>
          </aside>

          {/* Conteúdo */}
          <div>
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setActiveTab('m3u')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  activeTab === 'm3u'
                    ? 'bg-white text-[#0b0a12] border-white'
                    : 'border-white/20 text-gray-200 hover:bg-white/5'
                }`}
              >
                Adicionar Playlist
              </button>
              <button
                onClick={() => setActiveTab('xc')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  activeTab === 'xc'
                    ? 'bg-white text-[#0b0a12] border-white'
                    : 'border-white/20 text-gray-200 hover:bg-white/5'
                }`}
              >
                Adicionar Playlist XC
              </button>
            </div>

            {activeTab === 'm3u' ? (
              <form
                onSubmit={handleAddM3u}
                className="mb-8 rounded-xl bg-white/5 border border-white/10 p-6 grid sm:grid-cols-2 gap-4"
              >
                <input
                  type="text"
                  placeholder="Nome da playlist"
                  value={m3uNome}
                  onChange={(e) => setM3uNome(e.target.value)}
                  className="rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-2.5 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <input
                  type="url"
                  placeholder="URL M3U"
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                  className="rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-2.5 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 transition-colors font-semibold py-2.5"
                >
                  Adicionar
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleAddXc}
                className="mb-8 rounded-xl bg-white/5 border border-white/10 p-6 grid sm:grid-cols-2 gap-4"
              >
                <input
                  type="text"
                  placeholder="Nome da playlist"
                  value={xcNome}
                  onChange={(e) => setXcNome(e.target.value)}
                  className="rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-2.5 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <input
                  type="text"
                  placeholder="Servidor (host:porta)"
                  value={xcServidor}
                  onChange={(e) => setXcServidor(e.target.value)}
                  className="rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-2.5 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <input
                  type="text"
                  placeholder="Usuário"
                  value={xcUsuario}
                  onChange={(e) => setXcUsuario(e.target.value)}
                  className="rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-2.5 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={xcSenha}
                  onChange={(e) => setXcSenha(e.target.value)}
                  className="rounded-lg bg-[#1e3a5f] border border-white/10 px-4 py-2.5 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 transition-colors font-semibold py-2.5"
                >
                  Adicionar
                </button>
              </form>
            )}

            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <h2 className="text-lg font-semibold px-6 py-4 border-b border-white/10">Playlists Adicionadas</h2>

              {playlists.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-gray-400">
                  Nenhuma playlist adicionada ainda.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/10">
                      <th className="px-6 py-3 font-medium">Nome</th>
                      <th className="px-6 py-3 font-medium">URL</th>
                      <th className="px-6 py-3 font-medium">Tipo</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {playlists.map((playlist) => (
                      <tr key={playlist.id} className="border-b border-white/5 last:border-0">
                        <td className="px-6 py-4 font-medium">{playlist.nome}</td>
                        <td className="px-6 py-4 text-gray-300 max-w-xs truncate">
                          {playlist.protegido ? (
                            <span className="inline-block rounded border border-orange-500/60 text-orange-400 text-xs font-semibold px-2 py-0.5">
                              Protegido
                            </span>
                          ) : (
                            playlist.url
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block rounded bg-emerald-600/20 text-emerald-400 text-xs font-semibold px-2 py-0.5">
                            {playlist.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            <button className="flex items-center gap-1 rounded-lg border border-sky-500/50 text-sky-400 text-xs font-semibold px-3 py-1.5 hover:bg-sky-500/10">
                              Editar
                            </button>
                            <button
                              onClick={() => handleRemove(playlist.id)}
                              className="flex items-center gap-1 rounded-lg border border-red-500/50 text-red-400 text-xs font-semibold px-3 py-1.5 hover:bg-red-500/10"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function GerenciarPlaylistsPage() {
  return (
    <Suspense fallback={null}>
      <GerenciarPlaylistsContent />
    </Suspense>
  );
}
