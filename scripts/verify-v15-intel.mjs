// Quick v1.5 verifier (run with npx tsx scripts/verify-v15-intel.mjs)
import { GsplInterpreter } from '../src/lib/kernel/gspl-interpreter.ts';
import { getFederationIntelligence } from '../src/lib/federation/server.ts';
import { createHash } from 'node:crypto';

async function main() {
  console.log('=== V1.5 KERNEL AUTONOMOUS INTEL + ADAPTIVE (det) ===');
  const i1 = new GsplInterpreter('test123');
  const i2 = new GsplInterpreter('test123');
  const code = 'seed t { strata: Form + Mind + World } let e=autonomous_evolve t; print "V1.5";';
  await i1.execute(code);
  await i2.execute(code);
  const d1 = i1.context.output.filter(x => x.includes('KERNEL_HEURISTIC'));
  const d2 = i2.context.output.filter(x => x.includes('KERNEL_HEURISTIC'));
  const det = JSON.stringify(d1) === JSON.stringify(d2);
  console.log('V1.5_TREE_GROW_DET_ON_AUTONOMOUS=' + det);
  console.log('V1.5_DECISION_COUNT=' + d1.length);
  console.log('V1.5_SAMPLE=' + (d1[0] || '').slice(0, 130));
  console.log('V1.5_KERNEL_PASS=' + (det && d1.length > 0));

  console.log('\n=== V1.5 FED SELF-OPT + INTEL ===');
  const intel = getFederationIntelligence();
  console.log('V1.5_FED_PROFILE=' + JSON.stringify(intel.adaptive || intel));
  console.log('V1.5_INTEL_AUDIT_LEN=' + (intel.auditTail ? intel.auditTail.length : 0));

  const proof = createHash('sha256').update(JSON.stringify(d1)).digest('hex').slice(0, 12);
  console.log('V1.5_PROOF_HASH=' + proof);
  console.log('V1.5_ALL_CORE_PASS=' + (det && d1.length > 0));
}
main().catch(e => { console.error(e); process.exit(1); });