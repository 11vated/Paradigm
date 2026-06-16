/**
 * K6 Stress Test for Paradigm Infinite
 * 
 * Stress test to find the breaking point of the application.
 * This test gradually increases load until the application fails.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '2m', target: 400 },   // Ramp up to 400 users
    { duration: '2m', target: 800 },   // Ramp up to 800 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be less than 10% (stress test allows higher)
  },
};

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // Test domain list endpoint
  const domainsRes = http.get(`${BASE_URL}/api/domains`);
  check(domainsRes, {
    'domains status is 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // Test seed generation endpoint
  const seedRes = http.post(`${BASE_URL}/api/seeds/grow`, JSON.stringify({
    $domain: 'character',
    $version: '1.0.0',
    genes: {
      name: 'Stress Test Character',
      description: 'A character for stress testing',
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(seedRes, {
    'seed generation status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
