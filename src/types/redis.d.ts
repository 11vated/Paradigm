declare module 'redis' {
  export interface RedisClientType {
    connect(): Promise<void>;
    quit(): Promise<void>;
    multi(): RedisMultiType;
  }
  
  export interface RedisMultiType {
    exec(): Promise<unknown[]>;
    set(key: string, value: string): RedisMultiType;
    get(key: string): RedisMultiType;
    del(key: string): RedisMultiType;
  }
  
  export function createClient(config?: { url?: string; host?: string; port?: number }): RedisClientType;
}
