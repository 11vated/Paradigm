/**
 * Log Aggregator
 * Provides centralized log shipping to multiple backends:
 * - Loki (Grafana Loki)
 * - ELK Stack (Elasticsearch + Logstash)
 * - CloudWatch Logs (AWS)
 * - Console (default, always available)
 */

import pino from 'pino';

export interface LogBackend {
  name: string;
  write(log: any): void;
  flush(): Promise<void>;
}

/**
 * Console backend (always available)
 */
class ConsoleBackend implements LogBackend {
  name = 'console';

  constructor() {
    // Console backend uses direct console output
  }

  write(log: any): void {
    // Direct console output with formatting
    const level = log.level || 'info';
    const message = log.msg || JSON.stringify(log);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  async flush(): Promise<void> {
    // Console doesn't need flushing
  }
}

/**
 * Loki backend (Grafana Loki)
 */
class LokiBackend implements LogBackend {
  name = 'loki';
  private client: any = null;
  private mounted = false;
  private buffer: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    private lokiUrl: string = process.env.LOKI_URL || 'http://localhost:3100',
    private labels: Record<string, string> = {},
    private batchSize: number = 100,
    private flushIntervalMs: number = 5000
  ) {
    // Lazy load lokijs
  }

  private async ensureClient(): Promise<void> {
    if (this.mounted) return;

    try {
      // @ts-ignore - Optional dependency
      const { Loki } = await import('lokijs');
      this.client = new Loki(this.lokiUrl);
      this.mounted = true;
      
      // Start periodic flush
      this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    } catch (error) {
      console.warn('Loki client not available, falling back to console:', error);
      this.mounted = false;
    }
  }

  write(log: any): void {
    if (!this.mounted) {
      // Fallback to console if not mounted
      console.log(JSON.stringify(log));
      return;
    }

    this.buffer.push({
      stream: {
        ...this.labels,
        level: log.level,
        service: 'paradigm',
      },
      values: [[Date.now().toString(), JSON.stringify(log)]],
    });

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.client || this.buffer.length === 0) return;

    try {
      const payload = { streams: this.buffer };
      // @ts-ignore - Optional dependency
      const response = await fetch(`${this.lokiUrl}/loki/api/v1/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Loki push failed: ${response.statusText}`);
      }

