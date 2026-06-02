/**
 * Paradigm Infinite — Governance Hooks (Part 6 expansion)
 * Canon policy enforcement, waiver handling, forkable governance.
 */

import { getCurrentCanonPolicy } from './canon-stewardship';

export function enforceCanonPolicy(domain: string, transformation?: string): boolean {
  const policy = getCurrentCanonPolicy();
  if (policy.forbiddenDomains.includes(domain)) return false;
  if (transformation && !policy.allowedTransformations.includes('all') && !policy.allowedTransformations.includes(transformation)) return false;
  return true;
}

export function handleWaiverRequest(domain: string, reason: string): { approved: boolean; expires?: string } {
  // Stub: in real system, append to waivers/registry.json with sunset
  console.log(`[Governance] Waiver requested for ${domain}: ${reason}`);
  return { approved: true, expires: new Date(Date.now() + 1000*60*60*24*90).toISOString() }; // 90 days
}
