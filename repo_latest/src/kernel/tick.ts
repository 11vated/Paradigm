export interface TickConfig {
  tickRate: number;
  maxTickDuration: number;
  enableMetrics: boolean;
}

export interface TickMetrics {
  totalTicks: number;
  avgTickDuration: number;
  maxTickDuration: number;
  minTickDuration: number;
  ticksPerSecond: number;
}

export interface TickEvent {
  type: string;
  tick: number;
  timestamp: number;
  data: unknown;
}

export type TickCallback = (tick: number, deltaTime: number) => void | Promise<void>;

export class TickSystem {
  private tick: number = 0;
  private lastTime: number = 0;
  private deltaTime: number = 0;
  private isRunning: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callbacks: Map<string, TickCallback> = new Map();
  private eventQueue: TickEvent[] = [];
  private config: TickConfig;
  private metrics: TickMetrics = {
    totalTicks: 0,
    avgTickDuration: 0,
    maxTickDuration: 0,
    minTickDuration: Infinity,
    ticksPerSecond: 0
  };
  private tickDurations: number[] = [];
  private lastMetricsTick: number = 0;

  constructor(config: Partial<TickConfig> = {}) {
    this.config = {
      tickRate: config.tickRate ?? 60,
      maxTickDuration: config.maxTickDuration ?? 50,
      enableMetrics: config.enableMetrics ?? true
    };
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastMetricsTick = this.tick;
    
    const intervalMs = 1000 / this.config.tickRate;
    this.intervalId = setInterval(() => this.tickLoop(), intervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tickLoop(): Promise<void> {
    const startTime = performance.now();
    
    this.tick++;
    this.deltaTime = startTime - this.lastTime;
    this.lastTime = startTime;

    try {
      for (const [name, callback] of this.callbacks) {
        const result = callback(this.tick, this.deltaTime);
        if (result instanceof Promise) {
          await result;
        }
      }
    } catch (error) {
      console.error(`Tick ${this.tick} callback error:`, error);
    }

    const tickDuration = performance.now() - startTime;
    this.recordTickDuration(tickDuration);

    if (this.config.enableMetrics && this.tick - this.lastMetricsTick >= this.config.tickRate) {
      this.updateMetrics();
      this.lastMetricsTick = this.tick;
    }
  }

  private recordTickDuration(duration: number): void {
    this.tickDurations.push(duration);
    if (this.tickDurations.length > 100) {
      this.tickDurations.shift();
    }
  }

  private updateMetrics(): void {
    if (this.tickDurations.length === 0) return;

    const sum = this.tickDurations.reduce((a, b) => a + b, 0);
    const avg = sum / this.tickDurations.length;
    const max = Math.max(...this.tickDurations);
    const min = Math.min(...this.tickDurations);

    this.metrics = {
      totalTicks: this.tick,
      avgTickDuration: avg,
      maxTickDuration: max,
      minTickDuration: min,
      ticksPerSecond: this.config.tickRate
    };
  }

  registerCallback(name: string, callback: TickCallback): void {
    this.callbacks.set(name, callback);
  }

  unregisterCallback(name: string): boolean {
    return this.callbacks.delete(name);
  }

  queueEvent(event: Omit<TickEvent, 'tick' | 'timestamp'>): void {
    this.eventQueue.push({
      ...event,
      tick: this.tick,
      timestamp: Date.now()
    });
  }

  getEvents(type?: string): TickEvent[] {
    if (type) {
      return this.eventQueue.filter(e => e.type === type);
    }
    return [...this.eventQueue];
  }

  clearEvents(): void {
    this.eventQueue = [];
  }

  getTick(): number {
    return this.tick;
  }

  getDeltaTime(): number {
    return this.deltaTime;
  }

  getMetrics(): TickMetrics {
    return { ...this.metrics };
  }

  getConfig(): TickConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.isRunning;
  }

  setTickRate(rate: number): void {
    this.config.tickRate = rate;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  getUptime(): number {
    return this.lastTime > 0 ? performance.now() - this.lastTime + (this.tick * (1000 / this.config.tickRate)) : 0;
  }
}
