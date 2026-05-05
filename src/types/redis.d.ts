declare module 'redis' {
  export interface RedisClientType {
    connect(): Promise<void>;
    quit(): Promise<void>;
    multi(): any;
  }
  export function createClient(config?: any): RedisClientType;
}
