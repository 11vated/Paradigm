#!/usr/bin/env node
/**
 * Paradigm — Automated Database Backup Script
 *
 * Creates timestamped JSON exports of all seeds and user data.
 * Designed to run via cron or scheduled task.
 *
 * Usage:
 *   node scripts/backup-database.mjs [--dir ./backups] [--max-backups 30]
 *
 * Environment:
 *   DATA_DIR — data directory (default: ./data)
 *   BACKUP_DIR — backup output directory (default: ./backups)
 *   MAX_BACKUPS — number of backups to retain (default: 30)
 *
 * Cron example (daily at 3 AM):
 *   0 3 * * * cd /app && node scripts/backup-database.mjs >> /var/log/paradigm-backup.log 2>&1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Parse CLI args ──────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),
    backupDir: process.env.BACKUP_DIR || path.join(ROOT, 'backups'),
    maxBackups: parseInt(process.env.MAX_BACKUPS || '30', 10),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) { opts.backupDir = args[++i]; }
    if (args[i] === '--data-dir' && args[i + 1]) { opts.dataDir = args[++i]; }
    if (args[i] === '--max-backups' && args[i + 1]) { opts.maxBackups = parseInt(args[++i], 10); }
  }

  return opts;
}

// ─── Logger ──────────────────────────────────────────────────────────────────
function log(level, msg, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'backup',
    message: msg,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// ─── Read all JSON files from data directory ─────────────────────────────────
function readDataFiles(dataDir) {
  const result = { seeds: [], users: [], meta: {} };

  if (!fs.existsSync(dataDir)) {
    log('WARN', 'Data directory does not exist', { dataDir });
    return result;
  }

  // Read seeds
  const seedsFile = path.join(dataDir, 'seeds.json');
  if (fs.existsSync(seedsFile)) {
    try {
      const raw = fs.readFileSync(seedsFile, 'utf-8');
      const seeds = JSON.parse(raw);
      result.seeds = Array.isArray(seeds) ? seeds : Object.values(seeds);
    } catch (e) {
      log('ERROR', 'Failed to read seeds.json', { error: e.message });
    }
  }

  // Read users
  const usersFile = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersFile)) {
    try {
      const raw = fs.readFileSync(usersFile, 'utf-8');
      const users = JSON.parse(raw);
      // Strip password hashes from backup for safety
      result.users = (Array.isArray(users) ? users : Object.values(users)).map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        created_at: u.created_at,
      }));
    } catch (e) {
      log('ERROR', 'Failed to read users.json', { error: e.message });
    }
  }

  // Read migration status
  const migrationsFile = path.join(dataDir, 'migrations.json');
  if (fs.existsSync(migrationsFile)) {
    try {
      result.meta.migrations = JSON.parse(fs.readFileSync(migrationsFile, 'utf-8'));
    } catch (_) { /* skip */ }
  }

  // Read audit log
  const auditFile = path.join(dataDir, 'audit.json');
  if (fs.existsSync(auditFile)) {
    try {
      const raw = fs.readFileSync(auditFile, 'utf-8');
      const entries = JSON.parse(raw);
      result.meta.auditEntryCount = Array.isArray(entries) ? entries.length : 0;
    } catch (_) { /* skip */ }
  }

  return result;
}

// ─── Create backup ───────────────────────────────────────────────────────────
function createBackup(data, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const filename = `paradigm-backup-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  const backup = {
    $backup: {
      version: '1.0',
      created_at: now.toISOString(),
      engine_version: '2.0.0',
      seed_count: data.seeds.length,
      user_count: data.users.length,
    },
    seeds: data.seeds,
    users: data.users,
    meta: data.meta,
  };

  const json = JSON.stringify(backup, null, 2);

  // Compute checksum
  const checksum = crypto.createHash('sha256').update(json).digest('hex');
  backup.$backup.checksum_sha256 = checksum;

  const finalJson = JSON.stringify(backup, null, 2);
  fs.writeFileSync(filepath, finalJson, 'utf-8');

  return { filepath, filename, size: Buffer.byteLength(finalJson), checksum };
}

// ─── Prune old backups ───────────────────────────────────────────────────────
function pruneBackups(backupDir, maxBackups) {
  if (!fs.existsSync(backupDir)) return 0;

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('paradigm-backup-') && f.endsWith('.json'))
    .sort()
    .reverse(); // newest first

  let pruned = 0;
  if (files.length > maxBackups) {
    const toRemove = files.slice(maxBackups);
    for (const file of toRemove) {
      fs.unlinkSync(path.join(backupDir, file));
      pruned++;
    }
  }

  return pruned;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  log('INFO', 'Starting database backup', {
    dataDir: opts.dataDir,
    backupDir: opts.backupDir,
    maxBackups: opts.maxBackups,
  });

  // Read data
  const data = readDataFiles(opts.dataDir);
  log('INFO', 'Data collected', {
    seeds: data.seeds.length,
    users: data.users.length,
  });

  if (data.seeds.length === 0 && data.users.length === 0) {
    log('WARN', 'No data to backup — skipping');
    process.exit(0);
  }

  // Create backup
  const result = createBackup(data, opts.backupDir);
  log('INFO', 'Backup created', {
    file: result.filename,
    size_bytes: result.size,
    size_mb: (result.size / 1024 / 1024).toFixed(2),
    checksum: result.checksum,
  });

  // Prune old backups
  const pruned = pruneBackups(opts.backupDir, opts.maxBackups);
  if (pruned > 0) {
    log('INFO', 'Old backups pruned', { pruned, retained: opts.maxBackups });
  }

  const elapsed = Date.now() - startTime;
  log('INFO', 'Backup completed', {
    elapsed_ms: elapsed,
    seeds: data.seeds.length,
    file: result.filename,
  });
}

main().catch(err => {
  log('ERROR', 'Backup failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
