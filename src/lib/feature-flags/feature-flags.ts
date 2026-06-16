/**
 * Feature Flags System for Paradigm Infinite
 * 
 * Provides dynamic feature toggling, A/B testing, and gradual rollout capabilities.
 * Supports multiple backends: environment variables, database, and remote config services.
 */

export interface FeatureFlagConfig {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number; // 0-100 for gradual rollout
  conditions?: FeatureFlagCondition[];
  metadata?: Record<string, unknown>;
}

export interface FeatureFlagCondition {
  type: 'user_id' | 'user_segment' | 'environment' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: string | string[] | number;
}

export interface FeatureFlagContext {
  userId?: string;
  userSegment?: string;
  environment?: string;
  customAttributes?: Record<string, unknown>;
}

export interface FeatureFlagBackend {
  getFlag(name: string): Promise<FeatureFlagConfig | null>;
  setFlag(name: string, config: FeatureFlagConfig): Promise<void>;
  getAllFlags(): Promise<FeatureFlagConfig[]>;
  isEnabled(name: string, context?: FeatureFlagContext): Promise<boolean>;
}

/**
 * Environment Variable Backend
 * Reads feature flags from environment variables
 */
class EnvironmentVariableBackend implements FeatureFlagBackend {
  private prefix: string;

  constructor(prefix: string = 'FEATURE_') {
    this.prefix = prefix;
  }

  async getFlag(name: string): Promise<FeatureFlagConfig | null> {
    const envVar = `${this.prefix}${name.toUpperCase()}`;
    const value = process.env[envVar];
    
    if (value === undefined) {
      return null;
    }

    const enabled = value === 'true' || value === '1';
    
    return {
      name,
      enabled,
      description: `Feature flag from environment variable ${envVar}`,
      rolloutPercentage: enabled ? 100 : 0,
    };
  }

  async setFlag(name: string, config: FeatureFlagConfig): Promise<void> {
    // Environment variables are read-only at runtime
    throw new Error('Cannot set feature flags in environment variable backend');
  }

