import { generateTypography } from '../src/lib/kernel/generators/typography';
import * as fs from 'fs';
const out = '/tmp/typo.svg';
try {
  const r = await generateTypography({ $domain:'typography', $name:'t', genes: {} } as any, out);
  console.log('OK', r, 'exists?', fs.existsSync(r.filePath));
} catch (e: any) { console.log('ERR', e?.message ?? e); }
