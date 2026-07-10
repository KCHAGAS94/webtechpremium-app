# 📚 Documentação de API

## Base URL
```
http://localhost:3000/api
```

## Autenticação

Todas as rotas protegidas requerem token JWT no header:
```
Authorization: Bearer {token}
```

---

## Endpoints

### 🔐 Autenticação

#### 1. Registrar novo usuário
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "senha123",
  "name": "Nome do Usuário" (opcional)
}
```

**Resposta (201):**
```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Nome do Usuário"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Fazer login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Resposta (200):**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Nome do Usuário"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 📱 Apps

#### 1. Listar apps do usuário
```http
GET /apps
Authorization: Bearer {token}
```

**Resposta (200):**
```json
{
  "apps": [
    {
      "id": 1,
      "name": "Meu App",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "version": "1.0.0",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "sessions": []
    }
  ]
}
```

#### 2. Registrar novo app
```http
POST /apps
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Meu App",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "version": "1.0.0"
}
```

**Resposta (201):**
```json
{
  "message": "App registrado com sucesso",
  "app": {
    "id": 1,
    "name": "Meu App",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "version": "1.0.0",
    "status": "active",
    "userId": 1,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido ou ausente |
| 409 | Conflict - Recurso já existe (email, MAC) |
| 500 | Internal Server Error - Erro no servidor |

---

## Exemplo de Fluxo Completo

### 1. Registrar usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@example.com",
    "password": "senha123",
    "name": "João"
  }'
```

### 2. Fazer login (obter token)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@example.com",
    "password": "senha123"
  }'
```

### 3. Registrar app com o token
```bash
curl -X POST http://localhost:3000/api/apps \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "App Store",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "version": "1.0.0"
  }'
```

### 4. Listar apps
```bash
curl -X GET http://localhost:3000/api/apps \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 📌 Notas Importantes

- **MAC Address**: Deve ser único no sistema
- **Email**: Deve ser único no sistema
- **Token JWT**: Válido por 24 horas (pode ser configurado)
- **Password**: Armazenado com hash bcrypt
