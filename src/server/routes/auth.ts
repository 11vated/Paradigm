/**
 * Auth routes — register / login / refresh / logout.
 * Slice 5 of the modular router split. Extracted from server.ts.
 */
import type { Express } from 'express';

export interface AuthDeps {
  authLimiter: (req: any, res: any, next: any) => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  RegisterSchema: any;
  LoginSchema: any;
  registerUser: (username: string, password: string) => any;
  loginUser: (username: string, password: string) => any;
  refreshAccessToken: (refreshToken: string) => any;
  audit: (kind: string, target: string, actor: any, meta: any, req: any) => void;
  metrics: Record<string, any>;
  log: (level: any, msg: string, meta?: any) => void;
  revokeToken: (token: string) => void;
}

export function registerAuthRoutes(app: Express, deps: AuthDeps): void {
  const { authLimiter, optionalAuth, validateBody, RegisterSchema, LoginSchema, registerUser, loginUser, refreshAccessToken, audit, metrics, log, revokeToken } = deps;

  app.post('/api/auth/register', authLimiter, validateBody(RegisterSchema), (req: any, res: any) => {
    const { username, password } = req.body;
    const result = registerUser(username, password);
    if ('error' in result) return res.status(400).json(result);
    metrics.authAttempts++;
    metrics.authSuccesses++;
    log('INFO', 'User registered', { username });
    res.json(result);
  });

  app.post('/api/auth/login', authLimiter, validateBody(LoginSchema), (req: any, res: any) => {
    const { username, password } = req.body;
    const result = loginUser(username, password);
    if ('error' in result) return res.status(401).json(result);
    metrics.authAttempts++;
    metrics.authSuccesses++;
    log('INFO', 'User logged in', { username });
    audit('auth.login', 'user', undefined, { username }, req);
    res.json(result);
  });

  app.post('/api/auth/refresh', (req: any, res: any) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const result = refreshAccessToken(refreshToken);
    if ('error' in result) return res.status(401).json(result);
    res.json(result);
  });

  app.post('/api/auth/logout', optionalAuth, (req: any, res: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.slice(7);
    if (token) revokeToken(token);
    // Also revoke refresh token if provided
    if (req.body.refreshToken) revokeToken(req.body.refreshToken);
    audit('auth.logout', 'user', req.user?.sub, {}, req);
    res.json({ success: true });
  });
}
