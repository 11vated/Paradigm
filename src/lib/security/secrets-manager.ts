/**
 * Secrets Manager
 * Provides unified interface for secrets storage with multiple backends:
 * - Environment variables (default, always available)
 * - HashiCorp Vault (optional, for production)
 * - AWS Secrets Manager (optional, for production)
 */

export interface SecretBackend {
  name: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  list(): Promise<string[]>;
}

// Type for optional Vault client
type VaultClient = {
  read(path: string): Promise<{ data: { data: { value: string } } }>;
  write(path: string, data: { data: { value: string } }): Promise<void>;
  list(path: string): Promise<{ data: { keys: string[] } }>;
} | null;

// Type for optional AWS Secrets Manager client
type AWSSecretsClient = {
  send(command: any): Promise<any>;
} | null;

/**
 * Environment variable backend (always available)
 */
class EnvBackend implements SecretBackend {
  name = 'env';

  async get(key: string): Promise<string | null> {
    return process.env[key] || null;
  }

  async set(key: string, value: string): Promise<void> {
    process.env[key] = value;
  }

  async list(): Promise<string[]> {
    return Object.keys(process.env);
  }
}

/**
 * HashiCorp Vault backend (optional)
 */
class VaultBackend implements SecretBackend {
  name = 'vault';
  private client: VaultClient = null;
  private mounted = false;

  constructor(private vaultAddr: string, private vaultToken: string, private secretPath: string = 'secret') {
    // Lazy load node-vault-client
  }

  private async ensureClient(): Promise<void> {
    if (this.mounted) return;

    try {
      // Dynamic import to avoid dependency if not used
      // @ts-ignore - Optional dependency
      const { NodeVaultClient } = await import('node-vault-client');
      this.client = new NodeVaultClient({
        endpoint: this.vaultAddr,
        token: this.vaultToken,
      });
      this.mounted = true;
    } catch (error) {
      console.warn('Vault client not available, falling back to env vars:', error);
      this.mounted = false;
    }
  }

  async get(key: string): Promise<string | null> {
    await this.ensureClient();
    if (!this.client) return null;

    try {
      const result = await this.client.read(`${this.secretPath}/${key}`);
      return result?.data?.data?.value || null;
    } catch (error) {
      console.warn(`Failed to read secret ${key} from Vault:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureClient();
    if (!this.client) {
      throw new Error('Vault client not available');
    }

    await this.client.write(`${this.secretPath}/${key}`, { data: { value } });
  }

  async list(): Promise<string[]> {
    await this.ensureClient();
    if (!this.client) return [];

    try {
      const result = await this.client.list(this.secretPath);
      return result?.data?.keys || [];
    } catch (error) {
      console.warn('Failed to list secrets from Vault:', error);
      return [];
    }
  }
}

/**
 * AWS Secrets Manager backend (optional)
 */
class AWSSecretsBackend implements SecretBackend {
  name = 'aws';
  private client: AWSSecretsClient = null;
  private mounted = false;

  constructor(
    private region: string = process.env.AWS_REGION || 'us-east-1',
    private prefix: string = '/paradigm'
  ) {
    // Lazy load @aws-sdk/client-secrets-manager
  }

  private async ensureClient(): Promise<void> {
    if (this.mounted) return;

    try {
      // @ts-ignore - Optional dependency
      const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');
      this.client = new SecretsManagerClient({ region: this.region });
      this.mounted = true;
    } catch (error) {
      console.warn('AWS Secrets Manager client not available, falling back to env vars:', error);
      this.mounted = false;
    }
  }

  async get(key: string): Promise<string | null> {
    await this.ensureClient();
    if (!this.client) return null;

    try {
      // @ts-ignore - Optional dependency
      const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      const command = new GetSecretValueCommand({
        SecretId: `${this.prefix}/${key}`,
      });
      const response = await this.client.send(command);
      return response.SecretString || null;
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') {
        return null;
      }
      console.warn(`Failed to read secret ${key} from AWS Secrets Manager:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureClient();
    if (!this.client) {
      throw new Error('AWS Secrets Manager client not available');
    }

    // @ts-ignore - Optional dependency
    const { CreateSecretCommand, UpdateSecretCommand } = await import('@aws-sdk/client-secrets-manager');
    const secretId = `${this.prefix}/${key}`;

    try {
      // Try to update first
      const updateCommand = new UpdateSecretCommand({
        SecretId: secretId,
        SecretString: value,
      });
      await this.client.send(updateCommand);
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') {
        // Create if doesn't exist
        const createCommand = new CreateSecretCommand({
          Name: secretId,
          SecretString: value,
        });
        await this.client.send(createCommand);
      } else {
        throw error;
      }
    }
  }

  async list(): Promise<string[]> {
    await this.ensureClient();
    if (!this.client) return [];

    try {
      // @ts-ignore - Optional dependency
      const { ListSecretsCommand } = await import('@aws-sdk/client-secrets-manager');
      const command = new ListSecretsCommand({
        Filters: [
          {
            Key: 'name',
            Values: [`${this.prefix}/`],
          },
        ],
      });
      const response = await this.client.send(command);
      return (response.SecretList || [])
        .map((s: { Name?: string }) => s.Name?.replace(`${this.prefix}/`, ''))
        .filter(Boolean) as string[];
    } catch (error) {
      console.warn('Failed to list secrets from AWS Secrets Manager:', error);
      return [];
    }
  }
}

/**
 * Unified Secrets Manager
 * Chains multiple backends with fallback order
 */
export class SecretsManager {
  private backends: SecretBackend[] = [];

