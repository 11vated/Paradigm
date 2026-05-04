import type { Request, Response, NextFunction } from 'express';
import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let useRedis = false;
let inMemRates = new Map<string, number[]>();

const RATE_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 30;

async function getRedis(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisUrl === 'redis://redis:6379') {
    try {
      redisClient = createClient({ url: redisUrl });
      await redisClient.connect();
      useRedis = true;
      console.log('[RateLimiter] Using Redis backend');
      return redisClient;
    } catch (e) {
      console.warn('[RateLimiter] Redis unavailable, falling back to in-memory');
    }
  }
  return null;
}

export interface RateLimitConfig {
  windowMs?: number;
  limit?: number;
  keyPrefix?: string;
}

export function createRateLimiter(config: RateLimitConfig = {}) {
  const { windowMs = RATE_WINDOW_MS, limit = DEFAULT_LIMIT, keyPrefix = 'ratelimit:' } = config;

  return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const now = Date.now();
    
    let client: RedisClientType | null = null;
    let canProceed = false;

    try {
      client = await getRedis();
    } catch {
      client = null;
    }

    if (client && useRedis) {
      const redisKey = `${keyPrefix}${key}`;
      const windowStart = now - windowMs;
      
      try {
        const multi = client.multi();
        multi.zAdd(redisKey, { score: now, value: now.toString() });
        multi.zRemRangeByScore(redisKey, '0', windowStart.toString());
        multi.zCard(redisKey);
        const results = await multi.exec();
        const count = results?.[2] as number || 0;
        
        canProceed = count < limit;
        
        if (!canProceed) {
          res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
        }
      } catch (e) {
        console.warn('[RateLimiter] Redis error, falling back to in-memory:', e);
        useRedis = false;
      }
    }

    if (!client || !useRedis) {
      const timestamps = inMemRates.get(key) || [];
      const validTimestamps = timestamps.filter(t => now - t < windowMs);
      
      validTimestamps.push(now);
      inMemRates.set(key, validTimestamps);
      
      canProceed = validTimestamps.length <= limit;
    }

    if (!canProceed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`,
      });
      return;
    }

    next();
  };
}

export const defaultRateLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 1000 });
export const authRateLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 1000, keyPrefix: 'auth:' });

export async function shutdownRateLimiter() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}