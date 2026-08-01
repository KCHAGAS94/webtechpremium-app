'use client';

import Link from 'next/link';
import { SiteHeader } from './components/site-header';

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Streaming Rápido',
    description:
      'Experimente streaming ultra rápido com mínimo de buffering para entretenimento sem interrupções',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path strokeLinecap="round" d="M8 20h8M12 16v4" />
      </svg>
    ),
    title: 'Compatibilidade com Dispositivos',
    description:
      'Faça streaming sem problemas em todos os seus dispositivos, incluindo smartphones, tablets, smart TVs e mais',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M9.5 9.5c0-1.5 3-2.2 3.5-.5.4 1.3-1.5 1.5-1.5 3.2M12 16h.01" />
      </svg>
    ),
    title: 'Preços Acessíveis',
    description:
      'Obtenha desempenho de nível superior a um custo menor com nosso plano de ativação econômico, projetado para lhe dar mais valor por menos',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: 'Interface Simples',
    description:
      'Navegue sem esforço com nossa interface de usuário amigável, projetada para uma experiência suave e intuitiva',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
      </svg>
    ),
    title: 'Multilíngue',
    description:
      'Acesse conteúdo no seu idioma preferido com suporte para vários idiomas, facilitando para todos aproveitarem',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.97.76l1 4a1 1 0 01-.29 1L7.5 10.5a11 11 0 006 6l1.74-1.46a1 1 0 011-.29l4 1a1 1 0 01.76.97V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z" />
      </svg>
    ),
    title: 'Suporte 24/7',
    description:
      'Desfrute de assistência a qualquer hora com nossa equipe de suporte dedicada, disponível a qualquer momento para ajudar com suas necessidades',
  },
];

const DOWNLOAD_LINKS = [
  { label: 'Google Play', store: 'GET IT ON', name: 'Google Play' },
  { label: 'App Store', store: 'Download on the', name: 'App Store' },
  { label: 'LG', store: '', name: 'LG' },
  { label: 'Samsung Smart TV', store: 'Samsung', name: 'SMART TV' },
  { label: 'Roku TV', store: 'Download on the', name: 'Roku TV' },
  { label: 'Windows Store', store: 'Download from', name: 'Windows Store' },
  { label: 'VIDAA', store: '', name: 'VIDAA' },
  { label: 'Zeasn / uhale', store: '', name: 'ZEASN uhale' },
];

