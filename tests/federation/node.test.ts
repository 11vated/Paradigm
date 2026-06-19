import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FederatedNode, createDeterministicNodeId } from '../../src/lib/federation/node';
import { setKernelClockMode, __resetKernelClockForTests } from '../../src/lib/kernel/clock';
import fs from 'node:fs';
import path from 'node:path';

const TEST_STATE_DIR = path.join('tmp-test', 'federation');

describe('FederatedNode', () => {
  beforeEach(() => {
    __resetKernelClockForTests();
    setKernelClockMode('counter');
    // Clean federated state so tests don't leak into each other
    try { fs.rmSync(TEST_STATE_DIR, { recursive: true, force: true }); } catch { /* ok */ }
  });

  it('creates a node with ECDSA P-256 keypair', () => {
    const node = new FederatedNode({ nodeId: 'test-node', stateDir: TEST_STATE_DIR });
    expect(node.nodeId).toBe('test-node');
    expect(node.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(node.privateKeyPem).toContain('BEGIN PRIVATE KEY');
  });

  it('exchangeSeed creates a signed FedV1Exchange', () => {
    const alice = new FederatedNode({ nodeId: 'alice', stateDir: TEST_STATE_DIR });
    const exchange = alice.exchangeSeed('seed-hash-1', ['anc-0'], 'bob');
    expect(exchange.fromNode).toBe('alice');
    expect(exchange.toNode).toBe('bob');
    expect(exchange.seedHash).toBe('seed-hash-1');
    expect(exchange.signature).toBeTruthy();
    expect(exchange.merkleRoot).toBeTruthy();
  });

  it('verifyExchange confirms a valid exchange', () => {
    const alice = new FederatedNode({ nodeId: 'alice', stateDir: TEST_STATE_DIR });
    const exchange = alice.exchangeSeed('verify-seed', ['anc-0'], 'bob');
    const valid = alice.verifyExchange(exchange);
    expect(valid).toBe(true);
  });

  it('mergeLineage preserves union lineage', () => {
    const alice = new FederatedNode({ nodeId: 'alice', stateDir: TEST_STATE_DIR });
    const bob = new FederatedNode({ nodeId: 'bob', stateDir: TEST_STATE_DIR });

    const ex = alice.exchangeSeed('merge-seed', ['anc-a'], 'bob');
    const merged = bob.mergeLineage(ex, 'merge-seed-local', ['anc-b']);
    expect(merged.success).toBe(true);
    expect(merged.lineage).toContain('anc-a');
    expect(merged.lineage).toContain('anc-b');
  });

  it('forkLineage creates a deterministic fork', () => {
    const node = new FederatedNode({ nodeId: 'fork-node', stateDir: TEST_STATE_DIR });
    const fork = node.forkLineage('source-seed', ['anc-0', 'source-seed']);
    expect(fork.success).toBe(true);
    expect(fork.forkedSeedId).toMatch(/^fork-/);
    expect(fork.newLineage).toContain('source-seed');
  });

  it('getState returns a snapshot with node info', () => {
    const node = new FederatedNode({ nodeId: 'state-node', stateDir: TEST_STATE_DIR });
    const state = node.getState();
    expect(state.nodes['state-node']).toBeDefined();
    expect(state.nodes['state-node'].nodeId).toBe('state-node');
  });

  it('getExchanges returns exchanges for this node', () => {
    const node = new FederatedNode({ nodeId: 'ex-node', stateDir: TEST_STATE_DIR });
    node.exchangeSeed('seed-1', [], 'other');
    node.exchangeSeed('seed-2', [], 'other');
    const exchanges = node.getExchanges();
    expect(exchanges.length).toBe(2);
  });

  it('info returns correct metadata', () => {
    const node = new FederatedNode({ nodeId: 'info-node', label: 'Info Test', stateDir: TEST_STATE_DIR });
    const info = node.info;
    expect(info.nodeId).toBe('info-node');
    expect(info.label).toBe('Info Test');
    expect(info.publicKeyPem).toBe(node.publicKeyPem);
  });
});

describe('createDeterministicNodeId', () => {
  it('returns a deterministic node id from seed material', () => {
    const id1 = createDeterministicNodeId('hello');
    const id2 = createDeterministicNodeId('hello');
    const id3 = createDeterministicNodeId('world');
    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
  });
});