      this.buffer = [];
    } catch (error) {
      console.error('Failed to flush logs to Loki:', error);
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

/**
 * Elasticsearch backend (ELK Stack)
 */
class ElasticsearchBackend implements LogBackend {
  name = 'elasticsearch';
  private client: any = null;
  private mounted = false;
  private buffer: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    private esUrl: string = process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    private index: string = 'paradigm-logs',
    private batchSize: number = 100,
    private flushIntervalMs: number = 5000
  ) {
    // Lazy load @elastic/elasticsearch
  }

  private async ensureClient(): Promise<void> {
    if (this.mounted) return;

    try {
      // @ts-ignore - Optional dependency
      const { Client } = await import('@elastic/elasticsearch');
      this.client = new Client({ node: this.esUrl });
      this.mounted = true;
      
      // Start periodic flush
      this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    } catch (error) {
      console.warn('Elasticsearch client not available, falling back to console:', error);
      this.mounted = false;
    }
  }

  write(log: any): void {
    if (!this.mounted) {
      console.log(JSON.stringify(log));
      return;
    }

    this.buffer.push({
      '@timestamp': new Date().toISOString(),
      level: log.level,
      message: log.msg,
      ...log,
    });

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.client || this.buffer.length === 0) return;

    try {
      const body = this.buffer.flatMap(doc => [
        { index: { _index: this.index } },
        doc,
      ]);

      await this.client.bulk({ body });
      this.buffer = [];
    } catch (error) {
      console.error('Failed to flush logs to Elasticsearch:', error);
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

/**
 * CloudWatch Logs backend (AWS)
 */
class CloudWatchBackend implements LogBackend {
  name = 'cloudwatch';
  private client: any = null;
  private mounted = false;
  private buffer: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    private logGroupName: string = process.env.AWS_CLOUDWATCH_LOG_GROUP || '/paradigm/app',
    private logStreamName: string = process.env.AWS_CLOUDWATCH_LOG_STREAM || 'main',
    private region: string = process.env.AWS_REGION || 'us-east-1',
    private batchSize: number = 100,
    private flushIntervalMs: number = 5000
  ) {
    // Lazy load @aws-sdk/client-cloudwatch-logs
  }

  private async ensureClient(): Promise<void> {
    if (this.mounted) return;

    try {
      // @ts-ignore - Optional dependency
      const { CloudWatchLogsClient } = await import('@aws-sdk/client-cloudwatch-logs');
      this.client = new CloudWatchLogsClient({ region: this.region });
      this.mounted = true;
      
      // Start periodic flush
      this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    } catch (error) {
      console.warn('CloudWatch Logs client not available, falling back to console:', error);
      this.mounted = false;
    }
  }

  write(log: any): void {
    if (!this.mounted) {
      console.log(JSON.stringify(log));
      return;
    }

    this.buffer.push({
      message: JSON.stringify(log),
      timestamp: Date.now(),
    });

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.client || this.buffer.length === 0) return;

    try {
      // @ts-ignore - Optional dependency
      const { PutLogEventsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
      
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: this.buffer,
      });

      await this.client.send(command);
      this.buffer = [];
    } catch (error) {
      console.error('Failed to flush logs to CloudWatch:', error);
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

/**
 * Unified Log Aggregator
 * Chains multiple backends with fallback order
 */
export class LogAggregator {
  private backends: LogBackend[] = [];

  constructor() {
    // Always include console backend as fallback
    this.backends.push(new ConsoleBackend());

    // Add Loki if configured
    if (process.env.LOKI_URL) {
      const lokiBackend = new LokiBackend(
        process.env.LOKI_URL,
        {
          environment: process.env.NODE_ENV || 'development',
          app: 'paradigm',
        }
      );
      this.backends.push(lokiBackend);
    }

    // Add Elasticsearch if configured
    if (process.env.ELASTICSEARCH_URL) {
      const esBackend = new ElasticsearchBackend(
        process.env.ELASTICSEARCH_URL,
        `paradigm-${process.env.NODE_ENV || 'dev'}`
      );
      this.backends.push(esBackend);
    }

    // Add CloudWatch if configured
    if (process.env.AWS_CLOUDWATCH_LOG_GROUP) {
      const cwBackend = new CloudWatchBackend();
      this.backends.push(cwBackend);
    }
  }

  /**
   * Write a log entry to all backends
   */
  write(log: any): void {
    for (const backend of this.backends) {
      try {
        backend.write(log);
      } catch (error) {
        console.error(`Failed to write to ${backend.name}:`, error);
      }
    }
  }

  /**
   * Flush all backends
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.backends.map(backend => backend.flush().catch(error => {
        console.error(`Failed to flush ${backend.name}:`, error);
      }))
    );
  }

  /**
   * Destroy all backends (cleanup)
   */
  destroy(): void {
    for (const backend of this.backends) {
      if ('destroy' in backend) {
        (backend as any).destroy();
      }
    }
  }
}

// Singleton instance
let logAggregatorInstance: LogAggregator | null = null;

export function getLogAggregator(): LogAggregator {
  if (!logAggregatorInstance) {
    logAggregatorInstance = new LogAggregator();
  }
  return logAggregatorInstance;
}

/**
 * Create a Pino logger with log aggregation
 */
export function createLogger(options: pino.LoggerOptions = {}): pino.Logger {
  const aggregator = getLogAggregator();
  
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    ...options,
  }, {
    write: (data) => aggregator.write(data),
  });
}
