import { SiteHeader } from '../components/site-header';

const TELEGRAM_CONTACTS = [
  { label: 'Suporte pelo Telegram', handle: '@webtechsuporte', href: 'https://t.me/webtechsuporte' },
  { label: 'Canal de Usuários no Telegram', handle: '@webtechuser', href: 'https://t.me/webtechuser' },
];

const WHATSAPP_CONTACTS = [
  { label: 'WhatsApp', number: '+55 35 99761-5634', href: 'https://wa.me/5535997615634' },
];

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M21.9 3.6L2.7 11.1c-1.2.5-1.2 1.2-.2 1.5l4.9 1.5 1.9 5.8c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8L23.9 4.8c.3-1.2-.5-1.7-1.9-1.2zM8 13.9l9.3-5.9c.4-.3.8-.1.5.2l-7.6 6.9-.3 3.2-1.3-3.6z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z" />
      <path d="M12 2.1a9.9 9.9 0 00-8.5 15l-1.4 5 5.1-1.3a9.9 9.9 0 104.8-18.7zm0 18a8.1 8.1 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.1 8.1 0 1112 20.1z" />
    </svg>
  );
}

export default function ContatoPage() {
  return (
    <div className="min-h-screen bg-[#0b0a12] text-white">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/40 via-purple-950/60 to-[#0b0a12]" />
        <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Contate-nos</h1>
          <p className="text-gray-300 max-w-xl mx-auto">
            Entre em contato conosco para perguntas, suporte ou feedback. Estamos aqui para ajudar.
          </p>
        </div>
      </section>

      {/* Contatos */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
        <div>
          <p className="text-gray-300 mb-6">
            Se você tiver alguma dúvida ou precisar de ajuda, não hesite em entrar em contato conosco.
          </p>
          <div className="space-y-5">
            {TELEGRAM_CONTACTS.map((contact) => (
              <a
                key={contact.label}
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <span className="w-11 h-11 rounded-full bg-fuchsia-600 flex items-center justify-center shrink-0">
                  <TelegramIcon />
                </span>
                <span>
                  <span className="block font-semibold">{contact.label}</span>
                  <span className="block text-fuchsia-400 group-hover:underline">{contact.handle}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-gray-300 mb-6">Suporte via WhatsApp para usuários do Brasil</p>
          <div className="space-y-5">
            {WHATSAPP_CONTACTS.map((contact) => (
              <a
                key={contact.number}
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <span className="w-11 h-11 rounded-full bg-fuchsia-600 flex items-center justify-center shrink-0">
                  <WhatsAppIcon />
                </span>
                <span>
                  <span className="block font-semibold">{contact.label}</span>
                  <span className="block text-fuchsia-400 group-hover:underline">{contact.number}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
