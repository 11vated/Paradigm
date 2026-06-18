/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are set before server startup.
 * Prevents runtime failures due to missing configuration.
 * 
 * Phase 12.4: Environment Variable Validation
 * Date: 2026-06-18
 * 
 * Security: Production mode requires all security-critical variables.
 * Development mode allows fallbacks with warnings.
 */

/**
 * Required environment variables for production
 */
const REQUIRED_PRODUCTION_VARS = [
  'JWT_SECRET',
  'KEY_MANAGER_MASTER_KEY',
  'REDIS_URL',
  'DATABASE_URL',
] as const;

/**
 * Required environment variables for smart contract deployment
 */
const REQUIRED_CONTRACT_VARS = {
  mainnet: [
    'MAINNET_CREATOR_REWARDS_WALLET',
    'MAINNET_DAO_TREASURY_WALLET',
    'MAINNET_STAKING_REWARDS_WALLET',
    'MAINNET_TEAM_WALLET',
    'MAINNET_ECOSYSTEM_WALLET',
  ],
  sepolia: [
    'SEPOLIA_CREATOR_REWARDS_WALLET',
    'SEPOLIA_DAO_TREASURY_WALLET',
    'SEPOLIA_STAKING_REWARDS_WALLET',
    'SEPOLIA_TEAM_WALLET',
    'SEPOLIA_ECOSYSTEM_WALLET',
  ],
  mumbai: [
    'MUMBAI_CREATOR_REWARDS_WALLET',
    'MUMBAI_DAO_TREASURY_WALLET',
    'MUMBAI_STAKING_REWARDS_WALLET',
    'MUMBAI_TEAM_WALLET',
    'MUMBAI_ECOSYSTEM_WALLET',
  ],
} as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVEL: 'info',
  ALLOWED_ORIGINS: '',
  KEY_STORAGE_DIR: './data/keys',
} as const;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
}

/**
 * Validate JWT_SECRET strength
 */
function validateJWTSecret(secret: string | undefined): string | null {
  if (!secret) return 'JWT_SECRET is not set';
  
  if (secret.length < 32) {
    return 'JWT_SECRET must be at least 32 characters for security';
  }
  
  // Check for common weak secrets
  const weakSecrets = [
    'secret',
    'password',
    'changeme',
    'test',
    'development',
    'paradigm',
  ];
  
  if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
    return 'JWT_SECRET appears to be a weak/common value. Use a strong random string.';
  }
  
  return null;
}

/**
 * Validate KEY_MANAGER_MASTER_KEY strength
 */
function validateMasterKey(key: string | undefined): string | null {
  if (!key) return 'KEY_MANAGER_MASTER_KEY is not set';
  
  if (key.length < 32) {
    return 'KEY_MANAGER_MASTER_KEY must be at least 32 characters';
  }
  
  // Should be hex string for best practice
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    return 'KEY_MANAGER_MASTER_KEY should be a 64-character hex string (generate with: openssl rand -hex 32)';
  }
  
  return null;
}

/**
 * Validate DATABASE_URL format
 */
function validateDatabaseURL(url: string | undefined): string | null {
  if (!url) return 'DATABASE_URL is not set';
  
  // Check for common database URL patterns
  const validPatterns = [
    /^postgres:\/\//,
    /^postgresql:\/\//,
    /^mongodb:\/\//,
    /^mongodb\+srv:\/\//,
  ];
  
  if (!validPatterns.some(pattern => pattern.test(url))) {
    return 'DATABASE_URL does not match expected format (postgres:// or mongodb://)';
  }
  
  return null;
}

/**
 * Validate REDIS_URL format
 */
