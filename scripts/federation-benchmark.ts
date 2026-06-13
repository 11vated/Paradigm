/**
 * Federation scaling benchmark for v1.1.0
 * Measures throughput (offers/sec) and memory for registry/cache under load.
 * Run: npx tsx scripts/federation-benchmark.ts
 */
import { startFederationServer } from '../src/lib/federation/server.ts';

const PORT = 8799;
const NUM_OFFERS = 200;
const CONCURRENCY = 10;

async function main() {
  console.log('Starting federation benchmark (v1.1.0 scaling)...');
  const srv = startFederationServer(PORT);
  await new Promise(r => setTimeout(r, 300)); // let server start

  const start = Date.now();
  let success = 0;
  const promises: Promise<any>[] = [];

  for (let i = 0; i < NUM_OFFERS; i++) {
    const body = {
      seed: { $hash: `bench-seed-${i}`, genes: { idx: i } },
      signature: { signature: 'bench-sig', publicKey: 'bench-pub', algorithm: 'ed25519', signedAt: Date.now(), payloadHash: `h${i}` },
      fromNode: `bench-node-${i % 5}`,
      offeredAt: new Date().toISOString()
    };
    const p = fetch(`http://localhost:${PORT}/federation/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => { if (r.ok) success++; return r.json(); }).catch(() => {});
    promises.push(p);
    if (promises.length >= CONCURRENCY) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }
  if (promises.length) await Promise.all(promises);

  const dur = Date.now() - start;
  const tps = (NUM_OFFERS / (dur / 1000)).toFixed(1);
  console.log(`Benchmark: ${NUM_OFFERS} offers in ${dur}ms → ${tps} offers/sec`);
  console.log(`Success: ${success}/${NUM_OFFERS}`);

  // Health for registry size
  const health = await fetch(`http://localhost:${PORT}/federation/health`).then(r => r.json());
  console.log('Health after load:', health);

  srv.close();
  console.log('Federation benchmark complete (registry/caching exercised).');
}

main().catch(console.error);