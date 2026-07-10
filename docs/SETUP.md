# 🚀 Setup - Instruções de Instalação

## 📋 Pré-requisitos

- Node.js >= 18.0.0
- npm ou yarn
- PostgreSQL (para o dashboard)
- Git

## ⚙️ Configuração Inicial

### 1. Clonar repositório
```bash
cd webtechpremium-app
```

### 2. Instalar dependências

#### 2.1 App Mobile (Expo)
```bash
cd mobile
npm install
```

#### 2.2 Dashboard (Next.js)
```bash
cd dashboard
npm install
```

## 📱 App Mobile (Expo)

### Configurar ambiente
```bash
cd mobile
cp .env.example .env.local
```

### Rodar em desenvolvimento
```bash
# Terminal
npm start

# Android
npm run android

# iOS (macOS apenas)
npm run ios

# Web
npm run web
```

## 📊 Dashboard (Next.js)

### 1. Configurar banco de dados

```bash
cd dashboard
cp .env.example .env.local
```

Editar `.env.local`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/webtech"
JWT_SECRET=seu-secret-key-super-seguro
```

### 2. Criar banco de dados
```bash
# Criar o banco no PostgreSQL
createdb webtech
```

### 3. Migrar schema
```bash
npm run db:push
# ou
npm run db:migrate
```

### 4. Rodar em desenvolvimento
```bash
npm run dev
```

Acesse: http://localhost:3000

### 5. Gerenciar dados (Prisma Studio)
```bash
npm run db:studio
```

## 📦 Build para Produção

### App Mobile
```bash
cd mobile

# Build APK (Android)
eas build --platform android

# Build IPA (iOS)
eas build --platform ios
```

### Dashboard
```bash
cd dashboard

# Build
npm run build

# Iniciar server
npm start
```

## 🔑 Fluxo de Autenticação

1. **Registro de Usuário**
   - POST `/api/auth/register`
   - Body: `{ email, password, name }`

2. **Login**
   - POST `/api/auth/login`
   - Body: `{ email, password }`
   - Retorna: `{ token, user }`

3. **Registrar App**
   - POST `/api/apps`
   - Header: `Authorization: Bearer {token}`
   - Body: `{ name, macAddress, version }`

## 🏗️ Arquitetura

```
webtechpremium-app/
├── mobile/              # Expo + React Native
│   ├── App.tsx
│   ├── package.json
│   └── app.json
│
├── dashboard/           # Next.js + Prisma
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── apps/
│   │   ├── lib/
│   │   ├── components/
│   │   └── dashboard/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
└── docs/
    ├── SETUP.md
    ├── API.md
    └── ARCHITECTURE.md
```

## 🐛 Troubleshooting

### Erro: PORT 3000 já está em uso
```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erro: Banco de dados não conecta
```bash
# Verificar se PostgreSQL está rodando
# Verificar CONNECTION STRING no .env.local
# Testar conexão:
psql postgresql://user:password@localhost:5432/webtech
```

### Erro: Prisma migration
```bash
# Reset do banco (⚠️ deleta todos os dados)
npm run db:reset

# Ou recriar migrations
rm -rf prisma/migrations
npm run db:migrate
```

## 📚 Documentação Adicional

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/SCHEMA.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
