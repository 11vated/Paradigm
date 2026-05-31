/**
 * Paradigm Infinite — OS Shell Command Router (Part 6)
 * Full command dispatching for Paradigm as reality UI.
 */

import { fullOSShellExecute } from './full-implementation';

export function routeOSCommand(fullCommand: string) {
  const [cmd, ...args] = fullCommand.trim().split(/\s+/);
  return fullOSShellExecute(cmd, args);
}

// Example: paradigm> make a flying car in neon tokyo
// paradigm> physical hero_mesh_v1 stl
// paradigm> self-host
// paradigm> waiver robotics "for sacred use"
