/**
 * Browser-side shim for Node's `os` module. See browser-node-shim.ts for
 * rationale. All operations throw only on call, never on import.
 */

function notInBrowser(name: string): never {
  throw new Error(`[browser-os-shim] '${name}' is Node-only and cannot run in the browser.`);
}

export const tmpdir = () => '/tmp';
export const homedir = () => '/';
export const platform = () => 'browser';
export const arch = () => 'browser';
export const cpus = () => [];
export const totalmem = () => 0;
export const freemem = () => 0;
export const hostname = () => 'browser';
export const release = () => '0.0.0';
export const type = () => 'browser';
export const endianness = () => 'LE';
export const networkInterfaces = (..._args: unknown[]) => notInBrowser('os.networkInterfaces');
export const userInfo = (..._args: unknown[]) => notInBrowser('os.userInfo');
export const EOL = '\n';

const osDefault = {
  tmpdir, homedir, platform, arch, cpus, totalmem, freemem,
  hostname, release, type, endianness, networkInterfaces, userInfo, EOL,
};

export default osDefault;
