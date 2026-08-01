'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '../../components/site-header';
import { ActivateDeviceCard } from './activate-device-card';
import { TransferActivationCard } from './transfer-activation-card';

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

  const [activeSection, setActiveSection] = useState<'gerenciamento' | 'ativar' | 'transferir'>('gerenciamento');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [modalType, setModalType] = useState<'m3u' | 'xc' | null>(null);

  const [nome, setNome] = useState('');
  const [url, setUrl] = useState('');
  const [servidor, setServidor] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [protegerComPin, setProtegerComPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [pinError, setPinError] = useState('');

  const closeModal = () => {
    setModalType(null);
    setNome('');
    setUrl('');
    setServidor('');
    setUsuario('');
    setSenha('');
    setProtegerComPin(false);
    setPin('');
    setConfirmarPin('');
    setPinError('');
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();

    if (protegerComPin) {
      if (pin.length < 4) {
        setPinError('O PIN deve ter pelo menos 4 dígitos');
        return;
      }
      if (pin !== confirmarPin) {
        setPinError('Os PINs não coincidem');
        return;
      }
    }

    if (modalType === 'm3u') {
      if (!nome || !url) return;
      setPlaylists((prev) => [
        ...prev,
        { id: crypto.randomUUID(), nome, url, tipo: 'M3U', protegido: protegerComPin },
      ]);
    } else if (modalType === 'xc') {
      if (!nome || !servidor || !usuario || !senha) return;
      setPlaylists((prev) => [
        ...prev,
        { id: crypto.randomUUID(), nome, url: `${servidor} · ${usuario}`, tipo: 'XC', protegido: true },
      ]);
    }

    closeModal();
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-10">
            {activeSection === 'ativar' ? 'Ative seu dispositivo' : 'Gerenciar suas playlists'}
          </h1>

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
                onClick={() => setActiveSection(item.key as typeof activeSection)}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-left whitespace-pre-line transition-colors ${
                  activeSection === item.key
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
            {activeSection === 'ativar' ? (
              <ActivateDeviceCard />
            ) : activeSection === 'gerenciamento' ? (
              <>
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => setModalType('m3u')}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/20 text-gray-200 hover:bg-white/5 transition-colors"
                  >
                    Adicionar Playlist
                  </button>
                  <button
                    onClick={() => setModalType('xc')}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/20 text-gray-200 hover:bg-white/5 transition-colors"
                  >
                    Adicionar Playlist XC
                  </button>
                </div>

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
              </>
            ) : (
              <TransferActivationCard />
            )}
          </div>
        </div>
      </section>

      {modalType && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#151320] border border-white/10 p-8">
            <h2 className="text-xl font-bold mb-6">Gerenciar Playlist</h2>

            <form onSubmit={handleSubmitModal} className="space-y-4">
              <input
                type="text"
                placeholder="Nome da Playlist *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />

              {modalType === 'm3u' ? (
                <input
                  type="url"
                  placeholder="URL da Playlist *"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Servidor (host:porta) *"
                    value={servidor}
                    onChange={(e) => setServidor(e.target.value)}
                    required
                    className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                  <input
                    type="text"
                    placeholder="Usuário *"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    required
                    className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                  <input
                    type="password"
                    placeholder="Senha *"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </>
              )}

              <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={protegerComPin}
                  onChange={(e) => {
                    setProtegerComPin(e.target.checked);
                    setPinError('');
                  }}
                  className="w-4 h-4 rounded border-white/30 bg-transparent accent-fuchsia-600"
                />
                Proteja sua playlist com um PIN
              </label>

              {protegerComPin && (
                <>
                  <div className="flex gap-3 rounded-xl bg-yellow-900/20 border border-yellow-600/30 p-4">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
                      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm text-yellow-500/90 leading-relaxed">
                      Defina um PIN para proteger suas playlists contra acessos e alterações não autorizadas.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="password"
                      placeholder="PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      maxLength={8}
                      className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                    <input
                      type="password"
                      placeholder="Confirmar PIN"
                      value={confirmarPin}
                      onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      maxLength={8}
                      className="w-full rounded-lg bg-transparent border border-white/20 px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>

                  {pinError && <p className="text-sm text-red-400">{pinError}</p>}
                </>
              )}

              <div className="flex justify-end gap-6 pt-2">
                <button type="button" onClick={closeModal} className="text-sm font-semibold text-gray-300 hover:text-white">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-white text-[#0b0a12] font-semibold px-6 py-2.5 hover:bg-gray-200 transition-colors"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
