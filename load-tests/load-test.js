/**
 * K6 Load Test for Paradigm Infinite
 * 
 * Comprehensive load test to verify the application can handle sustained traffic.
 * This test simulates realistic user behavior with multiple endpoints.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.02'],    // Error rate must be less than 2%
  },
};

export default function () {
  // Test health endpoint (20% of requests)
  if (Math.random() < 0.2) {
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Test domain list endpoint (30% of requests)
  if (Math.random() < 0.3) {
    const domainsRes = http.get(`${BASE_URL}/api/domains`);
    check(domainsRes, {
      'domains status is 200': (r) => r.status === 200,
      'domains has data': (r) => {
        try {
          return JSON.parse(r.body).length > 0;
        } catch {
          return false;
        }
      },
    });
    sleep(1);
  }

  // Test seed generation endpoint (30% of requests)
  if (Math.random() < 0.3) {
    const seedRes = http.post(`${BASE_URL}/api/seeds/grow`, JSON.stringify({
      $domain: 'character',
      $version: '1.0.0',
      genes: {
        name: 'Load Test Character',
        description: 'A character for load testing',
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(seedRes, {
      'seed generation status is 200': (r) => r.status === 200,
      'seed generation has data': (r) => {
        try {
          return JSON.parse(r.body).artifact !== undefined;
        } catch {
          return false;
        }
      },
    });
    sleep(2);
  }

  // Test static assets (20% of requests)
  if (Math.random() < 0.2) {
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
      'home page status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }
}
