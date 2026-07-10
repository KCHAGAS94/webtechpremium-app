# ⚡ Quick Start Guide

## 🎯 Próximos Passos

### 1️⃣ Terminal - Dashboard (Next.js)
```bash
cd dashboard
npm install
cp .env.example .env.local
# ⚠️ Configure .env.local com suas credenciais PostgreSQL
npm run db:push
npm run dev
# Acesse: http://localhost:3000
```

### 2️⃣ Terminal - Mobile (Expo)
```bash
cd mobile
npm install
cp .env.example .env.local
npm start
# Escanear QR code com Expo Go ou pressionar 'a' (Android)
```

---

## 📱 Testar API

### Registrar usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123",
    "name": "Teste"
  }'
```

Copie o `token` retornado!

### Registrar app (substitua TOKEN)
```bash
curl -X POST http://localhost:3000/api/apps \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu Device",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "version": "1.0.0"
  }'
```

### Listar apps
```bash
curl -X GET http://localhost:3000/api/apps \
  -H "Authorization: Bearer TOKEN_AQUI"
```

---

## 🔧 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| `PORT 3000 já em uso` | `npm run dev` em outra porta: `PORT=3001 npm run dev` |
| PostgreSQL não conecta | Verificar `DATABASE_URL` no `.env.local` |
| Módulos não encontrados | `rm -rf node_modules && npm install` |
| Prisma não gera client | `npm run db:push` ou `npm run db:migrate` |

---

## 📁 Estrutura Final

```
webtechpremium-app/
├── mobile/
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   ├── .env.example
│   └── eas.json
│
├── dashboard/
│   ├── app/
│   │   ├── api/auth/
│   │   ├── api/apps/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── prisma/schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── .env.example
│
├── docs/
│   ├── SETUP.md
│   ├── API.md
│   └── ARCHITECTURE.md
│
└── README.md
```

---

## 🎓 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native + Expo |
| API | Next.js + TypeScript |
| Banco | PostgreSQL + Prisma |
| Auth | JWT + bcrypt |
| Styling | Tailwind CSS |

---

## 🚀 Deploy

### Mobile → Play Store
```bash
cd mobile
eas build --platform android
# Submeter na Play Store
```

### Dashboard → VPS
```bash
cd dashboard
npm run build
# Fazer deploy (Vercel, Digital Ocean, AWS, etc)
```

---

## 📚 Documentação Completa

- [Setup Detalhado](./docs/SETUP.md)
- [API Endpoints](./docs/API.md)
- [Arquitetura](./docs/ARCHITECTURE.md)

---

## ✨ Recursos Inclusos

✅ Autenticação JWT  
✅ Banco PostgreSQL + Prisma  
✅ API RESTful  
✅ MAC address como identificador  
✅ Gerenciamento de apps  
✅ Suporte a M3U lists  
✅ Sessions com expiração  
✅ TypeScript full-stack  
✅ Tailwind CSS  
✅ Documentação completa  

---

**Precisa de ajuda?** Consulte a [documentação](./docs/SETUP.md)! 🚀
