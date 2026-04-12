import { useState } from 'react';
import { generateKeys, signSeed, verifySeed } from '@/services/api';
import { Loader2, Shield, Download, Check, X } from 'lucide-react';

export default function ExportPanel({ seed, onSeedUpdated }) {
  const [keys, setKeys] = useState(null);
  const [signing, setSigning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const handleGenerateKeys = async () => {
    try {
      const k = await generateKeys();
      setKeys(k);
    } catch (e) { console.error(e); }
  };

  const handleSign = async () => {
    if (!seed || !keys || signing) return;
    setSigning(true);
    try {
      const result = await signSeed(seed.id, keys.private_key);
      const updated = { ...seed, $sovereignty: result.sovereignty };
      onSeedUpdated(updated);
      setVerifyResult(result.verified);
    } catch (e) { console.error(e); }
    setSigning(false);
  };

  const handleVerify = async () => {
    if (!seed || verifying || !keys) return;
    setVerifying(true);
    try {
      const result = await verifySeed(seed.id, keys.public_key);
      setVerifyResult(result.verified);
    } catch (e) { console.error(e); }
    setVerifying(false);
  };

  const handleExport = () => {
    if (!seed) return;
    const blob = new Blob([JSON.stringify(seed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(seed.$name || 'seed').replace(/\s+/g, '_')}.gseed`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 space-y-4" data-testid="export-panel">
      <div className="flex items-center gap-2">
        <Shield className="w-3 h-3 text-purple-500" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Sovereignty & Export</span>
      </div>

      {!seed ? (
        <p className="font-mono text-[10px] text-neutral-600">Select a seed to sign or export.</p>
      ) : (
        <>
          {/* Sovereignty */}
          <div className="space-y-2">
            <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">ECDSA P-256 Signing</span>

            {!keys ? (
              <button
                data-testid="generate-keys-btn"
                onClick={handleGenerateKeys}
                className="w-full py-1.5 border border-neutral-800 text-neutral-400 font-mono text-[10px] hover:border-neutral-600 hover:text-white transition-colors"
              >
                Generate Keypair
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="p-2 border border-neutral-900 bg-black/30">
                  <div className="font-mono text-[8px] text-neutral-700 uppercase mb-0.5">Public Key</div>
                  <div className="font-mono text-[9px] text-neutral-500 break-all">{keys.public_key?.slice(0, 50)}...</div>
                </div>
                <button
                  data-testid="sign-seed-btn"
                  onClick={handleSign}
                  disabled={signing}
                  aria-label={signing ? 'Signing seed...' : 'Sign seed with ECDSA P-256'}
                  className="w-full py-1.5 bg-purple-500 text-black font-bold text-[10px] uppercase tracking-wider hover:bg-purple-400 transition-colors disabled:opacity-30 flex items-center justify-center gap-1.5"
                >
                  {signing ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Shield className="w-3 h-3" aria-hidden="true" />}
                  Sign Seed
                </button>
              </div>
            )}

            {seed.$sovereignty?.signature && (
              <div className="space-y-1.5">
                <div className="p-2 border border-emerald-500/20 bg-emerald-500/5">
                  <div className="font-mono text-[8px] text-emerald-500 uppercase mb-0.5">Signed</div>
                  <div className="font-mono text-[9px] text-neutral-500 break-all">{seed.$sovereignty.signature?.slice(0, 40)}...</div>
                  <div className="font-mono text-[8px] text-neutral-700 mt-1">{seed.$sovereignty.signed_at}</div>
                </div>
                <button
                  data-testid="verify-seed-btn"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="w-full py-1.5 border border-neutral-800 text-neutral-400 font-mono text-[10px] hover:border-neutral-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify Signature'}
                </button>
                {verifyResult !== null && (
                  <div className={`flex items-center gap-1.5 font-mono text-[10px] ${verifyResult ? 'text-emerald-500' : 'text-red-500'}`}>
                    {verifyResult ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {verifyResult ? 'Signature Valid' : 'Signature Invalid'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export */}
          <div className="space-y-2 pt-2 border-t border-neutral-900">
            <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Export</span>
            <button
              data-testid="export-gseed-btn"
              onClick={handleExport}
              className="w-full py-2 border border-neutral-800 text-neutral-300 font-mono text-[10px] hover:border-neutral-600 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              Download .gseed
            </button>
            <div className="font-mono text-[8px] text-neutral-700 space-y-0.5">
              <div>Hash: {seed.$hash?.slice(0, 32)}...</div>
              <div>Domain: {seed.$domain}</div>
              <div>Genes: {Object.keys(seed.genes || {}).length}</div>
              <div>Generation: {seed.$lineage?.generation || 0}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
