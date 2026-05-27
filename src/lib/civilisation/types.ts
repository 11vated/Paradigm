/**
 * Civilisation types — Doctrine 16 (GSPL Civilisation Playbook).
 *
 * Every CivilisationBundle is the unit of trade in Paradigm. It composes
 * artifacts across up to 11 strata, signed, lineage-rooted, license-bound.
 */
export type StratumId =
  | 'form' | 'motion' | 'sound' | 'mind' | 'story' | 'world'
  | 'field' | 'culture' | 'time' | 'economy' | 'ritual';

export const ALL_STRATA: ReadonlyArray<StratumId> = [
  'form', 'motion', 'sound', 'mind', 'story', 'world',
  'field', 'culture', 'time', 'economy', 'ritual',
];

export interface StratumArtifact {
  stratumId: StratumId;
  contentHash: string;             // sha256 of bytes
  mime: string;                    // image/png, audio/wav, application/json, ...
  size: number;                    // bytes
  rendererId: string;              // which generator produced this
  rendererVersion: string;         // pinned for reproducibility
  bytesRef: string;                // peer-store CID OR data: URL OR relative path
  bytesB64?: string;               // optional inline base64 if small (< 64KB)
  predicateReport: Record<string, 'pass' | 'fail' | 'unimplemented'>;
  metadata: Record<string, unknown>;
}

export interface CivilisationIntent {
  name: string;
  themePalette?: string[];
  key?: string;
  mode?: string;
  tempo?: number;
  parents?: string[];              // lineage parent civilisation IDs
  custodian?: string;              // address that owns this civilisation
  strataRequested?: StratumId[];   // which strata to render
}

export interface CivilisationBundle {
  schema: 'https://paradigm.ai/schema/civilisation/v1';
  id: string;                      // <name>-<short hash>
  hash: string;                    // sha256 of canonical bundle
  intent: CivilisationIntent;
  intentHash: string;
  strata: Partial<Record<StratumId, StratumArtifact>>;
  conformance: ConformanceReport;
  lineage: { parents: string[]; depth: number };
  manifest: string;                // alias for hash (on-chain anchor)
  createdAt: 0;                    // always 0 (kernel-frozen)
  cliVersion: string;
}

export interface ConformanceReport {
  strataCovered: number;
  predicatesPassed: number;
  predicatesFailed: number;
  predicatesUnimplemented: number;
  perStratum: Array<{ stratumId: StratumId; passed: number; failed: number; unimplemented: number }>;
}
