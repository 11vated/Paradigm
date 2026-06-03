# Deployment Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- NVIDIA GPU (for GPU acceleration)

## Quick Deploy

### Development

```bash
# Install dependencies
npm install

# Start local services
docker compose up -d

# Run development server
npm run dev
```

### Production (Vercel)

```bash
# Deploy to Vercel
npm i -g vercel
vercel --prod
```

### Production (Docker)

```bash
# 1. Set production env (copy .env.example to .env, fill JWT_SECRET + DATABASE_URL etc.)
cp .env.example .env
# Edit .env with strong JWT_SECRET (openssl rand -hex 32) and real DATABASE_URL

# 2. Build images
docker build -t paradigm/gspl-platform:latest .

# 3. Deploy with docker-compose
./infrastructure/deploy.sh production
```

**Post-deploy verification (as user):**
- `curl https://your-api/health`
- `npx tsx cli/paradigm.ts doctor`
- `npx tsx cli/paradigm.ts make "test warrior" --verify`
```

## Environment Variables

For production, **always** set strong values (never commit secrets):

```env
NODE_ENV=production
JWT_SECRET=your-very-long-random-secret-from-openssl-rand-hex-32
DATABASE_URL=postgresql://postgres:password@db:5432/paradigm
REDIS_URL=redis://redis:6379
API_URL=https://api.paradigm.gspl.com
CORS_ORIGINS=https://yourdomain.com
```

Copy from `.env.example` and customize. See `.env.example` for full list + canvas native lib install instructions (required for full server-side 2D/character generation on some platforms).

**Important for full local generation quality:**
- Canvas native libs (for server-side SVG/PNG/2D renders in generators like character, visual2d, etc.):
  - See instructions at top of `.env.example` (or run `npm run` and watch polyfill warnings).
  - On Windows (common pain point): Visual Studio Build Tools (C++ workload) + `npm rebuild canvas`.
  - Alternative (recommended for most users): Use the browser-based Studio for rendering (full Canvas/WebGL support there). Server shims are sufficient for API/CLI seed logic.
```

Also add a quick prod setup note.

## Services

- **API**: http://localhost:3000
- **Web**: http://localhost:80
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
- **Redis**: Utilized for caching and persistent storage of JWT blacklists and refresh tokens to enhance security and session management.

## Scaling

Each worker can handle ~100 concurrent breeding operations. Scale horizontally:

```bash
docker-compose up -d --scale worker=4
```

## Monitoring

Prometheus metrics available at `/metrics`. Key metrics:
- `paradigm_seeds_created_total`
- `paradigm_evolutions_total`
- `paradigm_agent_queries_total`
- `paradigm_kernel_ticks_total`
