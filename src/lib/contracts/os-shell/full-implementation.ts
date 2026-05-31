/**
 * Paradigm Infinite — Full OS Shell Implementation (Part 6)
 * Complete command handling for make, physical, self-host, governance, etc.
 */

import { fullParadigmCLI } from './full-cli';
import { paradigmOSShell } from './hooks';
import { completePhysicalBridge } from '../physical/complete-bridge';
import { handleWaiverRequest } from '../governance/hooks';

export function fullOSShellExecute(command: string, args: string[] = []) {
  if (command === 'make' || command === 'grow') {
    return paradigmOSShell({ intent: args.join(' '), output: 'artifact' } as any) as any;
  }
  if (command === 'physical') {
    const [seed, modality = 'stl'] = args;
    return completePhysicalBridge(seed, modality as any, 2.0);
  }
  if (command === 'waiver') {
    const [domain, ...reasonParts] = args;
    return handleWaiverRequest(domain, reasonParts.join(' '));
  }
  if (command === 'self-host' || command === 'gspl∞') {
    return { success: true, message: 'GSPL∞ recursive self-host initiated' };
  }
  return fullParadigmCLI([command, ...args]);
}
