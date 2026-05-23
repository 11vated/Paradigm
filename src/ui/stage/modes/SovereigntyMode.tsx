import React, { useEffect, useState, useCallback } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';

interface Receipt { signed: boolean; pubkey?: string; signature?: string; signedAt?: string; anchor?: { tx?: string; network?: string; block?: number }; contractScore?: number; }

export const SovereigntyMode: React.FC = () => {
  const seed: any = useActiveSeed((s: any) => s.seed);
  const setSeed = useActiveSeed((s: any) => s.setSeed);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!seed?.id) { setReceipt(null); return; }
    let stale = false;
    fetch('/api/sovereignty/receipt?id=' + encodeURIComponent(seed.id))
      .then((r) => r.json())
      .then((j) => { if (!stale) setReceipt(j); })
      .catch((e) => { if (!stale) setErr(String(e)); });
    return () => { stale = true; };
  }, [seed?.id]);

  const sign = useCallback(async () => {
    if (!seed?.id) return;
    setBusy('sign'); setErr(null);
    try {
      const r = await fetch('/api/seeds/' + seed.id + '/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message ?? r.statusText);
      const r2 = await fetch('/api/sovereignty/receipt?id=' + encodeURIComponent(seed.id));
      setReceipt(await r2.json());
      setSeed({ ...seed, signature: j?.signature ?? receipt?.signature });
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(null); }
  }, [seed, receipt, setSeed]);

  const verify = useCallback(async () => {
    if (!seed?.id) return;
    setBusy('verify'); setErr(null);
    try {
      const r = await fetch('/api/seeds/' + seed.id + '/sovereignty/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message ?? 'verify failed');
      setReceipt({ ...(receipt as Receipt ?? { signed: false }), signed: !!j?.valid });
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(null); }
  }, [seed, receipt]);

  const downloadGseed = useCallback(async () => {
    if (!seed?.id) return;
    setBusy('export'); setErr(null);
    try {
      const r = await fetch('/api/sovereignty/export/gseed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seedId: seed.id }) });
      if (!r.ok) throw new Error('export failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (seed.id ?? 'seed') + '.gseed';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(null); }
  }, [seed]);

  if (!seed) {
    return (<div className="p-sov-empty">No active seed. Select a seed to view its sovereignty receipt.</div>);
  }

  const signed = receipt?.signed === true || !!seed.signature;
  const anchored = !!receipt?.anchor?.tx;

  return (
    <div className="p-sov-page">
      <div className="p-sov-header">
        <SeedGlyph hash={seed.hash ?? seed.$hash ?? ''} domain={seed.domain ?? seed.$domain} size={48} />
        <div className="p-sov-h-stack">
          <div className="p-sov-name">{seed.name ?? seed.$name ?? seed.id}</div>
          <div className="p-sov-meta">
            <span className="p-domain-pill" data-domain={seed.domain ?? seed.$domain}>{seed.domain ?? seed.$domain}</span>
            <span className="p-sov-hash">{(seed.hash ?? seed.$hash ?? '').slice(0, 18)}</span>
            <span className="p-sov-gen">gen {seed.generation ?? 0}</span>
          </div>
        </div>
        <div className="p-sov-status">
          <div className="p-sov-badge" data-state={anchored ? 'anchored' : signed ? 'signed' : 'unsigned'}>
            {anchored ? '⬢ anchored' : signed ? '◆ signed' : '○ unsigned'}
          </div>
          {receipt?.contractScore != null ? (<div className="p-sov-score">contract {receipt.contractScore.toFixed(3)}</div>) : null}
        </div>
      </div>

      {err ? <div className="p-sov-error">{err}</div> : null}

      <div className="p-sov-grid">
        <section className="p-sov-card">
          <header className="p-sov-card-head">SIGNATURE</header>
          <div className="p-sov-card-body">
            {receipt?.signature ? (
              <>
                <div className="p-sov-row"><span className="p-sov-k">algo</span><span className="p-sov-v">ECDSA P-256</span></div>
                {receipt.pubkey ? <div className="p-sov-row"><span className="p-sov-k">pubkey</span><span className="p-sov-v p-sov-mono">{receipt.pubkey.slice(0, 32)}…</span></div> : null}
                <div className="p-sov-row"><span className="p-sov-k">sig</span><span className="p-sov-v p-sov-mono">{(receipt.signature || '').slice(0, 32)}…</span></div>
                {receipt.signedAt ? <div className="p-sov-row"><span className="p-sov-k">at</span><span className="p-sov-v">{receipt.signedAt}</span></div> : null}
              </>
            ) : (<div className="p-sov-empty-row">no signature yet</div>)}
          </div>
          <footer className="p-sov-card-foot">
            <button className="p-sov-action" onClick={sign} disabled={busy != null}>{busy === 'sign' ? 'signing…' : signed ? 're-sign' : 'sign'}</button>
            <button className="p-sov-action" onClick={verify} disabled={busy != null || !signed}>{busy === 'verify' ? 'verifying…' : 'verify'}</button>
          </footer>
        </section>

        <section className="p-sov-card">
          <header className="p-sov-card-head">ON-CHAIN ANCHOR</header>
          <div className="p-sov-card-body">
            {anchored ? (
              <>
                <div className="p-sov-row"><span className="p-sov-k">network</span><span className="p-sov-v">{receipt!.anchor!.network ?? 'paradigm-l1'}</span></div>
                <div className="p-sov-row"><span className="p-sov-k">tx</span><span className="p-sov-v p-sov-mono">{(receipt!.anchor!.tx ?? '').slice(0, 32)}…</span></div>
                {receipt!.anchor!.block ? <div className="p-sov-row"><span className="p-sov-k">block</span><span className="p-sov-v">{receipt!.anchor!.block}</span></div> : null}
              </>
            ) : (<div className="p-sov-empty-row">not yet anchored on-chain</div>)}
          </div>
          <footer className="p-sov-card-foot">
            <span className="p-sov-hint">on-chain anchoring requires wallet — see SDK</span>
          </footer>
        </section>

        <section className="p-sov-card">
          <header className="p-sov-card-head">EXPORT</header>
          <div className="p-sov-card-body">
            <div className="p-sov-export-grid">
              <button className="p-sov-export-btn" onClick={downloadGseed} disabled={busy != null}>.gseed (binary)</button>
              <a className="p-sov-export-btn" href={'/api/seeds/' + seed.id} download={seed.id + '.json'} target="_blank" rel="noreferrer">.json (seed)</a>
              <a className="p-sov-export-btn" href={'/api/seeds/' + seed.id + '/sovereignty/canonical'} download={seed.id + '.canonical.bin'} target="_blank" rel="noreferrer">canonical bytes</a>
              <a className="p-sov-export-btn" href={'/artifacts/' + (seed.domain ?? seed.$domain) + '/' + (seed.domain ?? seed.$domain) + '_' + (seed.hash ?? seed.$hash) + '.svg'} download target="_blank" rel="noreferrer">artifact (svg/html)</a>
            </div>
          </div>
          <footer className="p-sov-card-foot">
            <span className="p-sov-hint">.gseed embeds genes + lineage + sig + outputs</span>
          </footer>
        </section>
      </div>
    </div>
  );
};
