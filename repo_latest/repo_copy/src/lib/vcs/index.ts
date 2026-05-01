/**
 * Seed VCS — public barrel.
 * Consumers should import from here, not the subfiles, so refactors of the
 * internal layout don't ripple through the codebase.
 */
export * from './objects.js';
export * from './stores.js';
export * from './operations.js';
export * from './json-backed-store.js';
