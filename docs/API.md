# Paradigm Absolute API Documentation

This document provides an overview of the Paradigm Absolute API, including endpoints, authentication, and usage examples.

## Overview

The Paradigm Absolute API is a RESTful API that provides programmatic access to the Genetic Operating Environment for Digital Creation. It supports 27 domain engines, 17 gene types, and 12 functor bridges.

- **Base URL**: `http://localhost:3000/api`
- **OpenAPI Spec**: `/api-docs` (JSON)
- **Swagger UI**: `/api-docs/ui` (Interactive documentation)
- **Authentication**: JWT Bearer Token

## Authentication

Most endpoints require authentication using JWT bearer tokens.

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "user123",
  "password": "securepassword123"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user123",
  "password": "securepassword123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Using the Token

```http
GET /api/seeds
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints

### Seeds

#### List Seeds

```http
GET /api/seeds?page=1&limit=50&domain=character&sort=created
```

Parameters:
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 50, max: 100) - Items per page
- `domain` (string) - Filter by domain
- `sort` (string, enum: created, fitness, domain) - Sort order

#### Create Seed

```http
POST /api/seeds
Authorization: Bearer <token>
Content-Type: application/json

{
  "domain": "character",
  "name": "My Character",
  "genes": {
    "name": "Hero",
    "description": "A brave hero"
  }
}
```

#### Get Seed by ID

```http
GET /api/seeds/{id}
```

#### Delete Seed

```http
DELETE /api/seeds/{id}
Authorization: Bearer <token>
```

### Operations

#### Generate Seed from Prompt

```http
POST /api/seeds/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "A brave knight with a shining sword",
  "domain": "character"
}
```

#### Mutate Seed

```http
POST /api/seeds/{id}/mutate
Authorization: Bearer <token>
Content-Type: application/json

{
  "rate": 0.1
}
```

#### Evolve Seed Population

```http
POST /api/seeds/{id}/evolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "population_size": 8,
  "generations": 3
}
```

#### Breed Two Seeds

```http
POST /api/seeds/breed
Authorization: Bearer <token>
Content-Type: application/json

{
  "parent_a_id": "uuid-1",
  "parent_b_id": "uuid-2"
}
```

#### Compose Seed to Target Domain

```http
POST /api/seeds/{id}/compose
Authorization: Bearer <token>
Content-Type: application/json

{
  "target_domain": "sprite"
}
```

#### Grow Seed via Domain Engine

```http
POST /api/seeds/{id}/grow
Authorization: Bearer <token>
```

### Agent

#### Query GSPL Agent

```http
POST /api/agent/query
Content-Type: application/json

{
  "query": "Create a character",
  "message": "Generate a brave knight"
}
```

### Sovereignty

#### Sign Seed with ECDSA Key

```http
POST /api/seeds/{id}/sign
Authorization: Bearer <token>
Content-Type: application/json

{
  "private_key": "0x..."
}
```

#### Mint Seed as ERC-721 NFT

```http
POST /api/seeds/{id}/mint
Authorization: Bearer <token>
Content-Type: application/json

{
  "owner_address": "0x...",
  "private_key": "0x...",
  "ipfs_gateway": "https://ipfs.io/ipfs/"
}
```

### Metadata

#### List All Domains

```http
GET /api/domains
```

Returns all 27 available domains.

#### List All Gene Types

```http
GET /api/gene-types
```

Returns all 17 gene types.

#### List All Engines

```http
GET /api/engines
```

Returns all available engines.

#### Get Functor Bridge Graph

```http
GET /api/composition/graph
```

Returns the composition graph with nodes and edges.

## Data Models

### Seed

```json
{
  "id": "uuid",
  "$domain": "character",
  "$name": "My Character",
  "$lineage": {
    "generation": 1,
    "operation": "create",
    "parents": []
  },
  "$hash": "sha256hash",
  "$fitness": {
    "overall": 0.95
  },
  "genes": {
    "name": {
      "type": "string",
      "value": "Hero"
    }
  }
}
```

### Error

```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "username",
      "message": "Username is required",
      "code": "REQUIRED_FIELD"
    }
  ]
}
```

## Domains

The following 27 domains are available:

1. character
2. sprite
3. music
4. narrative
5. level
6. item
7. spell
8. quest
9. dialogue
10. animation
11. vfx
12. ui
13. terrain
14. biome
15. faction
16. economy
17. lore
18. cutscene
19. shader
20. physics
21. ai_behavior
22. sound_design
23. architecture
24. vehicle
25. fullgame
26. cinematic
27. agent

## Gene Types

The following 17 gene types are available:

1. name
2. description
3. attributes
4. skills
5. inventory
6. stats
7. appearance
8. behavior
9. relationships
10. backstory
13. dialogue
14. quest
15. location
16. timeline
17. metadata

## Error Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid or missing token)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints may be rate-limited to prevent abuse. Check response headers for rate limit information:

- `X-RateLimit-Limit` - Request limit per window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Unix timestamp when limit resets

## WebSocket

The API also supports WebSocket connections for real-time agent interactions:

- **WebSocket URL**: `ws://localhost:3000/ws/agent`

## Interactive Documentation

For interactive API documentation and testing, visit:

- **Swagger UI**: `http://localhost:3000/api-docs/ui`
- **OpenAPI Spec**: `http://localhost:3000/api-docs`

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Login
const loginResponse = await api.post('/auth/login', {
  username: 'user123',
  password: 'securepassword123',
});

const { accessToken } = loginResponse.data;

// Create seed
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

const seed = await api.post('/seeds', {
  domain: 'character',
  name: 'My Character',
  genes: {
    name: 'Hero',
    description: 'A brave hero',
  },
});

console.log(seed.data);
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3000/api'

# Login
response = requests.post(f'{BASE_URL}/auth/login', json={
    'username': 'user123',
    'password': 'securepassword123',
})

token = response.json()['accessToken']

# Create seed
headers = {'Authorization': f'Bearer {token}'}
seed = requests.post(f'{BASE_URL}/seeds', json={
    'domain': 'character',
    'name': 'My Character',
    'genes': {
        'name': 'Hero',
        'description': 'A brave hero',
    }
}, headers=headers)

print(seed.json())
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user123","password":"securepassword123"}'

# Create seed
curl -X POST http://localhost:3000/api/seeds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"domain":"character","name":"My Character","genes":{"name":"Hero","description":"A brave hero"}}'
```

## Support

For API support and questions:
- GitHub Issues: [https://github.com/your-org/paradigm-absolute/issues](https://github.com/your-org/paradigm-absolute/issues)
- Documentation: [https://docs.paradigm.local](https://docs.paradigm.local)
