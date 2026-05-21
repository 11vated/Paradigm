/**
 * Browser-side shim for Node-only modules (`fs`, `os`, etc.) that get pulled
 * transitively into the client bundle via barrel re-exports
 * (e.g. `@/lib/friend` exports `FriendStore`, which imports `fs`).
 *
 * Vite externalizes these to a throwing Proxy at module-load time, which
 * crashes the entire React tree to a blank page. This shim provides inert
 * named exports plus a default export so `import x from 'fs'` /
 * `import { promises } from 'fs'` evaluate without throwing. Any actual
 * server-only operation invoked in the browser will throw a descriptive error.
 *
 * Wired in via `vite.config.ts` `resolve.alias`. Server code (run by tsx)
 * resolves real Node modules and is unaffected.
 */

function notInBrowser(name: string): never {
  throw new Error(
    `[browser-node-shim] '${name}' is a Node-only operation and cannot run in the browser. ` +
    `This code path should only execute on the server.`,
  );
}

function makeProxy(label: string): any {
  return new Proxy(function () { notInBrowser(label); }, {
    get(_t, prop) {
      if (prop === 'then') return undefined; // not a thenable
      if (prop === Symbol.toPrimitive) return () => `[${label} browser stub]`;
      return makeProxy(`${label}.${String(prop)}`);
    },
    apply() { notInBrowser(label); },
  });
}

// fs.promises and fs.* methods — all stubbed to throw only when called.
export const promises = makeProxy('fs.promises');
export const readFile = (..._args: unknown[]) => notInBrowser('fs.readFile');
export const writeFile = (..._args: unknown[]) => notInBrowser('fs.writeFile');
export const readFileSync = (..._args: unknown[]) => notInBrowser('fs.readFileSync');
export const writeFileSync = (..._args: unknown[]) => notInBrowser('fs.writeFileSync');
export const existsSync = (..._args: unknown[]) => notInBrowser('fs.existsSync');
export const mkdirSync = (..._args: unknown[]) => notInBrowser('fs.mkdirSync');
export const readdirSync = (..._args: unknown[]) => notInBrowser('fs.readdirSync');
export const statSync = (..._args: unknown[]) => notInBrowser('fs.statSync');
export const unlinkSync = (..._args: unknown[]) => notInBrowser('fs.unlinkSync');
export const renameSync = (..._args: unknown[]) => notInBrowser('fs.renameSync');
export const createReadStream = (..._args: unknown[]) => notInBrowser('fs.createReadStream');
export const createWriteStream = (..._args: unknown[]) => notInBrowser('fs.createWriteStream');

const fsDefault: any = {
  promises,
  readFile, writeFile, readFileSync, writeFileSync,
  existsSync, mkdirSync, readdirSync, statSync,
  unlinkSync, renameSync, createReadStream, createWriteStream,
};

export default fsDefault;
