/**
 * FriendSovereigntyCard — sign + verify a Friend inline in the Studio.
 *
 * The user can generate a keypair, sign the currently-selected Friend,
 * verify it, and rotate the receipt. Private keys never leave the
 * browser session (we do NOT persist them); the server never stores
 * them either (it only consumes them per-request to produce the sig).
 */

import React, { useEffect, useState } from 'react';
import type { FriendSeedData } from '@/lib/friend';
import { friendApi, type FriendKeyPair } from './api';

export interface FriendSovereigntyCardProps {
  friend: FriendSeedData | null;
  onFriendUpdated?: (f: FriendSeedData) => void;
}

const LS_KEY = 'paradigm.friend.keypair';

function loadKeyPair(): FriendKeyPair | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveKeyPair(kp: FriendKeyPair): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(kp)); } catch { /* private mode etc */ }
}

function clearKeyPair(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* */ }
}

async function fingerprintPublicKey(pubJwk: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(pubJwk));
    const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 12);
  } catch { return '??'; }
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; what: string }
  | { kind: 'ok'; what: string }
  | { kind: 'err'; msg: string };

export const FriendSovereigntyCard: React.FC<FriendSovereigntyCardProps> = ({ friend, onFriendUpdated }) => {
  const [kp, setKp] = useState<FriendKeyPair | null>(null);
  const [fp, setFp] = useState<string>('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string; payloadHash?: string } | null>(null);
  const [preparedAnchor, setPreparedAnchor] = useState<{ tokenId: string; metadataHash: string; metadataUri: string } | null>(null);

  useEffect(() => {
    const existing = loadKeyPair();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    setKp(existing);
    if (existing) fingerprintPublicKey(existing.publicKey).then(setFp);
  }, []);

  const genKeys = async () => {
    setStatus({ kind: 'busy', what: 'generating keys' });
    try {
      const fresh = await friendApi.generateKeys();
      saveKeyPair(fresh);
      setKp(fresh);
      setFp(await fingerprintPublicKey(fresh.publicKey));
      setStatus({ kind: 'ok', what: 'keypair generated' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e.message ?? String(e) });
    }
  };

  const sign = async () => {
    if (!friend || !kp) return;
    setStatus({ kind: 'busy', what: 'signing' });
    try {
      const r = await friendApi.sign(friend.id, { publicKey: kp.publicKey, privateKey: kp.privateKey });
      onFriendUpdated?.(r.friendSeed);
      setStatus({ kind: 'ok', what: 'signed' });
      setVerifyResult(null);
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e.message ?? String(e) });
    }
  };

  const verify = async () => {
    if (!friend) return;
    setStatus({ kind: 'busy', what: 'verifying' });
    try {
      const r = await friendApi.verify(friend.id);
      setVerifyResult(r);
      setStatus({ kind: 'ok', what: r.valid ? 'verified' : 'verification failed' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e.message ?? String(e) });
    }
  };

  const forgetKeys = () => {
    clearKeyPair();
    setKp(null);
    setFp('');
    setStatus({ kind: 'idle' });
  };

  const prepareAnchor = async () => {
    if (!friend) return;
    setStatus({ kind: 'busy', what: 'preparing anchor' });
    try {
      const p = await friendApi.anchorPrepare(friend.id);
      setPreparedAnchor({ tokenId: p.tokenId, metadataHash: p.metadataHash, metadataUri: p.metadataUri });
      setStatus({ kind: 'ok', what: 'anchor prepared' });
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e.message ?? String(e) });
    }
  };

  if (!friend) {
    return <div className="text-[10px] font-mono text-neutral-600 p-3 text-center">No friend selected.</div>;
  }

  const sov = friend.sovereignty;

  return (
    <div className="flex flex-col gap-2 p-2 bg-neutral-950 text-white text-[10px] font-mono">
      <div className="text-accent">Sovereignty</div>

      {/* Friend's current receipt */}
      <div className="border border-neutral-900 rounded p-2 space-y-0.5">
        <div className="text-neutral-500">Current receipt</div>
        {sov ? (
          <>
            <div className="flex justify-between"><span className="text-neutral-700">algorithm</span><span>{sov.algorithm}</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">payload</span><span className="truncate">{sov.payloadHash.slice(0, 16)}…</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">author</span><span className="truncate" title={sov.author}>{sov.author.slice(0, 24)}…</span></div>
            <div className="flex justify-between"><span className="text-neutral-700">signed</span><span>{new Date(sov.signedAt).toISOString().slice(0, 19)}Z</span></div>
          </>
        ) : (
          <div className="text-neutral-600">unsigned</div>
        )}
      </div>

      {/* Session keypair */}
      <div className="border border-neutral-900 rounded p-2 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-neutral-500">Session keypair</span>
          {kp ? (
            <button onClick={forgetKeys} className="text-neutral-600 hover:text-red-400 text-[9px]">forget</button>
          ) : (
            <button onClick={genKeys} className="px-1.5 py-0.5 bg-accent/20 text-accent hover:bg-accent/30 rounded text-[9px]">
              generate
            </button>
          )}
        </div>
        {kp && (
          <div className="text-neutral-600 text-[9px]">
            fingerprint <span className="text-neutral-400">{fp}…</span> · private key cached in this browser only
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={sign}
          disabled={!kp || status.kind === 'busy'}
          className="flex-1 px-2 py-1 bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed rounded text-[10px]"
        >
          {sov ? 'Re-sign' : 'Sign'}
        </button>
        <button
          onClick={verify}
          disabled={!sov || status.kind === 'busy'}
          className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-[10px]"
        >
          Verify
        </button>
      </div>

      {/* Verify result */}
      {verifyResult && (
        <div className={`border rounded p-2 ${verifyResult.valid ? 'border-emerald-800 text-emerald-300' : 'border-red-900 text-red-400'}`}>
          {verifyResult.valid ? '✓ valid' : `✗ ${verifyResult.reason ?? 'invalid'}`}
        </div>
      )}

      {/* On-chain anchor */}
      <div className="border border-neutral-900 rounded p-2 space-y-1">
        <div className="text-neutral-500 flex justify-between items-center">
          <span>On-chain anchor</span>
          {!friend.sovereignty?.anchor && (
            <button
              onClick={prepareAnchor}
              disabled={!sov || status.kind === 'busy'}
              className="px-1.5 py-0.5 text-[9px] bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800 disabled:opacity-30 disabled:cursor-not-allowed rounded"
              title={sov ? 'Compute the deterministic tokenId + metadata for this friend' : 'Sign first'}
            >
              prepare
            </button>
          )}
        </div>
        {friend.sovereignty?.anchor ? (
          <>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">network</span><span>{friend.sovereignty.anchor.network}</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">tokenId</span><span className="truncate" title={friend.sovereignty.anchor.tokenId}>{friend.sovereignty.anchor.tokenId.slice(0, 16)}…</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">tx</span><span className="truncate" title={friend.sovereignty.anchor.transactionHash}>{friend.sovereignty.anchor.transactionHash.slice(0, 12)}…</span></div>
          </>
        ) : preparedAnchor ? (
          <>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">tokenId</span><span className="truncate" title={preparedAnchor.tokenId}>{preparedAnchor.tokenId.slice(0, 16)}…</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">md hash</span><span className="truncate" title={preparedAnchor.metadataHash}>{preparedAnchor.metadataHash.slice(0, 12)}…</span></div>
            <div className="flex justify-between gap-2"><span className="text-neutral-700">uri</span><span>{preparedAnchor.metadataUri.startsWith('ipfs://') ? 'ipfs' : 'data:'}</span></div>
          </>
        ) : (
          <div className="text-neutral-600">{sov ? 'click prepare to compute tokenId' : 'sign first to anchor'}</div>
        )}
      </div>

      {/* Status line */}
      <div className="text-[9px] text-neutral-600 h-3">
        {status.kind === 'busy' && `· ${status.what}…`}
        {status.kind === 'ok' && `· ${status.what}`}
        {status.kind === 'err' && <span className="text-red-400">· {status.msg}</span>}
      </div>
    </div>
  );
};
