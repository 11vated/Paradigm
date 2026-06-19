import crypto from 'node:crypto';
import { kernelNowIso } from '../kernel/clock.js';
import { SovereigntyLayer, createFedV1SignedExchange, detMergeFed, detForkFed, verifyFedV1Exchange, type FedV1Exchange } from '../sovereignty/index.js';
import { FederationStateStore, type FederationState } from '../sovereignty/federation-state.js';

export interface FederatedNodeConfig {
  nodeId: string;
  label?: string;
  stateDir?: string;
}

export interface FederatedNodeInfo {
  nodeId: string;
  publicKeyPem: string;
  label?: string;
  exchangeCount: number;
  seedHashes: string[];
  createdAt: string;
}

export class FederatedNode {
  readonly nodeId: string;
  readonly publicKeyPem: string;
  readonly privateKeyPem: string;
  readonly label?: string;
  private store: FederationStateStore;
  private createdAt: string;

  constructor(config: FederatedNodeConfig) {
    const keys = SovereigntyLayer.generateKeys();
    this.nodeId = config.nodeId;
    this.publicKeyPem = keys.public_key;
    this.privateKeyPem = keys.private_key;
    this.label = config.label;
    this.store = new FederationStateStore(config.stateDir);
    this.createdAt = kernelNowIso();
    this.store.registerNode(this.nodeId, this.publicKeyPem, this.label);
  }

  get info(): FederatedNodeInfo {
    const node = this.store.getNode(this.nodeId);
    return {
      nodeId: this.nodeId,
      publicKeyPem: this.publicKeyPem,
      label: this.label,
      exchangeCount: node?.exchangeCount ?? 0,
      seedHashes: this.store.seedHashes,
      createdAt: this.createdAt,
    };
  }

  exchangeSeed(
    seedHash: string,
    lineage: string[],
    targetNodeId: string,
    richPreview?: { name?: string; summary?: string; visualType?: string; strata?: number; c2paRef?: string; provenanceHash?: string },
  ): FedV1Exchange {
    const exchange = createFedV1SignedExchange(
      this.nodeId,
      targetNodeId,
      seedHash,
      lineage,
      this.privateKeyPem,
      richPreview,
    );
    this.store.appendExchange(exchange);
    return exchange;
  }

  mergeLineage(
    incoming: FedV1Exchange,
    localSeedHash: string,
    localLineage: string[],
  ): ReturnType<typeof detMergeFed> {
    const result = detMergeFed(incoming, localSeedHash, localLineage, this.privateKeyPem);
    if (result.success && result.newExchange) {
      this.store.appendExchange(result.newExchange);
    }
    return result;
  }

  forkLineage(
    sourceSeedHash: string,
    sourceLineage: string[],
  ): ReturnType<typeof detForkFed> {
    const result = detForkFed(sourceSeedHash, sourceLineage, this.privateKeyPem);
    if (result.success && result.forkExchange) {
      this.store.appendExchange(result.forkExchange);
    }
    return result;
  }

  verifyExchange(exchange: FedV1Exchange): boolean {
    const v = verifyFedV1Exchange(exchange, exchange.publicKey);
    return v.sigOk && v.merkleOk;
  }

  getState(): FederationState {
    return this.store.snapshot;
  }

  getExchanges(): FedV1Exchange[] {
    return this.store.getExchangesForNode(this.nodeId);
  }

  getLineage(seedHash: string): ReturnType<FederationStateStore['getLineage']> {
    return this.store.getLineage(seedHash);
  }

  flush(): void {
    this.store.flush();
  }
}

export function createDeterministicNodeId(seedMaterial: string): string {
  return `node-${crypto.createHash('sha256').update(seedMaterial).digest('hex').slice(0, 12)}`;
}
