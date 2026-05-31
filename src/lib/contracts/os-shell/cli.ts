/**
 * Paradigm Infinite — OS Shell CLI Stub (Part 6)
 * `paradigm make <intent>` style entrypoint.
 */

import { paradigmOSShell } from './hooks';

export async function runParadigmCLI(args: string[]) {
  const intent = args.join(' ') || 'help';
  const resultP = paradigmOSShell({ intent, output: 'artifact' } as any) as any;
  const result = await resultP;
  console.log('[Paradigm OS Shell]', result?.message || result);
  if (result?.artifactId) console.log('Artifact:', result.artifactId);
  if (result?.code) console.log('Generated code snippet available.');
}
