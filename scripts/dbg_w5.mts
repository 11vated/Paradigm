import { TypographyQualityContract } from '../src/lib/kernel/generators/typography-contract';
const c = TypographyQualityContract;
const seed = c.curated()[0].seed;
try {
  const a = await c.synthesize(seed);
  console.log('synthesized', Object.keys(a), 'len:', (a as any).filePath?.length);
} catch (e: any) { console.log('synthesize threw:', e?.message ?? e); }
