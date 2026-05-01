/**
 * Package script for Paradigm GSPL Platform
 * Creates distributable packages for different platforms
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PACKAGE_JSON = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const VERSION = PACKAGE_JSON.version;
const APP_NAME = 'paradigm-gspl';

type Platform = 'win' | 'mac' | 'linux' | 'all';

interface PackageOptions {
  platform: Platform;
  format: 'zip' | 'tar.gz' | 'exe' | 'dmg' | 'appimage';
  includeNode?: boolean;
}

async function packageApp(options: PackageOptions) {
  console.log(`Packaging ${APP_NAME} v${VERSION} for ${options.platform}...`);
  
  // 1. Build the app
  console.log('1. Building production bundle...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 2. Create package directory
  const packageDir = `dist/package-${options.platform}`;
  if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true });
  }
  fs.mkdirSync(packageDir, { recursive: true });
  
  // 3. Copy dist files
  console.log('2. Copying files...');
  copyDir('dist', `${packageDir}/app`);
  
  // 4. Create launcher script
  console.log('3. Creating launcher...');
  createLauncher(packageDir, options.platform);
  
  // 5. Copy server and required files
  console.log('4. Copying server files...');
  const filesToCopy = ['server.ts', 'package.json', 'tsconfig.json'];
  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, `${packageDir}/${file}`);
    }
  });
  
  // 6. Install production dependencies
  console.log('5. Installing dependencies...');
  execSync('npm install --production', {
    cwd: packageDir,
    stdio: 'inherit'
  });
  
  // 7. Create archive
  console.log(`6. Creating ${options.format} archive...`);
  createArchive(packageDir, options);
  
  console.log(`\n✓ Package created: ${APP_NAME}-v${VERSION}-${options.platform}.${options.format}`);
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createLauncher(packageDir: string, platform: Platform) {
  if (platform === 'win') {
    const bat = `@echo off
echo Starting Paradigm GSPL Platform...
cd /d "%~dp0"
node server.js
`;
    fs.writeFileSync(`${packageDir}/start.bat`, bat);
  } else {
    const sh = `#!/bin/bash
echo "Starting Paradigm GSPL Platform..."
cd "$(dirname "$0")"
node server.js
`;
    fs.writeFileSync(`${packageDir}/start.sh`, sh);
    fs.chmodSync(`${packageDir}/start.sh`, '755');
  }
}

function createArchive(packageDir: string, options: PackageOptions) {
  const archiveName = `${APP_NAME}-v${VERSION}-${options.platform}`;
  
  try {
    if (options.format === 'zip') {
      execSync(`powershell Compress-Archive -Path "${packageDir}/*" -DestinationPath "dist/${archiveName}.zip"`, {
        stdio: 'inherit'
      });
    } else if (options.format === 'tar.gz') {
      execSync(`tar -czf "dist/${archiveName}.tar.gz" -C dist "package-${options.platform}"`, {
        stdio: 'inherit'
      });
    }
  } catch (err) {
    console.error('Archive creation failed:', err);
  }
}

// CLI interface
const args = process.argv.slice(2);
const platform = (args[0] || 'win') as Platform;

const packageOptions: Record<Platform, PackageOptions> = {
  win: { platform: 'win', format: 'zip' },
  mac: { platform: 'mac', format: 'tar.gz' },
  linux: { platform: 'linux', format: 'tar.gz' },
  all: { platform: 'all', format: 'zip' },
};

async function main() {
  if (platform === 'all') {
    await packageApp({ platform: 'win', format: 'zip' });
    await packageApp({ platform: 'mac', format: 'tar.gz' });
    await packageApp({ platform: 'linux', format: 'tar.gz' });
  } else {
    await packageApp(packageOptions[platform]);
  }
}

main().catch(console.error);
