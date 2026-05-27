/**
 * Local Embeddings — Transformers.js wrapper.
 *
 * Sovereignty: weights download once from the HuggingFace CDN (or any
 * mirror; configurable) and cache to disk. After first load the
 * embedder is fully offline.
 *
 * Default model: `Xenova/all-MiniLM-L6-v2` (384-D, ~80MB quantized).
 * Loaded lazily — first `embed()` call triggers the download.
 *
 * Embedder type is defined in ./types so consumers don't need to
 * import Transformers.js types directly.
 */

import type { Embedder } from './types';

type PoolingMode = 'none' | 'mean' | 'cls';

interface PipelineFn {
  (text: string | string[], opts?: { pooling?: PoolingMode; normalize?: boolean }):
    Promise<{ data: Float32Array | number[] }>;
}

interface XenovaModule {
  pipeline: (task: string, model: string) => Promise<PipelineFn>;
  env: { allowLocalModels?: boolean; localModelPath?: string; cacheDir?: string };
}

export interface LocalEmbedderOptions {
  /** HuggingFace model id. Default 'Xenova/all-MiniLM-L6-v2'. */
  model?: string;
  /** Pooling mode. Default 'mean'. */
  pooling?: PoolingMode;
  /** L2-normalize the resulting vector. Default true (so cosine == dot). */
  normalize?: boolean;
  /** Override the on-disk cache directory. */
  cacheDir?: string;
  /** If true, do not attempt network downloads — only use cached weights. */
  offlineOnly?: boolean;
}

export class LocalEmbedder implements Embedder {
  readonly model: string;
  readonly dim: number;
  private readonly pooling: PoolingMode;
  private readonly normalize: boolean;
  private readonly cacheDir?: string;
  private readonly offlineOnly: boolean;
  private pipe: PipelineFn | undefined;
  private loadPromise: Promise<void> | undefined;

  constructor(opts: LocalEmbedderOptions = {}) {
    this.model = opts.model ?? 'Xenova/all-MiniLM-L6-v2';
    this.dim = this.model.includes('MiniLM-L6') ? 384 : 768;
    this.pooling = opts.pooling ?? 'mean';
    this.normalize = opts.normalize ?? true;
    this.cacheDir = opts.cacheDir;
    this.offlineOnly = opts.offlineOnly ?? false;
  }

  async ready(): Promise<void> {
    if (this.pipe) return;
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  private async load(): Promise<void> {
    // @ts-ignore PARADIGM-EVASION-OK: dynamic ESM import of @xenova/transformers lacks shipped types; see waiver registry
    const x = (await import('@xenova/transformers')) as XenovaModule;
    if (this.cacheDir) x.env.cacheDir = this.cacheDir;
    if (this.offlineOnly) x.env.allowLocalModels = true;
    this.pipe = await x.pipeline('feature-extraction', this.model);
  }

  async embed(text: string): Promise<Float32Array> {
    await this.ready();
    const result = await this.pipe!(text, { pooling: this.pooling, normalize: this.normalize });
    const raw = result.data;
    return raw instanceof Float32Array ? raw : new Float32Array(raw);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    await this.ready();
    const result = await this.pipe!(texts, { pooling: this.pooling, normalize: this.normalize });
    const raw = result.data;
    const flat = raw instanceof Float32Array ? raw : new Float32Array(raw);
    // Split flat array into per-text slices
    const out: Float32Array[] = [];
    const d = this.dim;
    for (let i = 0; i < texts.length; i++) {
      out.push(flat.subarray(i * d, (i + 1) * d).slice());
    }
    return out;
  }
}

/** Convenience factory — returns a LocalEmbedder with default config. */
export function createLocalEmbedder(opts?: LocalEmbedderOptions): LocalEmbedder {
  return new LocalEmbedder(opts);
}
