/**
 * Backup Manager
 * Provides automated backup and restore for:
 * - PostgreSQL database
 * - Redis cache
 * - Seed data (JSON files)
 * - Configurations
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';
import { getSecretsManager } from '../security/secrets-manager.js';

const execAsync = promisify(exec);

export interface BackupConfig {
  backupDir: string;
  retentionDays: number;
  s3Bucket?: string;
  s3Region?: string;
  s3Prefix?: string;
  compression: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: Date;
  components: {
    postgresql?: { success: boolean; size: number; path: string };
    redis?: { success: boolean; size: number; path: string };
    seeds?: { success: boolean; size: number; path: string };
    config?: { success: boolean; size: number; path: string };
  };
  totalSize: number;
  duration: number;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  components: {
    postgresql?: { success: boolean; error?: string };
    redis?: { success: boolean; error?: string };
    seeds?: { success: boolean; error?: string };
    config?: { success: boolean; error?: string };
  };
  duration: number;
}

export class BackupManager {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      backupDir: config.backupDir || process.env.BACKUP_DIR || './backups',
      retentionDays: config.retentionDays || 30,
      s3Bucket: config.s3Bucket || process.env.AWS_S3_BUCKET,
      s3Region: config.s3Region || process.env.AWS_REGION || 'us-east-1',
      s3Prefix: config.s3Prefix || 'paradigm-backups',
      compression: config.compression !== false,
    };
  }

  /**
   * Generate a unique backup ID
   */
  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = crypto.randomBytes(4).toString('hex');
    return `backup-${timestamp}-${random}`;
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDir(): Promise<void> {
    await fs.mkdir(this.config.backupDir, { recursive: true });
  }

  /**
   * Backup PostgreSQL database
   */
  private async backupPostgreSQL(backupId: string): Promise<{ success: boolean; size: number; path: string }> {
    try {
      const databaseUrl = await getSecretsManager().get('DATABASE_URL');
      if (!databaseUrl) {
        console.warn('DATABASE_URL not found, skipping PostgreSQL backup');
        return { success: false, size: 0, path: '' };
      }

      const backupPath = path.join(this.config.backupDir, `${backupId}-postgresql.sql`);
      
      // Use pg_dump to backup database
      const command = `pg_dump "${databaseUrl}" > "${backupPath}"`;
      await execAsync(command);

      // Compress if enabled
      if (this.config.compression) {
        const compressedPath = `${backupPath}.gz`;
        await execAsync(`gzip "${backupPath}"`);
        const stats = await fs.stat(compressedPath);
        return { success: true, size: stats.size, path: compressedPath };
      }

      const stats = await fs.stat(backupPath);
      return { success: true, size: stats.size, path: backupPath };
    } catch (error) {
      console.error('PostgreSQL backup failed:', error);
      return { success: false, size: 0, path: '' };
    }
  }

  /**
   * Backup Redis cache
   */
  private async backupRedis(backupId: string): Promise<{ success: boolean; size: number; path: string }> {
    try {
      const redisUrl = await getSecretsManager().get('REDIS_URL');
      if (!redisUrl) {
        console.warn('REDIS_URL not found, skipping Redis backup');
        return { success: false, size: 0, path: '' };
      }

      const backupPath = path.join(this.config.backupDir, `${backupId}-redis.rdb`);
      
      // Use redis-cli to trigger SAVE and copy the RDB file
      // Note: This requires the Redis server to be configured with a save directory
      const redisHost = new URL(redisUrl).hostname;
      const redisPort = new URL(redisUrl).port || '6379';
      
      await execAsync(`redis-cli -h ${redisHost} -p ${redisPort} SAVE`);
      
      // Copy RDB file from Redis data directory (assuming default location)
      // In production, this should be configured via environment variable
      const redisDataDir = process.env.REDIS_DATA_DIR || '/var/lib/redis';
      const rdbSource = path.join(redisDataDir, 'dump.rdb');
      
      try {
        await fs.copyFile(rdbSource, backupPath);
        const stats = await fs.stat(backupPath);
        
        if (this.config.compression) {
          const compressedPath = `${backupPath}.gz`;
          await execAsync(`gzip "${backupPath}"`);
          const compressedStats = await fs.stat(compressedPath);
          return { success: true, size: compressedStats.size, path: compressedPath };
        }
        
        return { success: true, size: stats.size, path: backupPath };
      } catch {
        console.warn('Could not copy Redis RDB file, skipping');
        return { success: false, size: 0, path: '' };
      }
    } catch (error) {
      console.error('Redis backup failed:', error);
      return { success: false, size: 0, path: '' };
    }
  }

  /**
   * Backup seed data
   */
  private async backupSeeds(backupId: string): Promise<{ success: boolean; size: number; path: string }> {
    try {
      const seedDataDir = process.env.SEED_DATA_DIR || './data/seeds';
      const backupPath = path.join(this.config.backupDir, `${backupId}-seeds.tar.gz`);
      
      // Create tar.gz archive of seed data
      await execAsync(`tar -czf "${backupPath}" -C "${seedDataDir}" .`);
      
      const stats = await fs.stat(backupPath);
      return { success: true, size: stats.size, path: backupPath };
    } catch (error) {
      console.error('Seed data backup failed:', error);
      return { success: false, size: 0, path: '' };
    }
  }

  /**
   * Backup configuration files
   */
  private async backupConfig(backupId: string): Promise<{ success: boolean; size: number; path: string }> {
    try {
      const configFiles = ['.env', 'docker-compose.yml', 'Caddyfile'];
      const backupPath = path.join(this.config.backupDir, `${backupId}-config.tar.gz`);
      
      // Create tar.gz archive of config files
      const fileList = configFiles.filter(f => {
        try {
          return fs.access(f).then(() => true).catch(() => false);
        } catch {
          return false;
        }
      });
      
      if (fileList.length === 0) {
        return { success: false, size: 0, path: '' };
      }
      
      await execAsync(`tar -czf "${backupPath}" ${fileList.join(' ')}`);
      
      const stats = await fs.stat(backupPath);
      return { success: true, size: stats.size, path: backupPath };
    } catch (error) {
      console.error('Config backup failed:', error);
      return { success: false, size: 0, path: '' };
    }
  }

  /**
   * Upload backup to S3 (optional)
   */
  private async uploadToS3(backupId: string, files: string[]): Promise<void> {
    if (!this.config.s3Bucket) {
      console.log('S3 bucket not configured, skipping upload');
      return;
    }

    try {
      // @ts-ignore - Optional dependency
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({ region: this.config.s3Region });
      
      for (const file of files) {
        const fileName = path.basename(file);
        const key = `${this.config.s3Prefix}/${backupId}/${fileName}`;
        
        const fileContent = await fs.readFile(file);
        
        const command = new PutObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: key,
          Body: fileContent,
        });
        
        await s3Client.send(command);
        console.log(`Uploaded ${fileName} to S3`);
      }
    } catch (error) {
      console.warn('S3 upload failed:', error);
    }
  }

  /**
   * Perform full backup
   */
  async backup(): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId();
    
    await this.ensureBackupDir();
    
    console.log(`Starting backup: ${backupId}`);
    
    const components: BackupResult['components'] = {};
    const filesToUpload: string[] = [];
    
    // Backup PostgreSQL
    const pgResult = await this.backupPostgreSQL(backupId);
    components.postgresql = pgResult;
    if (pgResult.success) filesToUpload.push(pgResult.path);
    
    // Backup Redis
    const redisResult = await this.backupRedis(backupId);
    components.redis = redisResult;
    if (redisResult.success) filesToUpload.push(redisResult.path);
    
    // Backup seed data
    const seedsResult = await this.backupSeeds(backupId);
    components.seeds = seedsResult;
    if (seedsResult.success) filesToUpload.push(seedsResult.path);
    
    // Backup config
    const configResult = await this.backupConfig(backupId);
    components.config = configResult;
    if (configResult.success) filesToUpload.push(configResult.path);
    
    // Upload to S3 if configured
    await this.uploadToS3(backupId, filesToUpload);
    
    // Calculate total size
    const totalSize = Object.values(components).reduce((sum, comp) => sum + (comp?.size || 0), 0);
    
    const duration = Date.now() - startTime;
    
    console.log(`Backup completed: ${backupId} (${(totalSize / 1024 / 1024).toFixed(2)} MB in ${(duration / 1000).toFixed(2)}s)`);
    
    return {
      success: true,
      backupId,
      timestamp: new Date(),
      components,
      totalSize,
      duration,
    };
  }

  /**
   * Restore from backup
   */
  async restore(backupId: string): Promise<RestoreResult> {
    const startTime = Date.now();
    
    console.log(`Starting restore: ${backupId}`);
    
    const components: RestoreResult['components'] = {};
    
    // Restore PostgreSQL
    const pgPath = path.join(this.config.backupDir, `${backupId}-postgresql.sql${this.config.compression ? '.gz' : ''}`);
    if (await this.fileExists(pgPath)) {
      try {
        const databaseUrl = await getSecretsManager().get('DATABASE_URL');
        if (databaseUrl) {
          if (this.config.compression) {
            await execAsync(`gunzip -c "${pgPath}" | psql "${databaseUrl}"`);
          } else {
            await execAsync(`psql "${databaseUrl}" < "${pgPath}"`);
          }
          components.postgresql = { success: true };
        }
      } catch (error) {
        components.postgresql = { success: false, error: (error as Error).message };
      }
    }
    
    // Restore Redis
    const redisPath = path.join(this.config.backupDir, `${backupId}-redis.rdb${this.config.compression ? '.gz' : ''}`);
    if (await this.fileExists(redisPath)) {
      try {
        const redisDataDir = process.env.REDIS_DATA_DIR || '/var/lib/redis';
        const rdbDest = path.join(redisDataDir, 'dump.rdb');
        
        if (this.config.compression) {
          await execAsync(`gunzip -c "${redisPath}" > "${rdbDest}"`);
        } else {
          await fs.copyFile(redisPath, rdbDest);
        }
        
        // Restart Redis to load the new RDB file
        const redisHost = new URL((await getSecretsManager().get('REDIS_URL') || 'redis://localhost')).hostname;
        await execAsync(`redis-cli -h ${redisHost} SHUTDOWN NOSAVE`);
        
        components.redis = { success: true };
      } catch (error) {
        components.redis = { success: false, error: (error as Error).message };
      }
    }
    
    // Restore seed data
    const seedsPath = path.join(this.config.backupDir, `${backupId}-seeds.tar.gz`);
    if (await this.fileExists(seedsPath)) {
      try {
        const seedDataDir = process.env.SEED_DATA_DIR || './data/seeds';
        await execAsync(`tar -xzf "${seedsPath}" -C "${seedDataDir}"`);
        components.seeds = { success: true };
      } catch (error) {
        components.seeds = { success: false, error: (error as Error).message };
      }
    }
    
    // Restore config
    const configPath = path.join(this.config.backupDir, `${backupId}-config.tar.gz`);
    if (await this.fileExists(configPath)) {
      try {
        await execAsync(`tar -xzf "${configPath}"`);
        components.config = { success: true };
      } catch (error) {
        components.config = { success: false, error: (error as Error).message };
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`Restore completed: ${backupId} (${(duration / 1000).toFixed(2)}s)`);
    
    return {
      success: true,
      backupId,
      components,
      duration,
    };
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    try {
      await this.ensureBackupDir();
      const files = await fs.readdir(this.config.backupDir);
      
      // Extract backup IDs from filenames
      const backupIds = new Set<string>();
      for (const file of files) {
        const match = file.match(/backup-[\d-]+-[a-f0-9]+/);
        if (match) {
          backupIds.add(match[0]);
        }
      }
      
      return Array.from(backupIds).sort().reverse();
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      
      for (const backupId of backups) {
        const backupDate = new Date(backupId.split('-')[1]);
        if (backupDate < cutoffDate) {
          console.log(`Deleting old backup: ${backupId}`);
          await this.deleteBackup(backupId);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      await this.ensureBackupDir();
      const files = await fs.readdir(this.config.backupDir);
      
      for (const file of files) {
        if (file.startsWith(backupId)) {
          const filePath = path.join(this.config.backupDir, file);
          await fs.unlink(filePath);
          console.log(`Deleted: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let backupManagerInstance: BackupManager | null = null;

export function getBackupManager(config?: Partial<BackupConfig>): BackupManager {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager(config);
  }
  return backupManagerInstance;
}
