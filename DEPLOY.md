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
# Build images
docker build -t paradigm/gspl-platform:latest .

# Deploy with docker-compose
./infrastructure/deploy.sh production
```

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@db:5432/paradigm
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
API_URL=https://api.paradigm.gspl.com
```

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
