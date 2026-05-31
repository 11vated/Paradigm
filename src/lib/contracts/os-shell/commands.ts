/**
 * Paradigm Infinite — OS Shell Commands (Part 6)
 * Expanded command set for full reality UI.
 */

import { fullOSShellExecute } from './full-implementation';

export const OS_COMMANDS = [
  'make', 'grow', 'physical', 'self-host', 'waiver', 'gspl∞', 'governance', 'status'
];

export function handleOSCommand(full: string) {
  return fullOSShellExecute(full.split(' ')[0], full.split(' ').slice(1));
}
