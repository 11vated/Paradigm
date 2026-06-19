# Paradigm Absolute — API Documentation

## Overview

The Paradigm Absolute API provides programmatic access to the Deterministic Synthetic Evolution Operating System, enabling seed generation, evolution, composition, and marketplace operations.

**Base URL:** `https://api.paradigm.com`  
**API Version:** v1  
**Authentication:** JWT Bearer tokens  
**Rate Limiting:** 2,000 requests per 5 minutes per IP

---

## Authentication

### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "username": "username"
}
```

**Response:**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "username": "username",
    "createdAt": "2026-06-19T00:00:00Z"
  },
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer {token}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

## Seeds

### Generate Seed

Create a new seed in a specific domain.

```http
POST /api/seeds/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "domain": "character",
  "genes": {
    "archetype": "warrior",
    "style": "fantasy",
    "complexity": 0.7
  },
  "options": {
    "quality": "high",
    "deterministic": true
  }
}
```

**Response:**
```json
{
  "seed": {
    "id": "seed_abc123",
    "hash": "0x1234567890abcdef...",
    "domain": "character",
    "genes": {...},
    "createdAt": "2026-06-19T00:00:00Z",
    "owner": "usr_abc123"
  },
  "artifact": {
    "type": "character",
    "data": {...},
    "preview": "https://cdn.paradigm.com/previews/seed_abc123.png",
    "quality": 0.987
  }
}
```

### Get Seed

```http
GET /api/seeds/{seedId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "seed_abc123",
  "hash": "0x1234567890abcdef...",
  "domain": "character",
  "genes": {...},
  "artifact": {...},
  "owner": "usr_abc123",
  "createdAt": "2026-06-19T00:00:00Z",
  "lineage": {
    "parents": [],
    "children": ["seed_def456", "seed_ghi789"]
  }
}
```

### List Seeds

```http
GET /api/seeds?domain=character&limit=20&offset=0
Authorization: Bearer {token}
```

**Query Parameters:**
- `domain` (optional) - Filter by domain
- `owner` (optional) - Filter by owner ID
- `limit` (optional, default: 20, max: 100)
- `offset` (optional, default: 0)
- `sort` (optional) - Sort by: `created`, `quality`, `popularity`
- `order` (optional) - Order: `asc`, `desc`

**Response:**
```json
{
  "seeds": [...],
  "total": 1234,
  "limit": 20,
  "offset": 0
}
```

### Mutate Seed

```http
POST /api/seeds/{seedId}/mutate
Authorization: Bearer {token}
Content-Type: application/json

{
  "mutationRate": 0.1,
  "targetGenes": ["archetype", "style"]
}
```

**Response:**
```json
{
  "seed": {...},
  "artifact": {...},
  "parent": "seed_abc123"
}
```

### Breed Seeds

```http
POST /api/seeds/breed
Authorization: Bearer {token}
Content-Type: application/json

{
  "parent1": "seed_abc123",
  "parent2": "seed_def456",
  "crossoverRate": 0.5
}
```

**Response:**
```json
{
  "seed": {...},
  "artifact": {...},
  "parents": ["seed_abc123", "seed_def456"]
}
```

### Evolve Seed

```http
POST /api/seeds/{seedId}/evolve
Authorization: Bearer {token}
Content-Type: application/json

{
  "generations": 10,
  "populationSize": 50,
  "fitnessFunction": "quality",
  "selectionMethod": "tournament"
}
```

**Response:**
```json
{
  "seed": {...},
  "artifact": {...},
  "generations": 10,
  "finalFitness": 0.995,
  "ancestor": "seed_abc123"
}
```

---

## Friends

### Create Friend

```http
POST /api/friends/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Aurora",
  "personality": {
    "openness": 0.8,
    "conscientiousness": 0.7,
    "extraversion": 0.6,
    "agreeableness": 0.9,
    "neuroticism": 0.3
  },
  "appearance": {
    "style": "ethereal",
    "colors": ["blue", "silver"]
  }
}
```

**Response:**
```json
{
  "friend": {
    "id": "friend_abc123",
    "seed": {...},
    "name": "Aurora",
    "personality": {...},
    "appearance": {...},
    "voice": {...},
    "createdAt": "2026-06-19T00:00:00Z"
  }
}
```

### Get Friend

```http
GET /api/friends/{friendId}
Authorization: Bearer {token}
```

### List Friends

```http
GET /api/friends?limit=20&offset=0
Authorization: Bearer {token}
```

### Interact with Friend

```http
POST /api/friends/{friendId}/interact
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Hello, how are you today?",
  "context": {
    "location": "home",
    "mood": "curious"
  }
}
```

**Response:**
```json
{
  "response": {
    "message": "I'm doing wonderfully! I've been thinking about...",
    "emotion": "happy",
    "actions": ["smile", "lean_forward"]
  }
}
```

---

## Worlds

### Generate World

```http
POST /api/worlds/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "era": "medieval",
  "biome": "forest",
  "conflict": "war",
  "size": "medium"
}
```

**Response:**
```json
{
  "world": {
    "id": "world_abc123",
    "seed": {...},
    "era": "medieval",
    "biome": "forest",
    "geography": {...},
    "factions": [...],
    "history": {...}
  }
}
```

### Get World

```http
GET /api/worlds/{worldId}
Authorization: Bearer {token}
```

---

## Quests

### Generate Quest

```http
POST /api/quests/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "friendId": "friend_abc123",
  "worldId": "world_def456",
  "difficulty": "medium",
  "type": "adventure"
}
```

**Response:**
```json
{
  "quest": {
    "id": "quest_abc123",
    "seed": {...},
    "title": "The Lost Artifact",
    "description": "...",
    "objectives": [...],
    "rewards": [...],
    "difficulty": "medium"
  }
}
```

---

## Marketplace

### List Marketplace Seeds

```http
GET /api/marketplace/seeds?domain=character&minPrice=0&maxPrice=1000
Authorization: Bearer {token}
```

**Query Parameters:**
- `domain` (optional)
- `minPrice` (optional)
- `maxPrice` (optional)
- `quality` (optional) - Minimum quality score
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "listings": [
    {
      "id": "listing_abc123",
      "seed": {...},
      "price": 100,
      "currency": "PARA",
      "seller": "usr_def456",
      "listedAt": "2026-06-19T00:00:00Z"
    }
  ],
  "total": 456,
  "limit": 20,
  "offset": 0
}
```