const STEPS = [
  {
    title: 'Cadastre-se gratuitamente',
    description: 'Basta instalar para diferentes plataformas aqui',
  },
  {
    title: 'Adicione suas playlists',
    description: 'Adicione suas playlists m3u e xc aqui',
  },
  {
    title: 'Ative seu dispositivo',
    description: 'Ative seu dispositivo via compra dentro do aplicativo',
  },
  {
    title: 'Pronto!',
    description: 'É isso',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0a12] text-white">
      <SiteHeader />

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-[#0b0a12] to-[#0b0a12]" />
        <div className="absolute -top-32 right-0 w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">WebTech Premium</h1>
            <p className="text-lg text-gray-300 mb-8 max-w-xl">
              Desfrute de streaming sem interrupções com o WebTech Premium — um poderoso reprodutor IPTV
              projetado para visualização de alta qualidade em todas as plataformas.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#download"
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 transition-colors font-semibold"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Baixar agora
              </a>
              <a
                href="#como-usar"
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-fuchsia-500/60 hover:bg-white/5 transition-colors font-semibold text-fuchsia-300"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fillOpacity="0" stroke="currentColor" strokeWidth="2" />
                  <path d="M10 8l6 4-6 4V8z" />
                </svg>
                Ver tutorial
              </a>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#15121f] shadow-2xl p-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-1">
                <span>Favorite Channels</span>
                <span>11:15 PM</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="col-span-2 row-span-2 rounded-lg bg-gradient-to-br from-purple-700 to-fuchsia-700 h-24" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-white/10 h-11" />
                ))}
              </div>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {['Live TV', 'Movies', 'Series', 'Catch up', 'Search', 'Change'].map((label) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-[10px] text-gray-300">
                    <div className="w-9 h-9 rounded-full bg-fuchsia-600/20 flex items-center justify-center text-fuchsia-400">
                      •
                    </div>
                    {label}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 mb-2 px-1">Last Added Movies</div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-md bg-white/10 h-14" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-5xl mx-auto px-6 -mt-4 mb-16">
        <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center text-sm md:text-base text-gray-300">
          Não vendemos, fornecemos ou distribuímos qualquer conteúdo, streams ou canais, sejam eles legais
          ou ilegais, incluindo filmes ou séries. Recomendamos fortemente que os utilizadores usem as suas
          próprias listas de reprodução obtidas legalmente ou criem as suas próprias listas de conteúdo. O
          uso de conteúdo não autorizado ou ilegal é estritamente proibido.
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Por que escolher o WebTech Premium</h2>
        <p className="text-center text-gray-400 max-w-2xl mx-auto mb-12">
          Experimente streaming contínuo com desempenho incomparável, compatibilidade com dispositivos e
          suporte 24/7 - tudo a um preço acessível
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl bg-white/5 border border-white/10 p-6">
              <div className="w-11 h-11 rounded-full bg-fuchsia-600/90 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Download */}
      <section id="download" className="max-w-5xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Baixe o WebTech Premium</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-10">
          Experimente streaming contínuo com o WebTech Premium — seu destino final para baixar e aproveitar
          vídeos de alta qualidade
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {DOWNLOAD_LINKS.map((item) => (
            <button
              key={item.name}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-white/10 bg-black/40 py-4 px-3 hover:bg-white/5 transition-colors"
            >
              {item.store && <span className="text-[10px] text-gray-400 uppercase tracking-wide">{item.store}</span>}
              <span className="font-semibold text-sm">{item.name}</span>
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-3">
          Baixe o arquivo apk para Android, Fire TV (o código do AFT downloader é 327187)
        </p>
        <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-6 py-3 mb-8 hover:bg-white/5 transition-colors font-semibold text-sm">
          Download Android APK
        </button>

        <p className="text-sm text-gray-400 mb-3">Baixe o arquivo exe para Windows Desktop</p>
        <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-6 py-3 hover:bg-white/5 transition-colors font-semibold text-sm">
          Download .exe File
        </button>
      </section>

      {/* How to use */}
      <section id="como-usar" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Como usar o nosso WebTech Premium?</h2>
        <p className="text-center text-gray-400 max-w-2xl mx-auto mb-12">
          O WebTech Premium tem um fluxo de trabalho simples para usar e ativar, é só aproveitar!
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-fuchsia-600/20 flex items-center justify-center text-fuchsia-400 font-bold text-xl">
                {i + 1}
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-fuchsia-500" fill="currentColor">
                <path d="M6 3l14 9-14 9V3z" />
              </svg>
              <span className="font-bold text-lg">WebTech Premium</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              O WebTech Premium oferece uma experiência de streaming fluida e de alto desempenho através de um
              reprodutor IPTV rápido e confiável. Projetado com uma interface moderna e intuitiva, garante
              uma navegação suave e uma experiência de visualização agradável em todos os dispositivos. Com
              suporte robusto a múltiplas plataformas, você pode acessar seus streams a qualquer hora e em
              qualquer lugar. Observe que o WebTech Premium é apenas um reprodutor IPTV e não fornece nem
              inclui conteúdo.
            </p>
          </div>

          <div>
            <h4 className="text-fuchsia-400 font-semibold mb-4">LINKS RÁPIDOS</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li><Link href="/contato" className="hover:text-fuchsia-400">Entre em contato</Link></li>
              <li><a href="#faqs" className="hover:text-fuchsia-400">FAQs</a></li>
              <li><Link href="/playlists" className="hover:text-fuchsia-400">Gerenciar Playlists</Link></li>
              <li><a href="#ativar" className="hover:text-fuchsia-400">Ativar</a></li>
              <li><Link href="/login" className="hover:text-fuchsia-400">Login de revendedor</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-fuchsia-400 font-semibold mb-4">LEGAL</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li><a href="/politica-de-privacidade.html" className="hover:text-fuchsia-400">Termos e Condições</a></li>
              <li><a href="/politica-de-privacidade.html" className="hover:text-fuchsia-400">Política de Privacidade</a></li>
              <li><a href="#refund" className="hover:text-fuchsia-400">Refund Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-8 text-sm text-gray-500">
          © 2026. All rights reserved by WebTech Premium LLC
        </div>
      </footer>
    </div>
  );
}
