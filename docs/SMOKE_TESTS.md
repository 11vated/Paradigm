# Smoke Tests Guide

This guide covers the post-deployment smoke tests for Paradigm Infinite, which verify that the application is functioning correctly after deployment.

## Overview

Smoke tests are quick verification tests that ensure the basic functionality of the application is working after deployment. They test critical endpoints, database connectivity, and core functionality to catch deployment issues early.

## Running Smoke Tests

### Local Development

```bash
# Run smoke tests against local development server
npm run smoke:test

# Run with custom base URL
BASE_URL=http://localhost:3000 npm run smoke:test
```

### Staging/Production

```bash
# Run against staging environment
BASE_URL=http://staging.paradigm.local:8080 npm run smoke:test

# Run against production environment
BASE_URL=https://paradigm.local npm run smoke:test
```

### CI/CD Integration

```bash
# Run smoke tests after deployment
npm run smoke:test
```

## Test Coverage

The smoke test suite includes the following tests:

### 1. Application Health Check
- **Endpoint**: `/api/health`
- **Purpose**: Verify the application is running and healthy
- **Expected**: HTTP 200 with `{"status": "healthy"}`

### 2. Substrate Health Check
- **Endpoint**: `/api/substrate/health`
- **Purpose**: Verify the substrate (kernel, generators, etc.) is healthy
- **Expected**: HTTP 200 with substrate status information

### 3. Domain List Endpoint
- **Endpoint**: `/api/domains`
- **Purpose**: Verify the domain registry is accessible
- **Expected**: HTTP 200 with array of domain names

### 4. Seed Generation Endpoint
- **Endpoint**: `/api/seeds/grow` (POST)
- **Purpose**: Verify seed generation functionality
- **Expected**: HTTP 200 with generated seed artifact

### 5. Metrics Endpoint
- **Endpoint**: `/metrics`
- **Purpose**: Verify Prometheus metrics are available
- **Expected**: HTTP 200 with Prometheus metrics format

### 6. Static Assets
- **Endpoint**: `/`
- **Purpose**: Verify static file serving is working
- **Expected**: HTTP 200 with HTML content

### 7. CORS Headers
- **Endpoint**: `/api/health` (OPTIONS)
- **Purpose**: Verify CORS headers are configured correctly
- **Expected**: CORS headers present in response

### 8. Response Time
- **Endpoint**: `/api/health`
- **Purpose**: Verify response times are acceptable
- **Expected**: Response time < 5 seconds

## Configuration

Smoke tests can be configured via environment variables:

- `BASE_URL`: Base URL of the application (default: `http://localhost:3000`)
- `TIMEOUT`: Request timeout in milliseconds (default: `30000`)
- `RETRIES`: Number of retry attempts for failed requests (default: `3`)

## Example Output

```
ℹ Starting smoke tests...
ℹ Base URL: http://localhost:3000
ℹ Timeout: 30000ms
ℹ Retries: 3

✓ Application Health Check
✓ Substrate Health Check
✓ Domain List Endpoint
✓ Seed Generation Endpoint
✓ Metrics Endpoint
✓ Static Assets
✓ CORS Headers
✓ Response Time (234.56ms)

=== Smoke Test Summary ===
Total Tests: 8
Passed: 8
Failed: 0
Total Duration: 1234.56ms

=== Individual Results ===
✓ Application Health Check (123.45ms)
✓ Substrate Health Check (234.56ms)
✓ Domain List Endpoint (345.67ms)
✓ Seed Generation Endpoint (456.78ms)
✓ Metrics Endpoint (567.89ms)
✓ Static Assets (678.90ms)
✓ CORS Headers (789.01ms)
✓ Response Time (890.12ms)

All smoke tests passed!
```

## Failure Scenarios

### Application Not Running
```
✗ Application Health Check: fetch failed
✗ Substrate Health Check: fetch failed
...
Smoke tests failed!
```

**Solution**: Start the application server before running smoke tests.

### Database Connection Issues
```
✓ Application Health Check
✗ Substrate Health Check: Database connection failed
...
```

**Solution**: Verify database is running and connection string is correct.

### Slow Response Times
```
✗ Response Time: Response time too slow: 6000ms
```

**Solution**: Investigate performance issues, check resource usage, optimize database queries.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy and Smoke Test

on:
  push:
    branches: [main]

jobs:
  deploy-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Deployment commands
          ./scripts/deploy.sh
      
      - name: Wait for deployment
        run: sleep 30
      
      - name: Run smoke tests
        run: |
          BASE_URL=https://paradigm.local npm run smoke:test
```

### Docker Compose Integration

```yaml
version: '3.8'
services:
  app:
    # ... app configuration
    healthcheck:
      test: ["CMD", "npm", "run", "smoke:test"]
      interval: 30s
      timeout: 30s
      retries: 3
```

## Troubleshooting

### Connection Refused
**Error**: `fetch failed` or `ECONNREFUSED`

**Solutions**:
- Verify the application is running
- Check the BASE_URL is correct
- Ensure firewall rules allow connections

### Timeout Errors
**Error**: `AbortError: The operation was aborted`

**Solutions**:
- Increase TIMEOUT environment variable
- Check application performance
- Verify network connectivity

### Authentication Errors
**Error**: `401 Unauthorized` or `403 Forbidden`

**Solutions**:
- Verify authentication credentials
- Check API key configuration
- Ensure proper permissions

## Best Practices

1. **Run After Every Deployment**: Always run smoke tests after deploying to any environment
2. **Automate in CI/CD**: Integrate smoke tests into your deployment pipeline
3. **Monitor Failures**: Set up alerts for smoke test failures
4. **Keep Tests Fast**: Smoke tests should complete within 1-2 minutes
5. **Test Critical Paths**: Focus on the most important functionality
6. **Update Regularly**: Keep smoke tests updated as the application evolves

## Extending Smoke Tests

To add new smoke tests, edit `scripts/smoke-test.ts`:

```typescript
async function testNewFeature(): Promise<void> {
  const startTime = performance.now();
  const testName = 'New Feature Test';

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/api/new-feature`);
    
    if (response.ok) {
      const duration = performance.now() - startTime;
      results.push({ name: testName, passed: true, duration });
      logSuccess(testName);
    } else {
      throw new Error('New feature test failed');
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({ name: testName, passed: false, duration, error: String(error) });
    logError(`${testName}: ${error}`);
  }
}

// Add to runSmokeTests function
await testNewFeature();
```

## Next Steps

- [ ] Integrate smoke tests into CI/CD pipeline
- [ ] Set up alerts for smoke test failures
- [ ] Add smoke tests for additional critical endpoints
- [ ] Configure smoke tests for staging environment
- [ ] Add performance benchmarks to smoke tests
