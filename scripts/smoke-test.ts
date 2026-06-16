#!/usr/bin/env tsx
/**
 * Post-Deploy Smoke Tests for Paradigm Infinite
 * 
 * Quick verification tests to ensure the application is functioning correctly after deployment.
 * Tests critical endpoints, database connectivity, and basic functionality.
 */

import { performance } from 'perf_hooks';

// Configuration
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  retries: 3,
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Fetch with timeout and retry
 */
async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  for (let i = 0; i < config.retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === config.retries - 1) {
        throw error;
      }
      logWarning(`Retry ${i + 1}/${config.retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Test: Application Health Check
 */
async function testApplicationHealth(): Promise<void> {
  const startTime = performance.now();
  const testName = 'Application Health Check';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/api/health`);
    const data = await response.json();

    if (response.ok && data.status === 'healthy') {
      const duration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration });
      logSuccess(testName);
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Test: Substrate Health Check
 */
async function testSubstrateHealth(): Promise<void> {
  const startTime = performance.now();
  const testName = 'Substrate Health Check';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/api/substrate/health`);
    const data = await response.json();

    if (response.ok) {
      const duration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration });
      logSuccess(testName);
    } else {
      throw new Error(`Substrate health check failed: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Test: Domain List Endpoint
 */
async function testDomainList(): Promise<void> {
  const startTime = performance.now();
  const testName = 'Domain List Endpoint';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/api/domains`);
    const data = await response.json();

    if (response.ok && Array.isArray(data) && data.length > 0) {
      const duration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration });
      logSuccess(testName);
    } else {
      throw new Error(`Domain list endpoint failed: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Test: Seed Generation Endpoint
 */
async function testSeedGeneration(): Promise<void> {
  const startTime = performance.now();
  const testName = 'Seed Generation Endpoint';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/api/seeds/grow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        $domain: 'character',
        $version: '1.0.0',
        genes: {
          name: 'Test Character',
          description: 'A test character for smoke testing',
        },
      }),
    });

    if (response.ok) {
      const duration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration });
      logSuccess(testName);
    } else {
      const data = await response.json();
      throw new Error(`Seed generation failed: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Test: Metrics Endpoint
 */
async function testMetricsEndpoint(): Promise<void> {
  const startTime = performance.now();
  const testName = 'Metrics Endpoint';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/metrics`);

    if (response.ok) {
      const text = await response.text();
      if (text.includes('process_') || text.includes('http_')) {
        const duration = performance.now() - startTime;
        results.push({ name: testName, passed: true, duration });
        logSuccess(testName);
      } else {
        throw new Error('Metrics endpoint returned invalid data');
      }
    } else {
      throw new Error('Metrics endpoint returned non-200 status');
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Test: Static Assets
 */
async function testStaticAssets(): Promise<void> {
  const startTime = performance.now();
  const testName = 'Static Assets';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/`);

    if (response.ok) {
      const duration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration });
      logSuccess(testName);
    } else {
      throw new Error('Static assets endpoint failed');
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Test: CORS Headers
 */
async function testCorsHeaders(): Promise<void> {
  const startTime = performance.now();
  const testName = 'CORS Headers';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
      },
    });

    const corsHeaders = response.headers.get('Access-Control-Allow-Origin');
    if (corsHeaders) {
      const duration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration });
      logSuccess(testName);
    } else {
      throw new Error('CORS headers not found');
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Test: Response Time
 */
async function testResponseTime(): Promise<void> {
  const startTime = performance.now();
  const testName = 'Response Time';

  try {
    const start = performance.now();
    const response = await fetchWithRetry(`${config.baseUrl}/api/health`);
    const duration = performance.now() - start;

    if (response.ok && duration < 5000) { // 5 second threshold
      const testDuration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration: testDuration });
      logSuccess(`${testName} (${duration.toFixed(2)}ms)`);
    } else {
      throw new Error(`Response time too slow: ${duration}ms`);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

/**
 * Run all smoke tests
 */
async function runSmokeTests(): Promise<void> {
  logInfo('Starting smoke tests...');
  logInfo(`Base URL: ${config.baseUrl}`);
  logInfo(`Timeout: ${config.timeout}ms`);
  logInfo(`Retries: ${config.retries}`);
  log('');

  const totalStartTime = performance.now();

  // Run all tests
  await testApplicationHealth();
  await testSubstrateHealth();
  await testDomainList();
  await testSeedGeneration();
  await testMetricsEndpoint();
  await testStaticAssets();
  await testCorsHeaders();
  await testResponseTime();

  const totalDuration = performance.now() - totalStartTime;

  // Print summary
  log('');
  log('=== Smoke Test Summary ===', colors.blue);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`Total Duration: ${totalDuration.toFixed(2)}ms`);

  // Print individual results
  log('');
  log('=== Individual Results ===', colors.blue);
  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? colors.green : colors.red;
    log(`${status} ${result.name} (${result.duration.toFixed(2)}ms)`, color);
    if (result.error) {
      log(`  Error: ${result.error}`, colors.red);
    }
  }

  // Exit with appropriate code
  if (failed > 0) {
    log('', colors.red);
    log('Smoke tests failed!', colors.red);
    process.exit(1);
  } else {
    log('', colors.green);
    log('All smoke tests passed!', colors.green);
    process.exit(0);
  }
}

// Run tests
runSmokeTests().catch(error => {
  logError(`Fatal error: ${error}`);
  process.exit(1);
});