function validateRedisURL(url: string | undefined): string | null {
  if (!url) return 'REDIS_URL is not set';
  
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    return 'REDIS_URL must start with redis:// or rediss://';
  }
  
  return null;
}

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): ValidationResult {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];
  
  // Check required production variables
  if (isProd) {
    for (const varName of REQUIRED_PRODUCTION_VARS) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
  }
  
  // Validate JWT_SECRET
  const jwtError = validateJWTSecret(process.env.JWT_SECRET);
  if (jwtError) {
    if (isProd) {
      invalid.push(jwtError);
    } else {
      warnings.push(jwtError);
    }
  }
  
  // Validate KEY_MANAGER_MASTER_KEY
  const keyError = validateMasterKey(process.env.KEY_MANAGER_MASTER_KEY);
  if (keyError) {
    if (isProd) {
      invalid.push(keyError);
    } else {
      warnings.push(keyError);
    }
  }
  
  // Validate DATABASE_URL
  if (process.env.DATABASE_URL) {
    const dbError = validateDatabaseURL(process.env.DATABASE_URL);
    if (dbError) {
      invalid.push(dbError);
    }
  } else if (isProd) {
    missing.push('DATABASE_URL');
  }
  
  // Validate REDIS_URL
  if (process.env.REDIS_URL) {
    const redisError = validateRedisURL(process.env.REDIS_URL);
    if (redisError) {
      invalid.push(redisError);
    }
  } else if (isProd) {
    missing.push('REDIS_URL');
  }
  
  // Check optional variables and set defaults
  for (const [key, defaultValue] of Object.entries(OPTIONAL_VARS)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      if (isProd && key !== 'ALLOWED_ORIGINS') {
        warnings.push(`${key} not set, using default: ${defaultValue}`);
      }
    }
  }
  
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    warnings,
  };
}

/**
 * Validate contract deployment environment variables
 */
export function validateContractEnvironment(network: 'mainnet' | 'sepolia' | 'mumbai'): ValidationResult {
  const missing: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];
  
  const requiredVars = REQUIRED_CONTRACT_VARS[network];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value) {
      missing.push(varName);
      continue;
    }
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      invalid.push(`${varName} is not a valid Ethereum address: ${value}`);
    }
  }
  
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    warnings,
  };
}

/**
 * Display validation results
 */
function displayValidationResults(result: ValidationResult, context: string): void {
  if (result.valid) {
    console.log(`[CONFIG] ✓ ${context} validation passed`);
    
    if (result.warnings.length > 0) {
      console.warn(`[CONFIG] Warnings for ${context}:`);
      result.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
    }
    
    return;
  }
  
  console.error(`[CONFIG] ✗ ${context} validation failed`);
  
  if (result.missing.length > 0) {
    console.error('\nMissing required environment variables:');
    result.missing.forEach(varName => console.error(`  - ${varName}`));
  }
  
  if (result.invalid.length > 0) {
    console.error('\nInvalid environment variables:');
    result.invalid.forEach(error => console.error(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn('\nWarnings:');
    result.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }
}

/**
 * Validate and throw if invalid (for production startup)
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();
  
  displayValidationResults(result, 'Environment');
  
  if (!result.valid) {
    throw new Error(
      `Environment validation failed. See errors above.\n\n` +
      `Set missing variables in .env file or environment.\n` +
      `See .env.example for required variables.`
    );
  }
}

/**
 * Validate contract environment and throw if invalid
 */
export function validateContractEnvironmentOrThrow(network: 'mainnet' | 'sepolia' | 'mumbai'): void {
  const result = validateContractEnvironment(network);
  
  displayValidationResults(result, `${network} contract deployment`);
  
  if (!result.valid) {
    throw new Error(
      `Contract deployment validation failed for ${network}.\n\n` +
      `Set missing wallet addresses in .env file or environment.\n` +
      `See .env.production.example for required variables.`
    );
  }
}

/**
 * Get environment summary for logging
 */
export function getEnvironmentSummary(): Record<string, string> {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3000',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    DATABASE_URL: process.env.DATABASE_URL ? '***SET***' : 'NOT SET',
    REDIS_URL: process.env.REDIS_URL ? '***SET***' : 'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? '***SET***' : 'NOT SET',
    KEY_MANAGER_MASTER_KEY: process.env.KEY_MANAGER_MASTER_KEY ? '***SET***' : 'NOT SET',
  };
}

// Made with Bob
