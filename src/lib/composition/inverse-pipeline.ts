import crypto from 'crypto';
import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng';
import { UniversalSeed, GeneType } from '../../seeds';

export type Modality =
  | 'image' | 'audio' | 'video' | 'text' | '3d'
  | 'midi' | 'code' | 'game-replay' | 'sensor' | 'genome'
  | 'map' | 'legal' | 'cultural-corpus' | 'historical' | 'mind-transcript';

export const ALL_MODALITIES: Modality[] = [
  'image', 'audio', 'video', 'text', '3d',
  'midi', 'code', 'game-replay', 'sensor', 'genome',
  'map', 'legal', 'cultural-corpus', 'historical', 'mind-transcript',
];

export interface InverseCandidateBranch {
  label: string;
  description: string;
  suggestedModality?: Modality;
  confidence: number;
}

export interface InverseFailure {
  typed: 'unsupported-modality' | 'insufficient-input' | 'parse-error';
  message: string;
  candidateBranches: InverseCandidateBranch[];
}

export interface InverseSuccess {
  seed: UniversalSeed;
  domain: string;
  confidence: number;
}

export type InverseResult = InverseSuccess | { failure: InverseFailure };

export function isInverseSuccess(r: InverseResult): r is InverseSuccess {
  return 'seed' in r && !('failure' in r);
}

