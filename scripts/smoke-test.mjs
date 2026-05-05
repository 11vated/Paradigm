#!/usr/bin/env node
/**
 * Paradigm Smoke Test — hits every critical endpoint against a live server.
 * Usage:  node scripts/smoke-test.mjs [BASE_URL]
 * Default BASE_URL: http://localhost:3000
 *
 * Tests: health, auth register/login, seed CRUD, generate, mutate, breed,
 * evolve, grow, compose, gene-types, engines, domains, composition graph,
 * agent query, GSPL parse/execute, sovereignty sign/verify, NFT mint,
 * gene portrait, seed distance, library, stats.
 *
 * Exits 0 on full pass, 1 on any failure.
 */

const BASE = process.argv[2] || 'http://localhost:3000';
const API = `${BASE}/api`;
const TS = Date.now();
const USERNAME = `smoke_${TS}`;
const PASSWORD = 'SmOk3T3st!Pw99';

let passed = 0;
let failed = 0;
let token = null;
let createdSeedId = null;
let secondSeedId = null;

async function post(path, body, headers = {}) {
  const h = { 'Content-Type': 'application/json', ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null), ok: res.ok };
}

async function get(path, headers = {}) {
  const h = { ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers: h });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('image/') || ct.includes('svg')) {
    return { status: res.status, data: await res.text(), ok: res.ok };
  }
  return { status: res.status, data: await res.json().catch(() => null), ok: res.ok };
}

