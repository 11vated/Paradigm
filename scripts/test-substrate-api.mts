import express from 'express';
import { registerSubstrateHealthRoutes } from '../src/server/routes/substrate-health.ts';

const app = express();
registerSubstrateHealthRoutes(app);
const server = await new Promise<any>((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const port = server.address().port;
console.log('listening on', port);
await new Promise(r => setTimeout(r, 8000));
try {
  const res = await fetch('http://127.0.0.1:' + port + '/api/substrate/health');
  const j: any = await res.json();
  console.log('Keys:', Object.keys(j));
  console.log('engineeringContracts15:', j.engineeringContracts15 ? `present (total=${j.engineeringContracts15.total})` : 'MISSING');
  console.log('status:', j.status);
  console.log('doctrine:', j.doctrine);
  console.log('phase0.gates:', Object.keys(j.phase0?.gates ?? {}).length);
  console.log('predicateDemo.available:', j.predicateDemo?.available);
} catch (e) {
  console.error('fetch err:', e);
}
server.close();
