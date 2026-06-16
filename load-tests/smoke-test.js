/**
 * K6 Smoke Test for Paradigm Infinite
 * 
 * Light load test to verify the application can handle basic traffic.
 * This test runs with a low number of virtual users to ensure basic functionality.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],    // Error rate must be less than 5%
  },
};

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test domain list endpoint
  const domainsRes = http.get(`${BASE_URL}/api/domains`);
  check(domainsRes, {
    'domains status is 200': (r) => r.status === 200,
    'domains has data': (r) => JSON.parse(r.body).length > 0,
  });

  sleep(1);

  // Test static assets
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'home page status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
