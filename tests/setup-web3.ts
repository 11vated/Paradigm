/**
 * Web3 Test Setup
 * 
 * Mocks ethers.js functions for testing React hooks
 */

import { vi } from 'vitest';

// Mock ethers.js before any imports
vi.mock('ethers', () => ({
  parseUnits: (value: string, decimals: number) => {
    const [whole, fraction = ''] = value.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + paddedFraction);
  },
  formatUnits: (value: bigint, decimals: number) => {
    const str = value.toString().padStart(decimals + 1, '0');
    const whole = str.slice(0, -decimals) || '0';
    const fraction = str.slice(-decimals);
    return `${whole}.${fraction}`;
  },
  formatEther: (value: bigint) => {
    const str = value.toString().padStart(19, '0');
    const whole = str.slice(0, -18) || '0';
    const fraction = str.slice(-18);
    return `${whole}.${fraction}`;
  },
  parseEther: (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    const paddedFraction = fraction.padEnd(18, '0').slice(0, 18);
    return BigInt(whole + paddedFraction);
  },
}));

// Made with Bob