async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  return { status: res.status, data: await res.json().catch(() => null), ok: res.ok };
}

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function run() {
  console.log(`\n\x1b[1m═══ Paradigm Smoke Test ═══\x1b[0m`);
  console.log(`  Target: ${BASE}\n`);

  // ── 1. Health ────────────────────────────────────────────────────
  console.log('\x1b[1m[Health]\x1b[0m');
  try {
    const h = await getHealth();
    check('GET /health returns 200', h.ok);
    check('status is "ok"', h.data?.status === 'ok', `got: ${h.data?.status}`);
    check('version is 2.0.0', h.data?.version === '2.0.0', `got: ${h.data?.version}`);
  } catch (e) {
    check('Health endpoint reachable', false, e.message);
  }

  // ── 2. Auth ──────────────────────────────────────────────────────
  console.log('\n\x1b[1m[Auth]\x1b[0m');
  {
    const reg = await post('/auth/register', { username: USERNAME, password: PASSWORD });
    check('POST /auth/register returns 200', reg.ok, `status: ${reg.status}`);
    check('Register returns token', typeof reg.data?.token === 'string');
    check('Register returns username', reg.data?.username === USERNAME);
    token = reg.data?.token;

    const dup = await post('/auth/register', { username: USERNAME, password: PASSWORD });
    check('Duplicate register rejected', !dup.ok);

    const login = await post('/auth/login', { username: USERNAME, password: PASSWORD });
    check('POST /auth/login returns 200', login.ok, `status: ${login.status}`);
    check('Login returns token', typeof login.data?.token === 'string');
    token = login.data?.token || token;

    const badLogin = await post('/auth/login', { username: USERNAME, password: 'wrong' });
    check('Bad password rejected', !badLogin.ok);
  }

  // ── 3. Kernel Metadata ───────────────────────────────────────────
  console.log('\n\x1b[1m[Kernel Metadata]\x1b[0m');
  {
    const engines = await get('/engines');
    check('GET /engines returns engines array', Array.isArray(engines.data?.engines));
    check('27 engines', engines.data?.count === 27, `got: ${engines.data?.count}`);

    const types = await get('/gene-types');
    check('GET /gene-types returns types', types.data?.count === 17, `got: ${types.data?.count}`);

    const domains = await get('/domains');
    check('GET /domains returns domains', domains.data?.count === 27, `got: ${domains.data?.count}`);

    const graph = await get('/composition/graph');
    check('GET /composition/graph has edges', Array.isArray(graph.data?.edges) && graph.data.edges.length >= 12);
    check('Composition graph has nodes', Array.isArray(graph.data?.nodes) && graph.data.nodes.length > 0);

    const stats = await get('/stats');
    check('GET /stats returns platform version', stats.data?.platform_version?.includes('2.0.0'));
  }

  // ── 4. Seed CRUD ─────────────────────────────────────────────────
  console.log('\n\x1b[1m[Seed CRUD]\x1b[0m');
  {
    const create = await post('/seeds', { domain: 'character', name: 'Smoke Hero', genes: { strength: { type: 'scalar', value: 0.8 } } });
    check('POST /seeds creates seed', create.ok && create.data?.id);
    check('Seed has correct domain', create.data?.$domain === 'character');
    check('Seed has $hash', typeof create.data?.$hash === 'string');
    createdSeedId = create.data?.id;

    const fetch1 = await get(`/seeds/${createdSeedId}`);
    check('GET /seeds/:id returns seed', fetch1.ok && fetch1.data?.id === createdSeedId);

    const list = await get('/seeds');
    check('GET /seeds returns paginated response', Array.isArray(list.data?.seeds) && list.data?.pagination);
    check('Created seed appears in list', list.data?.seeds?.some(s => s.id === createdSeedId));
  }

  // ── 5. Generate ──────────────────────────────────────────────────
  console.log('\n\x1b[1m[Seed Generation]\x1b[0m');
  {
    const gen = await post('/seeds/generate', { prompt: 'a fire mage with blazing staff', domain: 'character' });
    check('POST /seeds/generate returns seed', gen.ok && gen.data?.id);
    check('Generated seed has genes', gen.data?.genes && Object.keys(gen.data.genes).length > 0);
    secondSeedId = gen.data?.id;
  }

  // ── 6. Mutate ────────────────────────────────────────────────────
  console.log('\n\x1b[1m[Mutation]\x1b[0m');
  {
    const mutate = await post(`/seeds/${createdSeedId}/mutate`, { rate: 0.3 });
    check('POST /seeds/:id/mutate returns seed', mutate.ok && mutate.data?.id);
    check('Mutated seed has lineage', mutate.data?.$lineage?.operation === 'mutate');
  }

  // ── 7. Breed ─────────────────────────────────────────────────────
  console.log('\n\x1b[1m[Breeding]\x1b[0m');
  {
    const breed = await post('/seeds/breed', { parent_a_id: createdSeedId, parent_b_id: secondSeedId });
    check('POST /seeds/breed returns offspring', breed.ok && breed.data?.id);
    check('Offspring has breed lineage', breed.data?.$lineage?.operation === 'breed');
    check('Offspring has two parent hashes', breed.data?.$lineage?.parents?.length === 2);
  }

  // ── 8. Evolve ────────────────────────────────────────────────────
  console.log('\n\x1b[1m[Evolution]\x1b[0m');
  {
    const evolve = await post(`/seeds/${createdSeedId}/evolve`, { population_size: 4, generations: 2 });
    check('POST /seeds/:id/evolve returns population', evolve.ok && Array.isArray(evolve.data?.population));
    check('Population size matches', evolve.data?.count === 4, `got: ${evolve.data?.count}`);
    check('Population sorted by fitness desc', (() => {
      const pop = evolve.data?.population || [];
      for (let i = 1; i < pop.length; i++) {
        if ((pop[i].$fitness?.overall || 0) > (pop[i-1].$fitness?.overall || 0) + 0.001) return false;
      }
      return true;
    })());
  }

  // ── 9. Gene Edit ─────────────────────────────────────────────────
  console.log('\n\x1b[1m[Gene Editing]\x1b[0m');
  {
    const edit = await post(`/seeds/${createdSeedId}/genes`, null, {});
    // Actually it's a PUT
    const res = await fetch(`${API}/seeds/${createdSeedId}/genes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ gene_name: 'courage', gene_type: 'scalar', value: 0.95 })
    });
    const data = await res.json().catch(() => null);
    check('PUT /seeds/:id/genes updates gene', res.ok);
    check('Updated gene value present', data?.genes?.courage?.value === 0.95);
  }

  // ── 10. Grow ─────────────────────────────────────────────────────
  console.log('\n\x1b[1m[Domain Engine Growth]\x1b[0m');
  {
    const grow = await post(`/seeds/${createdSeedId}/grow`, {});
    check('POST /seeds/:id/grow returns artifact', grow.ok && grow.data);
    check('Artifact has domain-specific data', typeof grow.data === 'object');
  }

  // ── 11. Composition ──────────────────────────────────────────────
  console.log('\n\x1b[1m[Composition]\x1b[0m');
  {
    const pathRes = await get('/composition/path?source=character&target=sprite');
    check('GET /composition/path finds route', pathRes.ok && pathRes.data?.path);

    const comp = await post(`/seeds/${createdSeedId}/compose`, { target_domain: 'sprite' });
    check('POST /seeds/:id/compose returns composed seed', comp.ok && comp.data?.seed);
    check('Composed seed has target domain', comp.data?.seed?.$domain === 'sprite');
    check('Composition includes path', comp.data?.path?.path?.length > 0);
  }

  // ── 12. GSPL ─────────────────────────────────────────────────────
  console.log('\n\x1b[1m[GSPL Language]\x1b[0m');
  {
    const gsplCode = 'seed TestSmoke { domain: character; gene strength: scalar = 0.9; }';
    const parse = await post('/gspl/parse', { source: gsplCode });
    check('POST /gspl/parse returns AST', parse.ok && parse.data?.ast);
    check('Parse has stats', parse.data?.stats?.tokens > 0);

    const exec = await post('/gspl/execute', { source: gsplCode });
    check('POST /gspl/execute creates seeds', exec.ok && Array.isArray(exec.data?.seeds));
    check('GSPL created at least one seed', exec.data?.seeds?.length > 0);
  }

  // ── 13. Agent ────────────────────────────────────────────────────
  console.log('\n\x1b[1m[Native Agent]\x1b[0m');
  {
    const query1 = await post('/agent/query', { query: 'list domains' });
    check('POST /agent/query succeeds', query1.ok && query1.data?.success);
    check('Agent returns intent', typeof query1.data?.intent === 'string');

    const query2 = await post('/agent/query', { query: 'create a music seed called SmokeTrack' });
    check('Agent creates seed on request', query2.data?.data?.seed);
    check('Created seed has correct domain', query2.data?.data?.seed?.$domain === 'music');

    const help = await get('/agent/help');
    check('GET /agent/help returns capabilities', help.ok);
  }

  // ── 14. Sovereignty ──────────────────────────────────────────────
  console.log('\n\x1b[1m[Sovereignty]\x1b[0m');
  {
    const keys = await post('/keys/generate', {});
    check('POST /keys/generate returns keypair', keys.ok && keys.data?.public_key && keys.data?.private_key);

    if (keys.data?.private_key) {
      const sign = await post(`/seeds/${createdSeedId}/sign`, { private_key: keys.data.private_key });
      check('POST /seeds/:id/sign returns signature', sign.ok && sign.data?.sovereignty?.signature);

      const verify = await post(`/seeds/${createdSeedId}/verify`, { public_key: keys.data.public_key });
      check('POST /seeds/:id/verify confirms signature', verify.ok && verify.data?.verified === true);
    }
  }

  // ── 15. NFT Minting (dry run) ────────────────────────────────────
  console.log('\n\x1b[1m[NFT Minting]\x1b[0m');
  {
    const mint = await post(`/seeds/${createdSeedId}/mint`, { owner_address: '0x0000000000000000000000000000000000000001' });
    check('POST /seeds/:id/mint returns metadata', mint.ok || mint.status === 200);
    check('Mint result has tokenId', mint.data?.tokenId != null);
    check('Mint result has metadata', mint.data?.metadata?.name);

    const nft = await get(`/seeds/${createdSeedId}/nft`);
    check('GET /seeds/:id/nft returns info', nft.ok);

    const portrait = await fetch(`${API}/seeds/${createdSeedId}/portrait`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    check('GET /seeds/:id/portrait returns SVG', portrait.ok && (portrait.headers.get('content-type') || '').includes('svg'));

    const contract = await get('/contract/source');
    check('GET /contract/source returns Solidity', contract.ok && contract.data?.source?.includes('ERC721'));
  }

  // ── 16. Seed Distance ────────────────────────────────────────────
  console.log('\n\x1b[1m[Seed Distance]\x1b[0m');
  {
    const dist = await post('/seeds/distance', { seed_a_id: createdSeedId, seed_b_id: secondSeedId });
    check('POST /seeds/distance returns comparison', dist.ok);
    check('Distance has average_distance', typeof dist.data?.average_distance === 'number');
    check('Distance compares genes', dist.data?.total_genes_compared > 0);
  }

  // ── 17. Library ──────────────────────────────────────────────────
  console.log('\n\x1b[1m[Library]\x1b[0m');
  {
    const lib = await get('/library');
    check('GET /library returns seeds', lib.ok && Array.isArray(lib.data?.seeds));
  }

  // ── 18. Delete ───────────────────────────────────────────────────
  console.log('\n\x1b[1m[Cleanup]\x1b[0m');
  {
    const del = await fetch(`${API}/seeds/${createdSeedId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const delData = await del.json().catch(() => null);
    check('DELETE /seeds/:id removes seed', del.ok && delData?.deleted === true);

    const gone = await get(`/seeds/${createdSeedId}`);
    check('Deleted seed returns 404', gone.status === 404);
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n\x1b[1m═══ Results: ${passed} passed, ${failed} failed ═══\x1b[0m`);
  if (failed > 0) {
    console.log('\x1b[31mSMOKE TEST FAILED\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32mALL SMOKE TESTS PASSED\x1b[0m\n');
    process.exit(0);
  }
}

run().catch(e => {
  console.error(`\x1b[31mFatal error: ${e.message}\x1b[0m`);
  process.exit(1);
});