  async getAllFlags(): Promise<FeatureFlagConfig[]> {
    const flags: FeatureFlagConfig[] = [];
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix)) {
        const name = key.slice(this.prefix.length).toLowerCase();
        const enabled = value === 'true' || value === '1';
        
        flags.push({
          name,
          enabled,
          description: `Feature flag from environment variable ${key}`,
          rolloutPercentage: enabled ? 100 : 0,
        });
      }
    }
    
    return flags;
  }

  async isEnabled(name: string, context?: FeatureFlagContext): Promise<boolean> {
    const flag = await this.getFlag(name);
    if (!flag) {
      return false;
    }
    
    return this.evaluateFlag(flag, context);
  }

  private evaluateFlag(flag: FeatureFlagConfig, context?: FeatureFlagContext): boolean {
    if (!flag.enabled) {
      return false;
    }

    // Evaluate rollout percentage
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
      if (!context?.userId) {
        return false;
      }
      
      // Hash user ID to get consistent value
      const hash = this.hashString(context.userId);
      const percentage = (hash % 100) + 1;
      
      if (percentage > flag.rolloutPercentage) {
        return false;
      }
    }

    // Evaluate conditions
    if (flag.conditions && context) {
      for (const condition of flag.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    const value = this.getContextValue(condition.type, context);
    const valueStr = String(value ?? '');
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return valueStr.includes(String(condition.value));
      case 'not_contains':
        return !valueStr.includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(String(value));
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(String(value));
      default:
        return false;
    }
  }

  private getContextValue(type: string, context: FeatureFlagContext): unknown {
    switch (type) {
      case 'user_id':
        return context.userId;
      case 'user_segment':
        return context.userSegment;
      case 'environment':
        return context.environment;
      case 'custom':
        return context.customAttributes;
      default:
        return undefined;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    const strValue = String(str);
    for (let i = 0; i < strValue.length; i++) {
      const char = strValue.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * In-Memory Backend
 * Stores feature flags in memory (useful for testing and development)
 */
class InMemoryBackend implements FeatureFlagBackend {
  private flags: Map<string, FeatureFlagConfig> = new Map();

  async getFlag(name: string): Promise<FeatureFlagConfig | null> {
    return this.flags.get(name) || null;
  }

  async setFlag(name: string, config: FeatureFlagConfig): Promise<void> {
    this.flags.set(name, config);
  }

  async getAllFlags(): Promise<FeatureFlagConfig[]> {
    return Array.from(this.flags.values());
  }

  async isEnabled(name: string, context?: FeatureFlagContext): Promise<boolean> {
    const flag = await this.getFlag(name);
    if (!flag) {
      return false;
    }
    
    return this.evaluateFlag(flag, context);
  }

  private evaluateFlag(flag: FeatureFlagConfig, context?: FeatureFlagContext): boolean {
    if (!flag.enabled) {
      return false;
    }

    // Evaluate rollout percentage
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
      if (!context?.userId) {
        return false;
      }
      
      const hash = this.hashString(context.userId);
      const percentage = (hash % 100) + 1;
      
      if (percentage > flag.rolloutPercentage) {
        return false;
      }
    }

    // Evaluate conditions
    if (flag.conditions && context) {
      for (const condition of flag.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    const value = this.getContextValue(condition.type, context);
    const valueStr = String(value ?? '');
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return valueStr.includes(String(condition.value));
      case 'not_contains':
        return !valueStr.includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(String(value));
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(String(value));
      default:
        return false;
    }
  }

  private getContextValue(type: string, context: FeatureFlagContext): unknown {
    switch (type) {
      case 'user_id':
        return context.userId;
      case 'user_segment':
        return context.userSegment;
      case 'environment':
        return context.environment;
      case 'custom':
        return context.customAttributes;
      default:
        return undefined;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    const strValue = String(str);
    for (let i = 0; i < strValue.length; i++) {
      const char = strValue.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Feature Flags Manager
 * Main interface for interacting with feature flags
 */
export class FeatureFlagsManager {
  private backend: FeatureFlagBackend;
  private cache: Map<string, { flag: FeatureFlagConfig; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute cache

  constructor(backend: FeatureFlagBackend) {
    this.backend = backend;
  }

  /**
   * Check if a feature flag is enabled
   */
  async isEnabled(name: string, context?: FeatureFlagContext): Promise<boolean> {
    return this.backend.isEnabled(name, context);
  }

  /**
   * Get a feature flag configuration
   */
  async getFlag(name: string): Promise<FeatureFlagConfig | null> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.flag;
    }

    // Fetch from backend
    const flag = await this.backend.getFlag(name);
    if (flag) {
      this.cache.set(name, { flag, timestamp: Date.now() });
    }

    return flag;
  }

  /**
   * Set a feature flag configuration
   */
  async setFlag(name: string, config: FeatureFlagConfig): Promise<void> {
    await this.backend.setFlag(name, config);
    this.cache.set(name, { flag: config, timestamp: Date.now() });
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlagConfig[]> {
    return this.backend.getAllFlags();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }
}

/**
 * Create a feature flags manager with the specified backend
 */
export function createFeatureFlagsManager(
  backend: 'environment' | 'memory' | FeatureFlagBackend = 'environment'
): FeatureFlagsManager {
  let actualBackend: FeatureFlagBackend;

  if (backend === 'environment') {
    actualBackend = new EnvironmentVariableBackend();
  } else if (backend === 'memory') {
    actualBackend = new InMemoryBackend();
  } else {
    actualBackend = backend;
  }

  return new FeatureFlagsManager(actualBackend);
}

/**
 * Default feature flags manager instance
 */
export const featureFlags = createFeatureFlagsManager('environment');

/**
 * Convenience function to check if a feature is enabled
 */
export async function isFeatureEnabled(name: string, context?: FeatureFlagContext): Promise<boolean> {
  return featureFlags.isEnabled(name, context);
}
