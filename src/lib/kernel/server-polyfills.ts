const SHIM_MODE = process.env.NODE_ENV === 'production' ? 'production' : 'development';

export function initServerPolyfills() {
  if (typeof global.window !== 'undefined') return;

  let createCanvas: any;
  let NodeImage: any;
  try {
    const canvas = require('canvas');
    createCanvas = canvas.createCanvas;
    NodeImage = canvas.Image;
  } catch (e) {
    const consoleFn = SHIM_MODE === 'production' ? () => {} : console.warn;
    consoleFn('[Polyfills] canvas native not available (common on mac without system libs: brew install pkg-config cairo pango libpng jpeg giflib librsvg); using no-op shims');
    createCanvas = (w: number, h: number) => ({ width: w, height: h, getContext: () => ({ fillRect: () => {}, clearRect: () => {}, drawImage: () => {}, getImageData: () => ({ data: new Uint8ClampedArray(w * h * 4) }) }) });
    NodeImage = class { width = 1; height = 1; };
  }

  const consoleFn = SHIM_MODE === 'production' ? () => {} : console.log;
  consoleFn('[Polyfills] Initializing server-side shims (no WebGL)');

  const fakeDoc = {
    createElement(tag: string) {
      if (tag === 'canvas') return createCanvas(1, 1);
      if (tag === 'img') {
        const img = new NodeImage();
        img.width = 1;
        img.height = 1;
        return img;
      }
      return {} as any;
    },
    createElementNS(_ns: string, tag: string) {
      return this.createElement(tag);
    },
    documentElement: { style: {} },
    createTextNode: () => ({}),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    createRange: () => ({
      setStart: () => {},
      setEnd: () => {},
      getClientRects: () => [],
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    }),
    getSelection: () => null,
    visibilityState: 'visible',
    hidden: false,
    location: { href: 'http://localhost', protocol: 'http:', host: 'localhost', hostname: 'localhost', port: '3000', pathname: '/', search: '', hash: '' },
  } as any /* TODO: Phase 1 strict */;

  const fakeWin = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    location: fakeDoc.location,
    navigator: {
      userAgent: 'Paradigm-Server/1.0',
      platform: 'Node.js',
      gpu: undefined as any /* TODO: Phase 1 strict */,
    },
    document: fakeDoc,
    self: null as any /* TODO: Phase 1 strict */,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: setTimeout.bind(global),
    clearTimeout: clearTimeout.bind(global),
    setInterval: setInterval.bind(global),
    clearInterval: clearInterval.bind(global),
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 1000 / 60) as any /* TODO: Phase 1 strict */,
    cancelAnimationFrame: (id: any) => clearTimeout(id),
    AudioContext: class {},
    OffscreenCanvas: class OffscreenCanvasShim {
      width: number;
      height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() { return null as any /* TODO: Phase 1 strict */; }
    },
    CSS: { supports: () => true, escape: (s: string) => s },
    URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
    Blob: globalThis.Blob || class BlobSim {} as any /* TODO: Phase 1 strict */,
    File: class FileSim extends (global as any /* TODO: Phase 1 strict */).Blob {
      name: string;
      constructor(parts: any[], name: string, _opts?: any) { super(parts); this.name = name; }
    },
    Image: NodeImage as any /* TODO: Phase 1 strict */,
    ImageData: class ImageDataSim {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data; this.width = width; this.height = height;
      }
    },
    fetch: global.fetch ? global.fetch.bind(global) : async () => new Response(null, { status: 404 }),
  };
  fakeWin.self = fakeWin;

  global.window = fakeWin as any /* TODO: Phase 1 strict */;
  global.document = fakeDoc as any /* TODO: Phase 1 strict */;
  try { (global as any /* TODO: Phase 1 strict */).navigator = fakeWin.navigator; } catch { /* swallow: best-effort server shim, fall-through to node built-in */ }
  global.Image = NodeImage as any /* TODO: Phase 1 strict */;
  global.fetch = fakeWin.fetch;
  global.Blob = fakeWin.Blob as any /* TODO: Phase 1 strict */;
  global.File = fakeWin.File as any /* TODO: Phase 1 strict */;
  try { (global as any /* TODO: Phase 1 strict */).HTMLCanvasElement = class {}; } catch { /* swallow: best-effort server shim, fall-through to node built-in */ }
  try { (global as any /* TODO: Phase 1 strict */).CanvasRenderingContext2D = class {}; } catch { /* swallow: best-effort server shim, fall-through to node built-in */ }
  try { (global as any /* TODO: Phase 1 strict */).ImageData = fakeWin.ImageData; } catch { /* swallow: best-effort server shim, fall-through to node built-in */ }
  global.requestAnimationFrame = fakeWin.requestAnimationFrame;
  global.cancelAnimationFrame = fakeWin.cancelAnimationFrame;

  // FileReader shim for generators that expect browser File APIs (e.g. GLTF loaders in server context)
  global.FileReader = class FileReaderShim {
    onload: ((ev: any) => void) | null = null;
    onerror: ((ev: any) => void) | null = null;
    result: any = null;
    readAsDataURL(blob: any) {
      setTimeout(() => {
        try {
          if (typeof blob === 'string') this.result = blob;
          else if (blob && typeof blob.toString === 'function') this.result = 'data:application/octet-stream;base64,' + Buffer.from(String(blob)).toString('base64');
          else this.result = blob;
          if (this.onload) this.onload({ target: this } as any);
        } catch (e) { if (this.onerror) this.onerror({ target: this, error: e } as any); }
      }, 0);
    }
    readAsArrayBuffer(blob: any) {
      setTimeout(() => {
        this.result = blob;
        if (this.onload) this.onload({ target: this } as any);
      }, 0);
    }
  } as any;

  consoleFn('[Polyfills] Server-side shims ready — GLTF export will use scene graph (no WebGL)');
}