  constructor() {
    // Always include env backend as fallback
    this.backends.push(new EnvBackend());

    // Add Vault if configured
    if (process.env.VAULT_ADDR && process.env.VAULT_TOKEN) {
      this.backends.push(new VaultBackend(
        process.env.VAULT_ADDR,
        process.env.VAULT_TOKEN,
        process.env.VAULT_SECRET_PATH || 'secret'
      ));
    }

    // Add AWS Secrets Manager if configured
    if (process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID) {
      this.backends.push(new AWSSecretsBackend(
        process.env.AWS_REGION,
        process.env.AWS_SECRET_PREFIX || '/paradigm'
      ));
    }
  }

  /**
   * Get a secret value, trying backends in order
   */
  async get(key: string): Promise<string | null> {
    for (const backend of this.backends) {
      const value = await backend.get(key);
      if (value !== null) {
        return value;
      }
    }
    return null;
  }

  /**
   * Set a secret value (writes to first writable backend)
   */
  async set(key: string, value: string): Promise<void> {
    // Write to the first non-env backend if available
    for (const backend of this.backends) {
      if (backend.name !== 'env') {
        await backend.set(key, value);
        return;
      }
    }
    // Fallback to env
    await this.backends[0].set(key, value);
  }

  /**
   * List all secret keys
   */
  async list(): Promise<string[]> {
    const keys = new Set<string>();
    for (const backend of this.backends) {
      const backendKeys = await backend.list();
      backendKeys.forEach(k => keys.add(k));
    }
    return Array.from(keys);
  }

  /**
   * Get required secret or throw error
   */
  async getRequired(key: string): Promise<string> {
    const value = await this.get(key);
    if (!value) {
      throw new Error(`Required secret ${key} not found in any backend`);
    }
    return value;
  }

  /**
   * Get secret with default fallback
   */
  async getWithDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.get(key);
    return value || defaultValue;
  }

  /**
   * Check if secret exists
   */
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
}

// Singleton instance
let secretsManagerInstance: SecretsManager | null = null;

export function getSecretsManager(): SecretsManager {
  if (!secretsManagerInstance) {
    secretsManagerInstance = new SecretsManager();
  }
  return secretsManagerInstance;
}

// Convenience functions
export async function getSecret(key: string): Promise<string | null> {
  return getSecretsManager().get(key);
}

export async function getRequiredSecret(key: string): Promise<string> {
  return getSecretsManager().getRequired(key);
}

export async function setSecret(key: string, value: string): Promise<void> {
  return getSecretsManager().set(key, value);
}
