# ─── Paradigm Absolute — Production Dockerfile ─────────────────────────────
# Multi-stage build: install deps + build frontend, then run with tsx.
# Final image ~250MB (Node 20 slim + app).
# ────────────────────────────────────────────────────────────────────────────

# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Stage 2: Build frontend
FROM deps AS build
COPY . .
RUN npm run build

# Stage 3: Production runtime
FROM node:20-slim AS runtime
WORKDIR /app

# Install tsx globally for TypeScript execution
RUN npm install -g tsx

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist

# Copy source files (server + kernel + libs)
COPY package.json tsconfig.json ./
COPY server.ts ./
COPY src/ ./src/
COPY paradigm/ ./paradigm/
COPY gspl_seeds/ ./gspl_seeds/

# Create data directory for seed persistence
RUN mkdir -p /app/data

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check — hits the /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

EXPOSE 3000

CMD ["tsx", "server.ts"]
