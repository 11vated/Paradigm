/**
 * Simple notification helper.
 * Logs to console and shows user-visible toast when available.
 */

let notifyFn: ((message: string, type?: 'error' | 'success' | 'info') => void) | null = null;

export function setNotify(fn: typeof notifyFn) {
  notifyFn = fn;
}

export function notify(message: string, type: 'error' | 'success' | 'info' = 'info') {
  if (type === 'error') console.error('[Paradigm]', message);
  else console.log('[Paradigm]', message);
  notifyFn?.(message, type);
}
