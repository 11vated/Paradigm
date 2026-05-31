/**
 * Paradigm Infinite — Full OS Shell CLI (Part 6 expansion)
 * Complete stub for paradigm make, self-host, physical, etc.
 */

import { runParadigmCLI } from './cli';
import { paradigmOSShell } from './hooks';
import { generateFullPhysicalBridge } from '../physical/full-bridge';

export async function fullParadigmCLI(args: string[]) {
  const cmd = args[0] || 'help';
  if (cmd === 'make' || cmd === 'grow') {
    const intent = args.slice(1).join(' ');
    const resP = paradigmOSShell({ intent, output: 'artifact' } as any) as any;
    const res = await resP;
    console.log('[OS Shell]', res?.message || res);
  } else if (cmd === 'physical') {
    const bridge = generateFullPhysicalBridge(args[1] || 'demo-seed', 'stl', 1.5);
    console.log('[Physical Bridge]', bridge);
  } else if (cmd === 'self-host') {
    console.log('[Recursive Closure] GSPL∞ self-host initiated (stub)');
  } else {
    await runParadigmCLI(args);
  }
}
