# Load Testing Guide

This guide covers load testing for Paradigm Infinite using k6, a modern load testing tool.

## Overview

Load testing verifies that the application can handle expected traffic and helps identify performance bottlenecks before they affect users. We use k6 for load testing due to its developer-friendly scripting and powerful features.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6

# Or download from https://k6.io/
```

## Running Load Tests

### Smoke Test

Light load test to verify basic functionality:

```bash
# Run against local development server
npm run load:test:smoke

# Run against staging environment
BASE_URL=http://staging.paradigm.local:8080 npm run load:test:smoke

# Run against production environment
BASE_URL=https://paradigm.local npm run load:test:smoke
```

**Configuration:**
- Duration: 2 minutes
- Max users: 10
- Thresholds: 95% of requests < 500ms, error rate < 5%

### Load Test

Comprehensive load test simulating realistic user behavior:

```bash
# Run load test
npm run load:test:load

# Run with custom base URL
BASE_URL=http://localhost:3000 npm run load:test:load
```

**Configuration:**
- Duration: 18 minutes
- Max users: 200
- Thresholds: 95% of requests < 1s, error rate < 2%

### Stress Test

Stress test to find the breaking point:

```bash
# Run stress test
npm run load:test:stress

# Run with custom base URL
BASE_URL=http://localhost:3000 npm run load:test:stress
```

**Configuration:**
- Duration: 15 minutes
- Max users: 1000
- Thresholds: 95% of requests < 2s, error rate < 10%

## Test Scenarios

### Smoke Test (`load-tests/smoke-test.js`)

Tests basic endpoints with low load:
- Health check endpoint
- Domain list endpoint
- Static assets

**Use case:** Quick verification after deployment

### Load Test (`load-tests/load-test.js`)

Simulates realistic user behavior with multiple endpoints:
- Health check (20% of requests)
- Domain list (30% of requests)
- Seed generation (30% of requests)
- Static assets (20% of requests)

**Use case:** Verify application can handle sustained traffic

### Stress Test (`load-tests/stress-test.js`)

Gradually increases load to find breaking point:
- Health check endpoint
- Domain list endpoint
- Seed generation endpoint

**Use case:** Identify performance limits and bottlenecks

## Configuration

Load tests can be configured via environment variables:

- `BASE_URL`: Base URL of the application (default: `http://localhost:3000`)

## Interpreting Results

### Key Metrics

- **http_req_duration**: Request duration in milliseconds
- **http_req_failed**: Failed request rate
- **vus**: Virtual users currently active
- **vus_max**: Maximum virtual users reached
- **iterations**: Total iterations completed

### Thresholds

Each test has defined thresholds:

```javascript
thresholds: {
  http_req_duration: ['p(95)<1000'], // 95th percentile < 1s
  http_req_failed: ['rate<0.02'],     // Error rate < 2%
}
```

If thresholds are exceeded, the test will fail.

### Example Output

```
     ✓ health check status is 200
     ✓ health check response time < 500ms
     ✓ domains status is 200
     ✓ domains has data
     ✓ home page status is 200

     checks.........................: 100.00% ✓ 1500   ✗ 0
     data_received..................: 2.4 MB  20 kB/s
     data_sent......................: 450 kB  3.8 kB/s
     http_req_duration..............: avg=234ms min=123ms med=210ms max=890ms p(95)=450ms p(99)=670ms
     http_req_failed................: 0.00%   ✓ 1500   ✗ 0
     http_reqs......................: 1500    12.5/s
     iteration_duration.............: avg=2.5s   min=2.1s  med=2.4s  max=3.2s  p(95)=3.0s  p(99)=3.1s
     iterations.....................: 500     4.2/s
     vus............................: 10      min=0    max=10
     vus_max........................: 10      min=10   max=10
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run smoke test
        run: npm run load:test:smoke
      
      - name: Run load test
        run: npm run load:test:load
```

### Docker Integration

```yaml
version: '3.8'
services:
  k6:
    image: grafana/k6:latest
    volumes:
      - ./load-tests:/scripts
    command: run /scripts/load-test.js
    environment:
      - BASE_URL=http://app:3000
    depends_on:
      - app
```

## Best Practices

1. **Run in Staging First**: Always run load tests in staging before production
2. **Monitor Resources**: Monitor CPU, memory, and database during tests
3. **Start Small**: Start with smoke tests before running full load tests
4. **Analyze Results**: Review metrics and identify bottlenecks
5. **Iterate**: Make performance improvements and re-test
6. **Schedule Regular Tests**: Run load tests regularly to catch regressions

## Troubleshooting

### Connection Refused

**Error**: `dial tcp [::1]:3000: connect: connection refused`

**Solution**: Ensure the application is running and the BASE_URL is correct.

### High Error Rate

**Error**: `http_req_failed` threshold exceeded

**Solutions**:
- Check application logs for errors
- Verify database connections
- Check resource limits (CPU, memory)
- Reduce load if application is overwhelmed

### Slow Response Times

**Error**: `http_req_duration` threshold exceeded

**Solutions**:
- Profile slow endpoints
- Optimize database queries
- Add caching
- Scale horizontally

### k6 Not Found

**Error**: `k6: command not found`

**Solution**: Install k6 following the prerequisites section.

## Customizing Tests

To customize load tests, edit the test files in `load-tests/`:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Adjust duration and target
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Adjust thresholds
  },
};
```

Add new test scenarios:

```javascript
export default function () {
  // Your custom test logic
  const response = http.get(`${BASE_URL}/api/your-endpoint`);
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

## Next Steps

- [ ] Integrate load tests into CI/CD pipeline
- [ ] Set up Grafana dashboards for load test results
- [ ] Add load tests for additional endpoints
- [ ] Configure load tests for staging environment
- [ ] Set up automated performance regression detection
