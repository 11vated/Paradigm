/**
 * Wallet Connection Component
 * 
 * Provides wallet connection UI using ethers.js directly.
 * Displays connection status, network info, and account details.
 * 
 * Phase 15.2: Wallet Connection UI
 * Date: 2026-06-18
 */

import React from 'react';
import { useWeb3 } from '@/lib/web3/provider';
import { formatEther } from 'ethers';
import { getNetworkConfig } from '@/lib/web3/contracts';

export function WalletConnect() {
  const { isConnected, isConnecting, address, chainId, balance, connect, disconnect, error } = useWeb3();

  if (isConnecting) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-neutral-700 text-neutral-400 rounded-lg font-medium text-sm cursor-not-allowed"
      >
        Connecting...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-2">
        <button
          onClick={connect}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors"
        >
          Connect Wallet
        </button>
        {error && (
          <div className="text-xs text-red-400 max-w-xs">
            {error}
          </div>
        )}
      </div>
    );
  }

  const networkConfig = chainId ? getNetworkConfig(chainId) : null;
  const formattedBalance = balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000';

  return (
    <div className="flex items-center gap-2">
      {/* Network indicator */}
      <div className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${networkConfig ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span>{networkConfig?.name || 'Unknown'}</span>
      </div>

      {/* Account info */}
      <div className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className="font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-400">
            {formattedBalance} ETH
          </span>
        </div>
      </div>

      {/* Disconnect button */}
      <button
        onClick={disconnect}
        className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm font-medium transition-colors text-neutral-400 hover:text-white"
      >
        Disconnect
      </button>
    </div>
  );
}

/**
 * Compact wallet status indicator
 */
export function WalletStatus() {
  const { address, isConnected, chainId, balance } = useWeb3();

  if (!isConnected || !address) {
    return (
      <div className="text-xs text-neutral-500">
        Wallet not connected
      </div>
    );
  }

  const networkConfig = chainId ? getNetworkConfig(chainId) : null;
  const formattedBalance = balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${networkConfig ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-neutral-400">
          {networkConfig?.name || 'Unknown Network'}
        </span>
      </div>
      
      <div className="text-xs text-neutral-500 font-mono">
        {address.slice(0, 6)}...{address.slice(-4)}
      </div>
      
      <div className="text-xs text-neutral-400">
        {formattedBalance} ETH
      </div>
      
      {!networkConfig && (
        <div className="text-xs text-red-400">
          Unsupported network
        </div>
      )}
    </div>
  );
}

/**
 * Network switcher component
 */
export function NetworkSwitcher() {
  const { chainId, switchNetwork } = useWeb3();
  const [isOpen, setIsOpen] = React.useState(false);
  
  const networkConfig = chainId ? getNetworkConfig(chainId) : null;
  
  // Available networks to switch to
  const networks = [
    { chainId: 31337, name: 'Localhost' },
    { chainId: 11155111, name: 'Sepolia' },
    { chainId: 80001, name: 'Mumbai' },
    { chainId: 1, name: 'Ethereum' },
    { chainId: 137, name: 'Polygon' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-xs font-medium transition-colors flex items-center gap-2"
      >
        <div className={`w-2 h-2 rounded-full ${networkConfig ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {networkConfig?.name || 'Select Network'}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1 right-0 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-20 min-w-[150px]">
            {networks.map((network) => (
              <button
                key={network.chainId}
                onClick={() => {
                  switchNetwork(network.chainId);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-neutral-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  chainId === network.chainId ? 'text-emerald-400' : 'text-neutral-300'
                }`}
              >
                {network.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Made with Bob
