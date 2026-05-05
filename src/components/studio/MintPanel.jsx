import { useState, useEffect } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import { Loader2, Hexagon, ExternalLink, Image, Copy, Check } from 'lucide-react';

export default function MintPanel({ seed }) {
  const [ownerAddress, setOwnerAddress] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState(null);
  const [nftInfo, setNftInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const mintSeedInStore = useSeedStore((s) => s.mintSeed);
  const getNftInfoInStore = useSeedStore((s) => s.getNftInfo);
  const getSeedPortraitUrl = useSeedStore((s) => s.getSeedPortraitUrl);

  useEffect(() => {
    let isMounted = true;
    
    const fetchInfo = async () => {
      if (!seed) {
        if (isMounted) {
          setNftInfo(null);
          setMintResult(null);
        }
        return;
      }
      
      if (isMounted) {
        setLoadingInfo(true);
        setError(null);
      }
      
      try {
        const info = await getNftInfoInStore();
        if (isMounted) setNftInfo(info);
      } catch {
        if (isMounted) setNftInfo(null);
      } finally {
        if (isMounted) setLoadingInfo(false);
      }
    };
    
    fetchInfo();

    return () => { isMounted = false; };
  }, [seed, getNftInfoInStore]);

  const handleMint = async () => {
    if (!seed || minting) return;
    setError(null);
    setMinting(true);
    try {
      // Dry-run (no private key) — returns metadata and prepared data
      const result = await mintSeedInStore(ownerAddress || '0x0000000000000000000000000000000000000000');
      setMintResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Mint failed');
    }
    setMinting(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!seed) {
    return (
      <div className="p-3" data-testid="mint-panel">
        <div className="flex items-center gap-2 mb-2">
          <Hexagon className="w-3 h-3 text-primary" />
          <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">On-Chain Sovereignty</span>
        </div>
        <p className="font-mono text-[10px] text-neutral-600">Select a seed to mint as an ERC-721 NFT.</p>
      </div>
    );
  }

  const portraitUrl = getSeedPortraitUrl ? getSeedPortraitUrl(seed.id) : '';

  return (
    <div className="p-3 space-y-3" data-testid="mint-panel">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Hexagon className="w-3 h-3 text-primary" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">On-Chain Sovereignty</span>
      </div>

      {/* Gene Portrait */}
      <div className="border border-neutral-800/50 bg-black/20 p-1">
        <div className="flex items-center gap-1.5 px-1.5 pb-1">
          <Image className="w-2.5 h-2.5 text-neutral-600" />
          <span className="font-mono text-[8px] text-neutral-600 uppercase">Gene Portrait</span>
        </div>
        <img
          data-testid="seed-portrait"
          src={portraitUrl}
          alt={`${seed.$name} gene portrait`}
          className="w-full aspect-square object-contain bg-neutral-950"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* Seed Info */}
      <div className="space-y-1 p-2 border border-neutral-800/40 bg-black/20">
        <div className="font-mono text-[8px] text-neutral-700 uppercase">Seed Metadata</div>
        <div className="font-mono text-[9px] text-neutral-500 space-y-0.5">
          <div>Name: <span className="text-neutral-300">{seed.$name}</span></div>
          <div>Domain: <span className="text-primary/80">{seed.$domain}</span></div>
          <div>Hash: <span className="text-neutral-400">{seed.$hash?.slice(0, 24)}...</span></div>
          <div>Genes: <span className="text-neutral-400">{Object.keys(seed.genes || {}).length}</span></div>
          <div>Gen: <span className="text-neutral-400">{seed.$lineage?.generation || 0}</span></div>
        </div>
      </div>

      {/* NFT Info (if already minted) */}
      {loadingInfo && (
        <div className="flex items-center gap-1.5 text-neutral-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="font-mono text-[10px]">Loading NFT info...</span>
        </div>
      )}
      {nftInfo && nftInfo.onchain && (
        <div className="p-2 border border-primary/20 bg-primary/5 space-y-1">
          <div className="font-mono text-[8px] text-primary uppercase">Minted On-Chain</div>
          <div className="font-mono text-[9px] text-neutral-500">
            <div>Token ID: <span className="text-primary">{nftInfo.tokenId}</span></div>
            {nftInfo.metadataUri && (
              <div className="truncate">URI: <span className="text-neutral-400">{nftInfo.metadataUri.slice(0, 50)}...</span></div>
            )}
          </div>
        </div>
      )}

      {/* Mint Form */}
      <div className="space-y-2">
        <div className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Mint ERC-721 (Sepolia)</div>
        <div className="space-y-1.5">
          <label htmlFor="mint-address" className="font-mono text-[8px] text-neutral-700 uppercase">Owner Address (optional)</label>
          <input
            id="mint-address"
            data-testid="mint-address"
            type="text"
            value={ownerAddress}
            onChange={e => setOwnerAddress(e.target.value)}
            placeholder="0x..."
            aria-describedby="mint-help"
            className="w-full px-2 py-1.5 bg-black/30 border border-neutral-800 font-mono text-[10px] text-neutral-300 placeholder-neutral-700 focus:border-primary/40 transition-colors"
          />
        </div>
        <button
          data-testid="mint-btn"
          onClick={handleMint}
          disabled={minting}
          className="w-full py-2 bg-primary text-black font-bold text-[10px] uppercase tracking-wider hover:bg-primary/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-1.5"
        >
          {minting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hexagon className="w-3 h-3" />}
          {minting ? 'Preparing...' : 'Prepare Mint'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 border border-red-500/20 bg-red-500/5" role="alert">
          <div className="font-mono text-[9px] text-red-400">{error}</div>
        </div>
      )}

      {/* Mint Result */}
      {mintResult && (
        <div className="space-y-2 p-2 border border-primary/20 bg-primary/5">
          <div className="font-mono text-[8px] text-primary uppercase">Mint Prepared</div>
          <div className="font-mono text-[9px] text-neutral-500 space-y-1">
            {mintResult.tokenId && <div>Token ID: <span className="text-primary">{mintResult.tokenId}</span></div>}
            {mintResult.metadata?.name && <div>Name: {mintResult.metadata.name}</div>}
            {mintResult.metadata?.attributes && (
              <div>Attributes: {mintResult.metadata.attributes.length} traits</div>
            )}
          </div>
          {mintResult.metadataUri && (
            <button
              onClick={() => copyToClipboard(JSON.stringify(mintResult.metadata, null, 2))}
              className="w-full py-1 border border-neutral-800 text-neutral-400 font-mono text-[9px] hover:border-neutral-600 transition-colors flex items-center justify-center gap-1"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-primary" /> : <Copy className="w-2.5 h-2.5" />}
              {copied ? 'Copied!' : 'Copy Metadata JSON'}
            </button>
          )}
          <div id="mint-help" className="font-mono text-[8px] text-neutral-700">
            To mint on-chain, connect a wallet with Sepolia ETH and provide a signing key.
          </div>
        </div>
      )}
    </div>
  );
}
