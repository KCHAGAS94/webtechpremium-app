# 🏗️ Arquitetura do Sistema

## 📐 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Mobile)                         │
│                   React Native + Expo                        │
│  - Leitor M3U                                               │
│  - Autenticação                                             │
│  - MAC Address                                              │
└────────────────────────┬────────────────────────────────────┘
                         │ (HTTPS)
                         │
        ┌────────────────┴────────────────┐
        │    API RESTful (Next.js)        │
        │                                 │
        │  POST /api/auth/register        │
        │  POST /api/auth/login           │
        │  GET  /api/apps                 │
        │  POST /api/apps                 │
        │  PUT  /api/apps/:id             │
        │  DELETE /api/apps/:id           │
        └────────────────┬────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
    ┌───┴───────┐              ┌─────────┴────┐
    │ Prisma    │              │  Auth/JWT    │
    │ (ORM)     │              │              │
    └───┬───────┘              └──────────────┘
        │
        │ (PostgreSQL Protocol)
        │
    ┌───┴─────────────────┐
    │   PostgreSQL DB     │
    │                     │
    │  - users            │
    │  - apps             │
    │  - sessions         │
    │  - m3u_lists        │
    └─────────────────────┘
```

## 📁 Estrutura de Pastas

```
webtechpremium-app/
│
├── mobile/                    # React Native (Expo)
│   ├── app.json              # Config Expo
│   ├── App.tsx               # Componente principal
│   ├── package.json          # Dependências
│   ├── .env.example          # Variáveis de ambiente
│   └── eas.json              # Config Expo Application Services
│
├── dashboard/                 # Next.js
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── register/route.ts
│   │   │   └── apps/
│   │   │       └── route.ts
│   │   ├── lib/
│   │   │   ├── jwt.ts        # Utilitários JWT
│   │   │   └── prisma.ts     # Singleton Prisma
│   │   ├── components/       # Componentes React
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── layout.tsx        # Layout raiz
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Estilos globais
│   ├── prisma/
│   │   └── schema.prisma     # Schema do banco
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   └── .env.example
│
├── docs/
│   ├── SETUP.md              # Guia de instalação
│   ├── API.md                # Documentação API
│   └── ARCHITECTURE.md       # Este arquivo
│
└── README.md
```

## 🗄️ Modelo de Dados

### User
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String   (hash bcrypt)
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  apps      App[]    (relacionamento 1:N)
}
```

### App
```prisma
model App {
  id         Int     @id @default(autoincrement())
  name       String
  macAddress String  @unique  (identificador único do device)
  version    String
  status     String  ("active", "inactive", "suspended")
  userId     Int     (FK para User)
  
  sessions   Session[] (relacionamento 1:N)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
```

### Session
```prisma
model Session {
  id        Int     @id @default(autoincrement())
  token     String  @unique
  appId     Int     (FK para App)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### M3UList
```prisma
model M3UList {
  id       Int     @id @default(autoincrement())
  name     String
  url      String
  appId    Int     (FK para App)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 🔐 Fluxo de Autenticação

```
MOBILE APP                      DASHBOARD API              DATABASE
    │                                │                         │
    ├─ POST /auth/register          │                         │
    ├─────────────────────────────>│                         │
    │                                ├─ Hash password         │
    │                                ├─ Create user          │
    │                                ├────────────────────>│
    │                                │<────────────────────┤
    │    JWT Token                   │─ Sign JWT           │
    │<─────────────────────────────┤                         │
    │                                │                         │
    ├─ POST /api/apps              │                         │
    ├─ Auth: Bearer {token}        │                         │
    ├─────────────────────────────>│                         │
    │                                ├─ Verify JWT         │
    │                                ├─ Create app         │
    │                                ├────────────────────>│
    │                                │<────────────────────┤
    │   Success + app ID             │─ Return response    │
    │<─────────────────────────────┤                         │
```

## 🚀 Fluxo de Deployment

### Mobile (Play Store)

1. **Build APK/AAB**
   ```bash
   eas build --platform android
   ```

2. **Upload para Play Store**
   - Build produção
   - Sign com certificado
   - Submit para Play Store

3. **Atualizações**
   - OTA Updates com EAS Update
   - Ou novo build no Play Store

### Dashboard (VPS)

1. **Build**
   ```bash
   npm run build
   ```

2. **Deploy**
   - Copiar para servidor
   - Instalar dependências
   - Rodar migrations
   - Iniciar server

3. **Reverse Proxy** (Nginx/Apache)
   - Configure SSL/TLS
   - Aponte para localhost:3000

## 🔄 Fluxo de Dados - Leitor M3U

```
1. MOBILE APP REGISTRA
   └─ Envia MAC address ao dashboard
   
2. DASHBOARD GERENCIA
   └─ Adiciona/remove M3U lists
   └─ Controla status do app (ativo/suspenso)
   
3. MOBILE SINCRONIZA
   └─ Busca M3U lists ativos
   └─ Valida status
   └─ Renderiza conteúdo

4. MOBILE REPRODUZ
   └─ Processa M3U
   └─ Streams m3u8/mp4
   └─ Relata status ao dashboard
```

## 🛡️ Segurança

### Implementado
- ✅ JWT para autenticação stateless
- ✅ Hash bcrypt para senhas
- ✅ MAC address como identificador único
- ✅ Isolamento de dados por usuário
- ✅ Validação de input
- ✅ HTTPS (recomendado em produção)

### Recomendações Futuras
- 🔄 Rate limiting na API
- 🔄 CORS configurado
- 🔄 Refresh tokens (rotativos)
- 🔄 Logging de ações
- 🔄 Audit trail
- 🔄 Two-factor authentication

## 📊 Performance

### Otimizações Implementadas
- Singleton Prisma Client
- JWT sem estado (stateless)
- Índices no banco de dados
- Validação de input lado servidor

### Futuras Melhorias
- Cache Redis
- Pagination nas listagens
- Compression gzip
- CDN para assets estáticos
- Database replication

## 📞 Contato & Suporte

Para dúvidas sobre a arquitetura, consulte:
- [Setup Documentation](./SETUP.md)
- [API Documentation](./API.md)
- [Database Schema](./schema.prisma)
