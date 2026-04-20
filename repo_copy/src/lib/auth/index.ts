/**
 * Paradigm Absolute — Authentication & Authorization
 * JWT-based auth with bcrypt password hashing.
 * Users stored in a flat JSON file (upgradeable to MongoDB later).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// We use Node.js built-in crypto for HMAC-SHA256 JWT instead of requiring jsonwebtoken.
// This keeps dependencies minimal while providing secure tokens.

// In production, JWT_SECRET MUST be set — random secrets break across restarts
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET environment variable is required in production.');
    console.error('  Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  // Dev mode: generate ephemeral secret (logged as warning)
  const ephemeral = crypto.randomBytes(32).toString('hex');
  console.warn('[WARN] No JWT_SECRET set — using ephemeral secret. Tokens will not survive restarts.');
  return ephemeral;
})();
const TOKEN_EXPIRY_SECONDS = 3600;         // Access token: 1 hour
const REFRESH_TOKEN_EXPIRY_SECONDS = 604800; // Refresh token: 7 days

// ─── JWT Blacklist (in-memory, for token revocation) ─────────────────────────
const tokenBlacklist = new Set<string>();
const BLACKLIST_CLEANUP_INTERVAL = 300000; // 5 minutes

// Track refresh tokens: jti → { userId, exp }
const refreshTokens = new Map<string, { userId: string; exp: number }>();

// Cleanup expired blacklist entries and refresh tokens periodically
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const entry of tokenBlacklist) {
    // Parse the jti timestamp if encoded, otherwise just let it age out
    // We keep entries for max 2x the token expiry to be safe
  }
  for (const [jti, meta] of refreshTokens) {
    if (meta.exp < now) refreshTokens.delete(jti);
  }
}, BLACKLIST_CLEANUP_INTERVAL);
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  role: 'user' | 'admin';
}

interface JWTPayload {
  sub: string;       // user id
  username: string;
  role: string;
  jti: string;       // unique token id (for blacklisting)
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// ─── Password Hashing (PBKDF2 — no external dependency) ──────────────────────

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

// ─── JWT (HMAC-SHA256, no dependency) ─────────────────────────────────────────

function base64url(data: string | Buffer): string {
  const b = typeof data === 'string' ? Buffer.from(data) : data;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

function signJWT(payload: JWTPayload): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = base64url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  );
  if (signature !== expectedSig) return null;
  const payload: JWTPayload = JSON.parse(base64urlDecode(body));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  // Check blacklist
  if (payload.jti && tokenBlacklist.has(payload.jti)) return null;
  return payload;
}

// ─── User Storage ─────────────────────────────────────────────────────────────

function loadUsers(): User[] {
  if (fs.existsSync(USERS_FILE)) {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }
  return [];
}

function saveUsers(users: User[]): void {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ─── Public API ───────────────────────────────────────────────────────────────

function issueTokenPair(user: User): { token: string; refreshToken: string; expiresIn: number } {
  const now = Math.floor(Date.now() / 1000);
  const accessJti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const token = signJWT({
    sub: user.id, username: user.username, role: user.role,
    jti: accessJti, type: 'access',
    iat: now, exp: now + TOKEN_EXPIRY_SECONDS,
  });

  const refreshToken = signJWT({
    sub: user.id, username: user.username, role: user.role,
    jti: refreshJti, type: 'refresh',
    iat: now, exp: now + REFRESH_TOKEN_EXPIRY_SECONDS,
  });

  // Track the refresh token for rotation
  refreshTokens.set(refreshJti, { userId: user.id, exp: now + REFRESH_TOKEN_EXPIRY_SECONDS });

  return { token, refreshToken, expiresIn: TOKEN_EXPIRY_SECONDS };
}

export function registerUser(username: string, password: string): { user: Omit<User, 'passwordHash'>; token: string; refreshToken: string; expiresIn: number } | { error: string } {
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return { error: 'Username already exists' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    role: users.length === 0 ? 'admin' : 'user', // First user is admin
  };
  users.push(user);
  saveUsers(users);

  const tokens = issueTokenPair(user);
  return { user: { id: user.id, username: user.username, createdAt: user.createdAt, role: user.role }, ...tokens };
}

export function loginUser(username: string, password: string): { user: Omit<User, 'passwordHash'>; token: string; refreshToken: string; expiresIn: number } | { error: string } {
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: 'Invalid username or password' };
  }
  const tokens = issueTokenPair(user);
  return { user: { id: user.id, username: user.username, createdAt: user.createdAt, role: user.role }, ...tokens };
}

const refreshingTokens = new Set<string>();

/**
 * Refresh token rotation — issue new access + refresh tokens, blacklist the old refresh.
 */
export function refreshAccessToken(refreshTokenStr: string): { token: string; refreshToken: string; expiresIn: number } | { error: string } {
  const payload = verifyJWT(refreshTokenStr);
  if (!payload || payload.type !== 'refresh' || !payload.jti) {
    return { error: 'Invalid or expired refresh token' };
  }

  // Concurrency lock to prevent race conditions on double-submit
  if (refreshingTokens.has(payload.jti)) {
    return { error: 'Concurrent refresh in progress' };
  }
  refreshingTokens.add(payload.jti);

  try {
    // Blacklist the old refresh token (rotation)
    tokenBlacklist.add(payload.jti);
    refreshTokens.delete(payload.jti);

    // Look up user to get current role (in case it changed)
    const users = loadUsers();
    const user = users.find(u => u.id === payload.sub);
    if (!user) return { error: 'User not found' };

    return issueTokenPair(user);
  } finally {
    refreshingTokens.delete(payload.jti);
  }
}

/**
 * Revoke a token (adds to blacklist). Used for logout.
 */
export function revokeToken(tokenStr: string): boolean {
  const payload = verifyJWT(tokenStr);
  if (!payload?.jti) return false;
  tokenBlacklist.add(payload.jti);
  if (payload.type === 'refresh') refreshTokens.delete(payload.jti);
  return true;
}

/**
 * Express middleware: verifies the JWT from the Authorization header.
 * Attaches the decoded payload to `req.user`.
 * Routes that don't require auth should NOT use this middleware.
 */
export function verifyToken(req: any, res: any, next: any): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.user = payload;
  next();
}

/**
 * Optional auth — attaches req.user if token present, but doesn't reject.
 * Useful for endpoints that work for both authenticated and anonymous users.
 */
export function optionalAuth(req: any, _res: any, next: any): void {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    if (payload) req.user = payload;
  }
  next();
}

/** Alias for clarity — verifyToken requires a valid JWT or returns 401. */
export const requireAuth = verifyToken;

/**
 * RBAC middleware — checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER verifyToken/requireAuth.
 */
export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

/**
 * Raw JWT verification — for use in WebSocket upgrade handlers where
 * Express middleware isn't available. Returns decoded payload or null.
 */
export function verifyTokenRaw(token: string): JWTPayload | null {
  return verifyJWT(token);
}

/**
 * Simple in-memory rate limiter.
 * Tracks requests per IP with a sliding window.
 */
export function createRateLimiter(windowMs: number = 60000, maxRequests: number = 100) {
  const requests: Map<string, number[]> = new Map();

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, times] of requests) {
      const filtered = times.filter(t => now - t < windowMs);
      if (filtered.length === 0) requests.delete(key);
      else requests.set(key, filtered);
    }
  }, 300000);

  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const times = requests.get(ip) ?? [];
    const recent = times.filter(t => now - t < windowMs);

    if (recent.length >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((recent[0] + windowMs - now) / 1000)
      });
      return;
    }
    recent.push(now);
    requests.set(ip, recent);
    next();
  };
}
