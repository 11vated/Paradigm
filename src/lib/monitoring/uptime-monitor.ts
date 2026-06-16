/**
 * Uptime Monitor
 * Provides health checks and uptime monitoring for:
 * - Application endpoints
 * - Database connectivity
 * - Cache connectivity
 * - External services
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UptimeReport {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  uptime: number;
  lastCheck: Date;
}

export class UptimeMonitor {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private startTime: Date = new Date();
  private history: HealthCheckResult[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * Register a custom health check
   */
  registerCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    // Application health check
    this.registerCheck('application', async () => {
      const startTime = Date.now();
      try {
        const healthUrl = process.env.HEALTH_URL || 'http://localhost:3000/health';
        const response = await fetch(healthUrl);
        const responseTime = Date.now() - startTime;

        if (response.ok) {
          return {
            name: 'application',
            status: 'healthy',
            message: 'Application is responding',
            responseTime,
            timestamp: new Date(),
          };
        } else {
          return {
            name: 'application',
            status: 'unhealthy',
            message: `Application returned ${response.status}`,
            responseTime,
            timestamp: new Date(),
          };
        }
      } catch (error) {
        return {
          name: 'application',
          status: 'unhealthy',
          message: `Application check failed: ${(error as Error).message}`,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    });

    // Database health check
    this.registerCheck('database', async () => {
      const startTime = Date.now();
      try {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          return {
            name: 'database',
            status: 'degraded',
            message: 'DATABASE_URL not configured',
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        // Simple connection check using pg
        // @ts-ignore - Optional dependency
        const { Client } = await import('pg');
        const client = new Client({ connectionString: databaseUrl });
        
        await client.connect();
        const result = await client.query('SELECT 1');
        await client.end();

        return {
          name: 'database',
          status: 'healthy',
          message: 'Database connection successful',
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          metadata: { rows: result.rowCount },
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: `Database check failed: ${(error as Error).message}`,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    });

    // Redis health check
    this.registerCheck('redis', async () => {
      const startTime = Date.now();
      try {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          return {
            name: 'redis',
            status: 'degraded',
            message: 'REDIS_URL not configured',
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          };
        }

        // @ts-ignore - Optional dependency
        const Redis = await import('ioredis');
        const redis = new Redis.default(redisUrl);
        
        await redis.ping();
        await redis.quit();

        return {
          name: 'redis',
          status: 'healthy',
          message: 'Redis connection successful',
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy',
          message: `Redis check failed: ${(error as Error).message}`,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    });

    // Disk space check
    this.registerCheck('disk', async () => {
      const startTime = Date.now();
      try {
        const dataDir = process.env.DATA_DIR || './data';
        const stats = await fs.statfs(dataDir);
        // Use correct StatsFs properties: bfree (free bytes), bsize (block size), blocks (total blocks)
        const freeSpace = stats.bfree * stats.bsize;
        const totalSpace = stats.blocks * stats.bsize;
        const usagePercent = ((totalSpace - freeSpace) / totalSpace) * 100;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (usagePercent > 90) {
          status = 'unhealthy';
        } else if (usagePercent > 80) {
          status = 'degraded';
        }

        return {
          name: 'disk',
          status,
          message: `Disk usage: ${usagePercent.toFixed(2)}%`,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          metadata: {
            freeSpace,
            totalSpace,
            usagePercent,
          },
        };
      } catch (error) {
        return {
          name: 'disk',
          status: 'degraded',
          message: `Disk check failed: ${(error as Error).message}`,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    });

    // Memory check
    this.registerCheck('memory', async () => {
      const startTime = Date.now();
      try {
        const memoryUsage = process.memoryUsage();
        const heapUsed = memoryUsage.heapUsed;
        const heapTotal = memoryUsage.heapTotal;
        const usagePercent = (heapUsed / heapTotal) * 100;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (usagePercent > 90) {
          status = 'unhealthy';
        } else if (usagePercent > 80) {
          status = 'degraded';
        }

        return {
          name: 'memory',
          status,
          message: `Memory usage: ${usagePercent.toFixed(2)}%`,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          metadata: {
            heapUsed,
            heapTotal,
            rss: memoryUsage.rss,
            external: memoryUsage.external,
          },
        };
      } catch (error) {
        return {
          name: 'memory',
          status: 'degraded',
          message: `Memory check failed: ${(error as Error).message}`,
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    });
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<UptimeReport> {
    const checks: HealthCheckResult[] = [];

    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        checks.push(result);
        this.addToHistory(result);
      } catch (error) {
        checks.push({
          name,
          status: 'unhealthy',
          message: `Check failed: ${(error as Error).message}`,
          responseTime: 0,
          timestamp: new Date(),
        });
      }
    }

    // Determine overall status
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const uptime = Date.now() - this.startTime.getTime();

    return {
      overallStatus,
      checks,
      uptime,
      lastCheck: new Date(),
    };
  }

  /**
   * Run a specific health check
   */
  async check(name: string): Promise<HealthCheckResult> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return {
        name,
        status: 'unhealthy',
        message: 'Check not found',
        responseTime: 0,
        timestamp: new Date(),
      };
    }

    const result = await checkFn();
    this.addToHistory(result);
    return result;
  }

  /**
   * Add result to history
   */
  private addToHistory(result: HealthCheckResult): void {
    this.history.push(result);
    
    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get uptime percentage for a specific check
   */
  getUptimePercentage(name: string, windowMs: number = 3600000): number {
    const cutoff = new Date(Date.now() - windowMs);
    const relevantHistory = this.history.filter(
      h => h.name === name && h.timestamp > cutoff
    );

    if (relevantHistory.length === 0) return 100;

    const healthyCount = relevantHistory.filter(h => h.status === 'healthy').length;
    return (healthyCount / relevantHistory.length) * 100;
  }

  /**
   * Get average response time for a specific check
   */
  getAverageResponseTime(name: string, windowMs: number = 3600000): number {
    const cutoff = new Date(Date.now() - windowMs);
    const relevantHistory = this.history.filter(
      h => h.name === name && h.timestamp > cutoff
    );

    if (relevantHistory.length === 0) return 0;

    const totalTime = relevantHistory.reduce((sum, h) => sum + h.responseTime, 0);
    return totalTime / relevantHistory.length;
  }

  /**
   * Export uptime report to file
   */
  async exportReport(filePath: string): Promise<void> {
    const report = await this.checkAll();
    await fs.writeFile(filePath, JSON.stringify(report, null, 2));
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 60000): void {
    setInterval(async () => {
      const report = await this.checkAll();
      console.log(`Uptime check: ${report.overallStatus} (${report.checks.length} checks)`);
    }, intervalMs);
  }
}

// Singleton instance
let uptimeMonitorInstance: UptimeMonitor | null = null;

export function getUptimeMonitor(): UptimeMonitor {
  if (!uptimeMonitorInstance) {
    uptimeMonitorInstance = new UptimeMonitor();
  }
  return uptimeMonitorInstance;
}
