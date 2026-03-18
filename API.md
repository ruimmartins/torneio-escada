# API Reference

Base URL: `http://localhost:3000` (local) ou `https://seu-projeto.vercel.app` (production)

## Autenticação

Não há autenticação. O utilizador é identificado via cookies (`selectedPlayerId`, `selectedTeamId`).

## Endpoints

### Jogadores

#### GET /api/jogadores
Retorna lista de todos os jogadores.

**Response:**
```json
[
    { "id": 1, "nome": "João Silva", "ativo": true },
    { "id": 2, "nome": "Maria Santos", "ativo": true }
]
```

---

### Duplas

#### GET /api/duplas
Retorna lista de todas as duplas com rankings.

**Response:**
```json
[
    {
        "dupla_id": 1,
        "integrante1_id": 1,
        "integrante2_id": 2,
        "pontos": 100
    },
    {
        "dupla_id": 2,
        "integrante1_id": 3,
        "integrante2_id": 4,
        "pontos": 95
    }
]
```

---

### Desafios

#### GET /api/desafios
Retorna lista de todos os desafios (em curso e concluídos).

**Response:**
```json
[
    {
        "dupla_1_id": 1,
        "dupla_2_id": 2,
        "data_desafio": "2026-03-10",
        "data_resultado": "2026-03-10",
        "resultado_set_1": "6-4",
        "resultado_set_2": "6-3",
        "resultado_tie_break": "",
        "dupla_1_pontos_desafio": 100,
        "dupla_2_pontos_desafio": 95
    }
]
```

#### POST /api/desafio/novo
Criar um novo desafio.

**Request Body:**
```json
{
    "dupla_1_id": 1,
    "dupla_2_id": 3,
    "data_desafio": "2026-03-20",
    "dupla_1_pontos_desafio": 100,
    "dupla_2_pontos_desafio": 88
}
```

**Response:**
```json
{
    "status": "ok",
    "desafio": {...}
}
```

**Erros:**
- `400` - Dados inválidos
- `500` - Erro no servidor

---

### Atualização de Dados

#### PUT /api/desafios/:id/resultado
Atualiza o resultado de um desafio específico.

**Request Body:**
```json
{
    "resultado_set_1": "6-4",
    "resultado_set_2": "6-3",
    "resultado_tie_break": "",
    "data_resultado": "2026-03-16",
    "winner_team_id": 1
}
```

---

## Status Codes

| Código | Significado |
|--------|-----------|
| `200` | OK - Requisição bem-sucedida |
| `400` | Bad Request - Dados inválidos |
| `404` | Not Found - Recurso não encontrado |
| `500` | Server Error - Erro no servidor |

## Rate Limiting

Sem limite de rate. Em production, considere adicionar.

## CORS

CORS habilitado para:
- `localhost:3000` (desenvolvimento)
- `*.vercel.app` (Vercel)
- Qualquer origem (configurável em `api/index.js`)

## Exemplos com cURL

```bash
# Listar jogadores
curl http://localhost:3000/api/jogadores

# Listar duplas
curl http://localhost:3000/api/duplas

# Listar desafios
curl http://localhost:3000/api/desafios

# Criar novo desafio
curl -X POST http://localhost:3000/api/desafio/novo \
  -H "Content-Type: application/json" \
  -d '{
    "dupla_1_id": 1,
    "dupla_2_id": 3,
    "data_desafio": "2026-04-01",
    "dupla_1_pontos_desafio": 100,
    "dupla_2_pontos_desafio": 88
  }'
```

## Estrutura de Dados

### Jogador
```typescript
{
  id: number,
  nome: string,
  ativo: boolean
}
```

### Dupla
```typescript
{
  dupla_id: number,
  integrante1_id: number,
  integrante2_id: number,
  pontos: number
}
```

### Desafio
```typescript
{
  dupla_1_id: number,
  dupla_2_id: number,
  data_desafio: string,        // YYYY-MM-DD
  data_resultado: string,       // YYYY-MM-DD (vazio se pendente)
  resultado_set_1: string,      // Ex: "6-4"
  resultado_set_2: string,      // Ex: "6-3"
  resultado_tie_break: string,  // Ex: "10-8" (vazio se sem tie-break)
  dupla_1_pontos_desafio: number,
  dupla_2_pontos_desafio: number
}
```

---

**Última atualização:** March 2026