### List Seed

```http
POST /api/marketplace/list
Authorization: Bearer {token}
Content-Type: application/json

{
  "seedId": "seed_abc123",
  "price": 100,
  "currency": "PARA"
}
```

**Response:**
```json
{
  "listing": {
    "id": "listing_abc123",
    "seedId": "seed_abc123",
    "price": 100,
    "currency": "PARA",
    "seller": "usr_abc123",
    "listedAt": "2026-06-19T00:00:00Z"
  }
}
```

### Buy Seed

```http
POST /api/marketplace/buy/{listingId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "transaction": {
    "id": "tx_abc123",
    "listing": "listing_abc123",
    "buyer": "usr_abc123",
    "seller": "usr_def456",
    "price": 100,
    "currency": "PARA",
    "completedAt": "2026-06-19T00:00:00Z"
  },
  "seed": {...}
}
```

---

## Composition

### Compose Seeds

Apply cross-domain functors to combine seeds.

```http
POST /api/compose
Authorization: Bearer {token}
Content-Type: application/json

{
  "functor": "character_clothing",
  "inputs": {
    "character": "seed_abc123",
    "clothing": "seed_def456"
  }
}
```

**Response:**
```json
{
  "seed": {...},
  "artifact": {...},
  "functor": "character_clothing",
  "inputs": ["seed_abc123", "seed_def456"]
}
```

---

## Health & Status

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "storage": "healthy"
  }
}
```

### System Status

```http
GET /api/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "seeds": {
    "total": 1234567,
    "generated24h": 5678
  },
  "users": {
    "total": 12345,
    "active24h": 1234
  },
  "marketplace": {
    "listings": 456,
    "sales24h": 78
  }
}
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_SEED",
    "message": "The provided seed hash is invalid",
    "details": {
      "field": "hash",
      "reason": "Invalid format"
    }
  }
}
```

---

## Rate Limiting

**Limits:**
- 2,000 requests per 5 minutes per IP
- 10,000 requests per hour per user
- 100,000 requests per day per user

**Headers:**
```
X-RateLimit-Limit: 2000
X-RateLimit-Remaining: 1999
X-RateLimit-Reset: 1624320000
```

**Rate Limit Exceeded Response:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "retryAfter": 300
  }
}
```

---

## Webhooks

### Register Webhook

```http
POST /api/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/paradigm",
  "events": ["seed.created", "seed.sold", "friend.message"],
  "secret": "your-webhook-secret"
}
```

**Events:**
- `seed.created` - New seed generated
- `seed.mutated` - Seed mutated
- `seed.bred` - Seeds bred
- `seed.evolved` - Seed evolved
- `seed.listed` - Seed listed on marketplace
- `seed.sold` - Seed sold
- `friend.created` - Friend created
- `friend.message` - Friend sent message
- `world.generated` - World generated
- `quest.created` - Quest created
- `quest.completed` - Quest completed

**Webhook Payload:**
```json
{
  "event": "seed.created",
  "timestamp": "2026-06-19T00:00:00Z",
  "data": {
    "seed": {...}
  }
}
```

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @paradigm/sdk
```

```typescript
import { ParadigmClient } from '@paradigm/sdk';

const client = new ParadigmClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.paradigm.com'
});

// Generate seed
const { seed, artifact } = await client.seeds.generate({
  domain: 'character',
  genes: { archetype: 'warrior' }
});

// Mutate seed
const mutated = await client.seeds.mutate(seed.id, {
  mutationRate: 0.1
});

// Breed seeds
const offspring = await client.seeds.breed({
  parent1: seed1.id,
  parent2: seed2.id
});
```

### Python

```bash
pip install paradigm-sdk
```

```python
from paradigm import ParadigmClient

client = ParadigmClient(api_key='your-api-key')

# Generate seed
seed, artifact = client.seeds.generate(
    domain='character',
    genes={'archetype': 'warrior'}
)

# Mutate seed
mutated = client.seeds.mutate(seed.id, mutation_rate=0.1)

# Breed seeds
offspring = client.seeds.breed(parent1=seed1.id, parent2=seed2.id)
```

---

## Support

**Documentation:** https://docs.paradigm.com  
**API Status:** https://status.paradigm.com  
**Support Email:** support@paradigm.com  
**Discord:** https://discord.gg/paradigm

---

**Last Updated:** June 19, 2026  
**API Version:** v1.0.0