import { describe, it, expect, beforeEach } from 'vitest';
import { createLedgerEntry, verifyLedgerEntry, InMemoryLedger } from '../../src/lib/economics/ledger';
import type { RoyaltySplit } from '../../src/lib/sovereignty/economics-types';

describe('createLedgerEntry', () => {
  const splits: RoyaltySplit[] = [
    { ancestorId: 'creator-a', ancestorHash: 'hash-a', generation: 0, royaltyPercent: 10 },
  ];

  it('produces a structurally valid entry', () => {
    const tx = createLedgerEntry({
      seedId: 'seed-1',
      seedHash: 'hash-seed-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      amount: 1000,
      currency: 'PARA',
      splits,
    });
    expect(tx.transactionId).toMatch(/^[0-9a-f]{16}$/);
    expect(tx.signature).toMatch(/^[0-9a-f]{32}$/);
    expect(tx.seedId).toBe('seed-1');
    expect(tx.amount).toBe(1000);
    expect(tx.currency).toBe('PARA');
    expect(tx.timestamp).toBeGreaterThan(0);
  });

  it('accepts optional signature override', () => {
    const tx = createLedgerEntry({
      seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's',
      amount: 100, currency: 'USD', splits, signature: 'custom-sig-123',
    });
    expect(tx.signature).toBe('custom-sig-123');
  });
});

describe('verifyLedgerEntry', () => {
  const splits: RoyaltySplit[] = [
    { ancestorId: 'creator-a', ancestorHash: 'hash-a', generation: 0, royaltyPercent: 10, amount: 100 },
  ];

  it('accepts a valid entry', () => {
    const tx = createLedgerEntry({
      seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's',
      amount: 1000, currency: 'PARA', splits,
    });
    expect(verifyLedgerEntry(tx)).toBe(true);
  });

  it('rejects entry with empty transactionId', () => {
    const tx = createLedgerEntry({ seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's', amount: 100, currency: 'PARA', splits });
    expect(verifyLedgerEntry({ ...tx, transactionId: '' })).toBe(false);
  });

  it('rejects entry with no splits', () => {
    const tx = createLedgerEntry({ seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's', amount: 100, currency: 'PARA', splits });
    expect(verifyLedgerEntry({ ...tx, splits: [] })).toBe(false);
  });
});

describe('InMemoryLedger', () => {
  let ledger: InMemoryLedger;

  beforeEach(() => {
    ledger = new InMemoryLedger();
  });

  it('starts empty', () => {
    expect(ledger.all()).toHaveLength(0);
  });

  it('tracks transactions', () => {
    const splits: RoyaltySplit[] = [{ ancestorId: 'ca', ancestorHash: 'ha', generation: 0, royaltyPercent: 10 }];
    const tx = createLedgerEntry({ seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's', amount: 100, currency: 'PARA', splits });
    ledger.append(tx);
    expect(ledger.all()).toHaveLength(1);
  });

  it('filters by seed hash', () => {
    const splits: RoyaltySplit[] = [{ ancestorId: 'ca', ancestorHash: 'ha', generation: 0, royaltyPercent: 10 }];
    const tx1 = createLedgerEntry({ seedId: 's1', seedHash: 'h1', buyerId: 'b', sellerId: 's', amount: 100, currency: 'PARA', splits });
    const tx2 = createLedgerEntry({ seedId: 's2', seedHash: 'h2', buyerId: 'b', sellerId: 's', amount: 100, currency: 'PARA', splits });
    ledger.append(tx1);
    ledger.append(tx2);
    expect(ledger.forSeed('h1')).toHaveLength(1);
    expect(ledger.forSeed('h2')).toHaveLength(1);
  });

  it('filters by creator', () => {
    const tx = createLedgerEntry({ seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's', amount: 100, currency: 'PARA', splits: [{ ancestorId: 'creator-x', ancestorHash: 'hx', generation: 0, royaltyPercent: 10 }] });
    ledger.append(tx);
    expect(ledger.forCreator('creator-x')).toHaveLength(1);
    expect(ledger.forCreator('creator-y')).toHaveLength(0);
  });

  it('snapshot aggregates totals', () => {
    const splits: RoyaltySplit[] = [{ ancestorId: 'ca', ancestorHash: 'ha', generation: 0, royaltyPercent: 10, amount: 50 }];
    ledger.append(createLedgerEntry({ seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's', amount: 500, currency: 'PARA', splits }));
    const snap = ledger.snapshot();
    expect(snap.totalDistributed).toBeGreaterThan(0);
    expect(snap.byCreator['ca']).toBeDefined();
  });

  it('clear removes all entries', () => {
    const splits: RoyaltySplit[] = [{ ancestorId: 'ca', ancestorHash: 'ha', generation: 0, royaltyPercent: 10 }];
    ledger.append(createLedgerEntry({ seedId: 's', seedHash: 'h', buyerId: 'b', sellerId: 's', amount: 100, currency: 'PARA', splits }));
    ledger.clear();
    expect(ledger.all()).toHaveLength(0);
  });
});