function hashInput(modality: Modality, input: unknown): string {
  const raw = `${modality}:${JSON.stringify(input)}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function domainForModality(modality: Modality): string {
  const map: Record<Modality, string> = {
    image: 'visual2d',
    audio: 'music',
    video: 'animation',
    text: 'narrative',
    '3d': 'geometry3d',
    midi: 'music',
    code: 'app',
    'game-replay': 'game',
    sensor: 'physics',
    genome: 'alife',
    map: 'world',
    legal: 'narrative',
    'cultural-corpus': 'narrative',
    historical: 'narrative',
    'mind-transcript': 'agent',
  };
  return map[modality];
}

function newRng(modality: Modality, input: unknown): Xoshiro256StarStar {
  return rngFromHash(hashInput(modality, input));
}

function buildSeed(modality: Modality, input: unknown, genes: Record<string, { type: string; value: unknown }>, rng: Xoshiro256StarStar): UniversalSeed {
  const h = hashInput(modality, input);
  const seed = new UniversalSeed();
  seed.$domain = domainForModality(modality);
  seed.$name = `inverse:${modality}:${h.slice(0, 8)}`;
  seed.$hash = h;
  seed.$lineage = { generation: 1, operators: [`inverse:${modality}`], parents: [] };

  for (const [name, gene] of Object.entries(genes)) {
    const gt = name === 'palette' ? GeneType.COLOR
      : gene.type === 'scalar' ? GeneType.STRUCTURE
      : GeneType.DATA;
    seed.setGene(gt, gene.value as import('../../seeds').GeneValue, { name, mutable: true, dominant: false, hidden: false, locked: false, mutationRate: 0.01 });
  }

  return seed;
}

function failure(modality: Modality, typed: InverseFailure['typed'], message: string, branches: InverseCandidateBranch[]): InverseResult {
  return { failure: { typed, message, candidateBranches: branches } };
}

// ─── 5 REAL HANDLERS ──────────────────────────────────────────────────────

function handleText(input: unknown): InverseResult {
  const text = typeof input === 'string' ? input : (input as any)?.text ?? '';
  if (!text || text.length < 3) {
    return failure('text', 'insufficient-input', 'Text input too short for meaningful gene extraction', [
      { label: 'longer-description', description: 'Provide at least a sentence describing the artifact', confidence: 0.9 },
      { label: 'keywords', description: 'Use comma-separated keywords for domain, style, mood', confidence: 0.7 },
    ]);
  }

  const rng = newRng('text', text);
  const desc = text.toLowerCase();

  const keywords = desc.split(/[\s,.;!?]+/).filter((w: string) => w.length > 3);
  const domainHints = ['fantasy', 'sci-fi', 'horror', 'nature', 'urban', 'abstract', 'medieval', 'futuristic', 'steampunk', 'cyberpunk'];
  const matchedDomain = domainHints.find(d => desc.includes(d));

  const toneKeywords = ['dark', 'bright', 'somber', 'joyful', 'chaotic', 'calm', 'mysterious', 'whimsical'];
  const matchedTone = toneKeywords.find(t => desc.includes(t));

  const genes: Record<string, { type: string; value: unknown }> = {
    complexity: { type: 'scalar', value: 0.3 + rng.nextF64() * 0.5 },
    style: { type: 'categorical', value: matchedDomain ?? rng.nextChoice(domainHints) },
    tone: { type: 'categorical', value: matchedTone ?? 'neutral' },
    keywordCount: { type: 'scalar', value: Math.min(keywords.length / 20, 1) },
    confidence: { type: 'scalar', value: 0.6 },
  };

  const seed = buildSeed('text', text, genes, rng);
  return { seed, domain: 'narrative', confidence: 0.6 };
}

function handleCode(input: unknown): InverseResult {
  const source = typeof input === 'string' ? input : (input as any)?.source ?? '';
  if (!source || source.length < 10) {
    return failure('code', 'insufficient-input', 'Code input too short for language detection', [
      { label: 'full-source', description: 'Paste at least 10 lines of source code', confidence: 0.9 },
      { label: 'language-hint', description: 'Specify language name in the input', confidence: 0.7 },
    ]);
  }

  const rng = newRng('code', source);

  const langPatterns: Record<string, RegExp> = {
    typescript: /\b(interface|type|export|import|as|const|let|=>)\b/,
    javascript: /\b(const|let|var|function|=>|require|module\.exports)\b/,
    python: /\b(def |class |import |from |return |print\()/,
    rust: /\b(fn |let mut|impl |pub |struct |enum )/,
    go: /\b(func |package |import |:=|defer )/,
    java: /\b(public |private |class |void |static )/,
    cpp: /\b(#include|int main|template|std::|auto )/,
    solidity: /\b(pragma |contract |mapping|address |uint256)\b/,
  };

  let detectedLang = 'unknown';
  let maxScore = 0;
  for (const [lang, pattern] of Object.entries(langPatterns)) {
    const matches = (source.match(pattern) ?? []).length;
    if (matches > maxScore) {
      maxScore = matches;
      detectedLang = lang;
    }
  }

  const lineCount = source.split('\n').length;
  const hasClasses = /\b(class|interface|contract|struct)\b/.test(source);
  const hasFunctions = /\b(fn |function |def |func )\b/.test(source);

  const genes: Record<string, { type: string; value: unknown }> = {
    language: { type: 'categorical', value: detectedLang },
    lineCount: { type: 'scalar', value: Math.min(lineCount / 1000, 1) },
    hasClasses: { type: 'scalar', value: hasClasses ? 1 : 0 },
    hasFunctions: { type: 'scalar', value: hasFunctions ? 1 : 0 },
    complexity: { type: 'scalar', value: 0.3 + rng.nextF64() * 0.4 },
  };

  const seed = buildSeed('code', source, genes, rng);
  return { seed, domain: 'app', confidence: 0.7 + (detectedLang !== 'unknown' ? 0.2 : 0) };
}

function handle3d(input: unknown): InverseResult {
  const mesh = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const vertexCount = typeof mesh.vertices === 'number' ? mesh.vertices
    : Array.isArray(mesh.vertices) ? mesh.vertices.length
    : 0;
  const faceCount = typeof mesh.faces === 'number' ? mesh.faces
    : Array.isArray(mesh.faces) ? mesh.faces.length
    : 0;

  if (vertexCount === 0 && faceCount === 0) {
    return failure('3d', 'insufficient-input', 'No mesh geometry data found', [
      { label: 'mesh-stats', description: 'Provide vertex count, face count, and bounding box', confidence: 0.8 },
      { label: 'gltf-summary', description: 'Pass a GLTF JSON with accessors/min/max', confidence: 0.7 },
    ]);
  }

  const rng = newRng('3d', input);
  const ratio = faceCount > 0 ? vertexCount / faceCount : 0.5;

  const genes: Record<string, { type: string; value: unknown }> = {
    vertexCount: { type: 'scalar', value: Math.min(vertexCount / 100000, 1) },
    faceCount: { type: 'scalar', value: Math.min(faceCount / 100000, 1) },
    vertexFaceRatio: { type: 'scalar', value: Math.min(ratio, 1) },
    detail: { type: 'scalar', value: 0.3 + rng.nextF64() * 0.5 },
    symmetry: { type: 'scalar', value: rng.nextF64() },
  };

  const seed = buildSeed('3d', input, genes, rng);
  return { seed, domain: 'geometry3d', confidence: 0.75 };
}

function handleMap(input: unknown): InverseResult {
  const mapData = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const lat = typeof mapData.latitude === 'number' ? mapData.latitude
    : typeof (mapData as any).lat === 'number' ? (mapData as any).lat
    : undefined;
  const lon = typeof mapData.longitude === 'number' ? mapData.longitude
    : typeof (mapData as any).lng === 'number' ? (mapData as any).lng
    : typeof (mapData as any).lon === 'number' ? (mapData as any).lon
    : undefined;

  if (lat === undefined || lon === undefined) {
    return failure('map', 'insufficient-input', 'No coordinate data found', [
      { label: 'lat-lon', description: 'Provide latitude and longitude coordinates', confidence: 0.9 },
      { label: 'geojson', description: 'Provide a GeoJSON Feature or FeatureCollection', confidence: 0.8 },
      { label: 'place-name', description: 'Provide a place name for geocoding', confidence: 0.5 },
    ]);
  }

  const rng = newRng('map', input);
  const absLat = Math.abs(lat) / 90;
  const absLon = Math.abs(lon) / 180;

  const genes: Record<string, { type: string; value: unknown }> = {
    latitude: { type: 'scalar', value: absLat },
    longitude: { type: 'scalar', value: absLon },
    biome: { type: 'categorical', value: absLat > 0.6 ? 'polar' : absLat > 0.3 ? 'temperate' : 'tropical' },
    terrain: { type: 'scalar', value: rng.nextF64() },
    seaLevel: { type: 'scalar', value: rng.nextF64() },
  };

  const seed = buildSeed('map', input, genes, rng);
  return { seed, domain: 'world', confidence: 0.7 };
}

function handleSensor(input: unknown): InverseResult {
  const data = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const values = Array.isArray(data.values) ? data.values
    : Array.isArray(data.readings) ? data.readings
    : [];

  if (values.length === 0 && typeof data.value !== 'number') {
    return failure('sensor', 'insufficient-input', 'No sensor readings found', [
      { label: 'time-series', description: 'Provide an array of numeric readings', confidence: 0.9 },
      { label: 'single-value', description: 'Provide a single sensor value with unit metadata', confidence: 0.6 },
    ]);
  }

  const rng = newRng('sensor', input);
  const numericValues = values.filter((v: unknown): v is number => typeof v === 'number');
  const mean = numericValues.length > 0 ? numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length : (data.value as number ?? 0);
  const variance = numericValues.length > 1 ? numericValues.reduce((acc: number, v: number) => acc + (v - mean) ** 2, 0) / numericValues.length : 0;

  const genes: Record<string, { type: string; value: unknown }> = {
    mean: { type: 'scalar', value: Math.min(Math.abs(mean) / 100, 1) },
    variance: { type: 'scalar', value: Math.min(variance / 100, 1) },
    sampleCount: { type: 'scalar', value: Math.min(numericValues.length / 1000, 1) },
    signalEnergy: { type: 'scalar', value: 0.3 + rng.nextF64() * 0.5 },
    noiseLevel: { type: 'scalar', value: rng.nextF64() },
  };

  const seed = buildSeed('sensor', input, genes, rng);
  return { seed, domain: 'physics', confidence: 0.65 };
}

// ─── 10 STUBS WITH FAILURE UX ────────────────────────────────────────────

function stubWithBranches(modality: Modality, input: unknown): InverseResult {
  const branchMap: Partial<Record<Modality, InverseCandidateBranch[]>> = {
    image: [
      { label: 'pixel-data', description: 'Pass raw RGBA pixel data as Uint8Array', confidence: 0.9 },
      { label: 'base64-png', description: 'Provide a base64-encoded PNG data URL', confidence: 0.8 },
    ],
    audio: [
      { label: 'wav-buffer', description: 'Pass a WAV buffer with PCM samples', confidence: 0.9 },
      { label: 'sample-array', description: 'Provide Float32Array of audio samples at 44100Hz', confidence: 0.7 },
    ],
    video: [
      { label: 'frame-sequence', description: 'Provide an array of RGBA frame buffers', confidence: 0.8 },
      { label: 'video-stats', description: 'Pass frame count, dimensions, and FPS metadata', confidence: 0.7 },
    ],
    midi: [
      { label: 'midi-bytes', description: 'Pass raw MIDI file bytes', confidence: 0.9 },
      { label: 'note-sequence', description: 'Provide an array of {note, velocity, duration} objects', confidence: 0.8 },
    ],
    'game-replay': [
      { label: 'replay-frames', description: 'Provide an array of game state snapshots', confidence: 0.8 },
      { label: 'replay-summary', description: 'Pass aggregate stats: score, duration, moves', confidence: 0.6 },
    ],
    genome: [
      { label: 'dna-sequence', description: 'Provide a string of ACGT nucleotides', confidence: 0.9 },
      { label: 'gene-expression', description: 'Pass an array of gene expression levels', confidence: 0.7 },
    ],
    legal: [
      { label: 'contract-text', description: 'Paste the full legal document text', confidence: 0.9 },
      { label: 'clause-summary', description: 'Summarize key clauses: parties, terms, jurisdiction', confidence: 0.6 },
    ],
    'cultural-corpus': [
      { label: 'corpus-texts', description: 'Provide an array of source text strings', confidence: 0.8 },
      { label: 'corpus-metadata', description: 'Pass document count, language, and date range', confidence: 0.6 },
    ],
    historical: [
      { label: 'timeline-events', description: 'Provide an array of {date, event, significance} objects', confidence: 0.8 },
      { label: 'historical-text', description: 'Paste a historical document or account', confidence: 0.7 },
    ],
    'mind-transcript': [
      { label: 'thought-stream', description: 'Provide an array of thought strings in sequence', confidence: 0.8 },
      { label: 'reflection-text', description: 'Paste a free-form reflective journal entry', confidence: 0.7 },
    ],
  };

  return failure(modality, 'unsupported-modality',
    `Direct inversion of ${modality} requires an ML model (not yet wired). Use structural mapping instead.`,
    branchMap[modality] ?? [{ label: 'text-description', description: 'Describe the content as text for keyword-based inversion', confidence: 0.5 }],
  );
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────

export function toSeed(modality: Modality, input: unknown): InverseResult {
  const handlers: Record<string, (input: unknown) => InverseResult> = {
    'text': handleText,
    'code': handleCode,
    '3d': handle3d,
    'map': handleMap,
    'sensor': handleSensor,
  };

  const handler = handlers[modality];
  if (handler) return handler(input);

  return stubWithBranches(modality, input);
}

export async function toSeedAsync(modality: Modality, input: unknown): Promise<InverseResult> {
  return Promise.resolve(toSeed(modality, input));
}

export function invertAll(inputs: { modality: Modality; data: unknown }[]): InverseResult[] {
  return inputs.map(i => toSeed(i.modality, i.data));
}

export function listModalities(): Modality[] {
  return [...ALL_MODALITIES];
}

export function hasRealHandler(modality: Modality): boolean {
  return ['text', 'code', '3d', 'map', 'sensor'].includes(modality);
}
