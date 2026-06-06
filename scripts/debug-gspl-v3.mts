import { executeGspl } from '../src/lib/kernel/gspl-interpreter.ts';

const variants = [
  'seed "C1" in character { strength: 0.6 }; seed "C2" in music { tempo: 100 }; compose C1, music;',
  'seed "C1" in character { strength: 0.6 }; seed "C2" in music { tempo: 100 }; compose C1, music',
  'seed "C1" in character { strength: 0.6 }; seed "C2" in music { tempo: 100 }; compose "C1" music',
  'seed "C1" in character { strength: 0.6 }; seed "C2" in music { tempo: 100 }; compose C1 "music"',
];
for (const p of variants) {
  try {
    const r = await executeGspl(p, 'gspl-v3-comp-1');
    console.log(`OK: ${p}`);
    console.log(`   keys=${Object.keys(r ?? {}).join(',')} seeds=${r?.seeds?.length} out=${r?.output?.length}`);
    if (r?.seeds?.[0]) console.log(`   s0 $hash=${r.seeds[0].$hash} $name=${r.seeds[0].$name}`);
    if (r?.seeds?.[1]) console.log(`   s1 $hash=${r.seeds[1].$hash} $name=${r.seeds[1].$name}`);
    if (r?.seeds?.[2]) console.log(`   s2 $hash=${r.seeds[2].$hash} $name=${r.seeds[2].$name}`);
  } catch (e) { console.log(`ERR: ${p}\n   ${(e as Error).message?.split('\n')[0]}`); }
}
