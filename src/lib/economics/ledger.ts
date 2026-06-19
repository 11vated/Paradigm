import { createHash } from 'node:crypto';
import { kernelNow } from '../kernel/clock.js';
import type { RoyaltyTransaction, RoyaltySplit, RoyaltyLedger } from '../sovereignty/economics-types.js';

export interface CreateLedgerEntryParams {
  seedId: string;
  seedHash: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: 'PARA' | 'ETH' | 'USD';
  splits: RoyaltySplit[];
  signature?: string;
}

export function createLedgerEntry(params: CreateLedgerEntryParams): RoyaltyTransaction {
  const transactionId = createHash('sha256')
    .update(`${params.seedHash}:${params.buyerId}:${params.sellerId}:${params.amount}:${kernelNow()}`)
    .digest('hex')
    .slice(0, 16);

  const sigInput = `${transactionId}:${params.seedHash}:${params.amount}:${params.buyerId}:${params.sellerId}`;
  const signature = params.signature ?? createHash('sha256').update(sigInput).digest('hex').slice(0, 32);

  return {
    transactionId,
    seedId: params.seedId,
    seedHash: params.seedHash,
    buyerId: params.buyerId,
    sellerId: params.sellerId,
    amount: params.amount,
    currency: params.currency,
    splits: params.splits,
    timestamp: kernelNow(),
    signature,
  };
}

export function verifyLedgerEntry(tx: RoyaltyTransaction): boolean {
  if (!tx.transactionId || !tx.seedHash || !tx.signature) return false;
  if (tx.splits.length === 0) return false;
  const splitsTotal = tx.splits.reduce((sum, s) => sum + s.amount, 0);
  if (splitsTotal > tx.amount + 0.01) return false;
  return true;
}

export class InMemoryLedger {
  private transactions: RoyaltyTransaction[] = [];

  append(tx: RoyaltyTransaction): void {
    this.transactions.push(tx);
  }

  all(): RoyaltyTransaction[] {
    return [...this.transactions];
  }

  forSeed(seedHash: string): RoyaltyTransaction[] {
    return this.transactions.filter(tx => tx.seedHash === seedHash);
  }

  forCreator(creatorId: string): RoyaltyTransaction[] {
    return this.transactions.filter(tx =>
      tx.splits.some(s => s.ancestorId === creatorId),
    );
  }

  snapshot(): RoyaltyLedger {
    const byCreator: Record<string, number> = {};
    const byAncestor: Record<string, number> = {};
    let totalDistributed = 0;

    for (const tx of this.transactions) {
      for (const split of tx.splits) {
        byCreator[split.ancestorId] = (byCreator[split.ancestorId] ?? 0) + split.amount;
        byAncestor[split.ancestorHash] = (byAncestor[split.ancestorHash] ?? 0) + split.amount;
        totalDistributed += split.amount;
      }
    }

    return { transactions: this.transactions, totalDistributed, byCreator, byAncestor };
  }

  clear(): void {
    this.transactions = [];
  }
}
