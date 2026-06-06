/**
 * Federated knowledge graph — public barrel (Briefs 090 / 091).
 */
export * from './types';
export { canonicalize, contentHashOf, InMemoryContentStore, InMemoryGraphStore } from './content-store';
export { MerkleTree, verifyInclusion, type InclusionProof } from './merkle';
export { gatherReferences, type ReferenceLoopDeps, type GatherResult } from './reference-loop';
export {
  type FedWsEnvelope,
  type FedWsMetrics,
  type FedWsServerDeps,
  type FederationWsClientOptions,
  type FederationWsClientEvents,
  type RealTwoNodeWsResult,
  createFedWsMetrics,
  registerFederationWebsocket,
  FederationWebSocketClient,
  performRealTwoNodeFedExchangeOverWs,
  runLocalFedWsSmoke,
} from './transport';
