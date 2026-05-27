/**
 * Paradigm k6 Load Test
 *
 * Usage:
 *   1. Start the server: npm run dev
 *   2. Run: k6 run scripts/load-test.k6.js
 *
 * Options:
 *   k6 run -e BASE_URL=http://localhost:3000 -e VUS=10 -e DURATION=30s scripts/load-test.k6.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const API = `${BASE}/api`;

const failRate = new Rate('failed_requests');
const seedCreateTrend = new Trend('seed_create_duration');
const seedGrowTrend = new Trend('seed_grow_duration');
const seedListTrend = new Trend('seed_list_duration');

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    failed_requests: ['rate<0.05'],
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    seed_create_duration: ['p(95)<300'],
    seed_grow_duration: ['p(95)<1000'],
    seed_list_duration: ['p(95)<200'],
  },
};

export default function () {
  group('health and metadata', () => {
    const health = http.get(`${BASE}/health`);
    check(health, { 'health returns 200': (r) => r.status === 200 });
    failRate.add(health.status !== 200);

    const engines = http.get(`${API}/engines`);
    check(engines, { 'engines returns 200': (r) => r.status === 200 });
    failRate.add(engines.status !== 200);
  });

  group('seed CRUD', () => {
    const create = http.post(`${API}/seeds`, JSON.stringify({
      domain: 'character', name: `LoadTest-${__VU}-${__ITER}`,
      genes: { strength: { type: 'scalar', value: 0.8 } },
    }), { headers: { 'Content-Type': 'application/json' } });
    check(create, { 'seed created': (r) => r.status === 200 && r.json('id') });
    seedCreateTrend.add(create.timings.duration);
    failRate.add(create.status !== 200);

    if (create.status === 200) {
      const seedId = create.json('id');

      const list = http.get(`${API}/seeds`);
      check(list, { 'seeds list returns 200': (r) => r.status === 200 });
      seedListTrend.add(list.timings.duration);
      failRate.add(list.status !== 200);

      const grow = http.post(`${API}/seeds/${seedId}/grow`, '{}',
        { headers: { 'Content-Type': 'application/json' } });
      check(grow, { 'seed grown': (r) => r.status === 200 });
      seedGrowTrend.add(grow.timings.duration);
      failRate.add(grow.status !== 200);
    }
  });

  group('gene types and domains', () => {
    const types = http.get(`${API}/gene-types`);
    check(types, { 'gene-types returns 200': (r) => r.status === 200 });
    failRate.add(types.status !== 200);

    const domains = http.get(`${API}/domains`);
    check(domains, { 'domains returns 200': (r) => r.status === 200 });
    failRate.add(domains.status !== 200);
  });

  sleep(1);
}
