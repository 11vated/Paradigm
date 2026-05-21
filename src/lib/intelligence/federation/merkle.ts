/**
 * Append-only Merkle tree — used for ZK-style canon membership proofs.
 *
 * Given a sequence of leaf hashes (content hashes of GraphNodes), build a
 * binary Merkle tree where each internal node is sha256(left || right).
 * Generate an inclusion proof = the sibling path from a leaf to the root.
 *
 * Brief 091 calls these "ZK-ish" because the proof reveals only sibling
 * hashes, not the rest of the canon. For a true ZK SNARK you'd swap the
 * sha256 chain for a circuit-friendly hash (Poseidon) and prove the
 * recompute in a SNARK. That's beyond v1.
 */
import { createHash } from 'node:crypto';

function h(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function concatHash(a: string, b: string): string {
  return h(Buffer.from(a + b, 'hex'));
}

export interface InclusionProof {
  leaf: string;        // leaf hash
  index: number;       // 0-indexed position in the leaf array
  siblings: string[];  // bottom→top sibling hashes
  root: string;        // computed root for convenience
}

export class MerkleTree {
  readonly leaves: string[];
  readonly levels: string[][];

  constructor(leaves: string[]) {
    if (leaves.length === 0) throw new Error('MerkleTree requires at least one leaf');
    this.leaves = leaves;
    this.levels = [leaves];
    let level = leaves;
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const l = level[i];
        const r = i + 1 < level.length ? level[i + 1] : l;  // duplicate odd tail
        next.push(concatHash(l, r));
      }
      this.levels.push(next);
      level = next;
    }
  }

  get root(): string { return this.levels[this.levels.length - 1][0]; }

  proveByIndex(index: number): InclusionProof {
    if (index < 0 || index >= this.leaves.length) throw new Error('index out of range');
    const siblings: string[] = [];
    let idx = index;
    for (let lv = 0; lv < this.levels.length - 1; lv++) {
      const level = this.levels[lv];
      const isLeftChild = idx % 2 === 0;
      const sibIdx = isLeftChild ? idx + 1 : idx - 1;
      siblings.push(sibIdx < level.length ? level[sibIdx] : level[idx]);
      idx = Math.floor(idx / 2);
    }
    return { leaf: this.leaves[index], index, siblings, root: this.root };
  }

  proveByLeaf(leaf: string): InclusionProof | null {
    const idx = this.leaves.indexOf(leaf);
    return idx === -1 ? null : this.proveByIndex(idx);
  }
}

export function verifyInclusion(proof: InclusionProof, expectedRoot: string): boolean {
  let h = proof.leaf;
  let idx = proof.index;
  for (const sib of proof.siblings) {
    h = idx % 2 === 0 ? concatHash(h, sib) : concatHash(sib, h);
    idx = Math.floor(idx / 2);
  }
  return h === expectedRoot && proof.root === expectedRoot;
}
