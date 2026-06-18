/**
 * Web3 Provider Tests
 *
 * Tests for Web3Provider context and wallet connection functionality.
 *
 * Phase 17.2: Web3 Module Tests
 * Date: 2026-06-18
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useWeb3, Web3Provider } from '../../src/lib/web3/provider.js';
import { BrowserProvider } from 'ethers';

// Mock ethers
vi.mock('ethers', () => ({
  BrowserProvider: vi.fn(),
  Contract: vi.fn(),
  formatEther: vi.fn((value) => '1.0'),
  parseEther: vi.fn((value) => BigInt(value) * BigInt(10 ** 18)),
}));

// Mock window.ethereum
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

describe('Web3Provider', () => {
  beforeEach(() => {
    // Setup window.ethereum mock
    (global as any).window = {
      ethereum: mockEthereum,
    };
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (global as any).window;
  });

  describe('useWeb3 hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useWeb3());
      }).toThrow('useWeb3 must be used within Web3Provider');
    });

    it('should provide initial disconnected state', () => {
      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.address).toBeNull();
      expect(result.current.chainId).toBeNull();
      expect(result.current.balance).toBeNull();
      expect(result.current.provider).toBeNull();
      expect(result.current.signer).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('connect', () => {
    it('should connect wallet successfully', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockChainId = 1;

      mockEthereum.request.mockResolvedValueOnce([mockAddress]);

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(mockChainId) }),
        getSigner: vi.fn().mockResolvedValue({}),
        getBalance: vi.fn().mockResolvedValue(BigInt(10 ** 18)),
      };

      (BrowserProvider as any).mockImplementation(() => mockProvider);

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.address).toBe(mockAddress);
      expect(result.current.chainId).toBe(mockChainId);
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    it('should handle connection rejection', async () => {
      mockEthereum.request.mockRejectedValueOnce(
        new Error('User rejected connection')
      );

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toContain('User rejected connection');
    });

    it('should handle missing MetaMask', async () => {
      delete (global as any).window.ethereum;

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toContain('MetaMask is not installed');
    });
  });

  describe('disconnect', () => {
    it('should disconnect wallet and clear state', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockEthereum.request.mockResolvedValueOnce([mockAddress]);

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(1) }),
        getSigner: vi.fn().mockResolvedValue({}),
        getBalance: vi.fn().mockResolvedValue(BigInt(10 ** 18)),
      };

      (BrowserProvider as any).mockImplementation(() => mockProvider);

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      // Connect first
      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Then disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.address).toBeNull();
      expect(result.current.chainId).toBeNull();
      expect(result.current.balance).toBeNull();
      expect(result.current.provider).toBeNull();
      expect(result.current.signer).toBeNull();
    });
  });

  describe('switchNetwork', () => {
    it('should switch to supported network', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockEthereum.request
        .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
        .mockResolvedValueOnce(null); // wallet_switchEthereumChain

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(1) }),
        getSigner: vi.fn().mockResolvedValue({}),
        getBalance: vi.fn().mockResolvedValue(BigInt(10 ** 18)),
      };

      (BrowserProvider as any).mockImplementation(() => mockProvider);

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      // Connect first
      await act(async () => {
        await result.current.connect();
      });

      // Switch network
      await act(async () => {
        await result.current.switchNetwork(11155111); // Sepolia
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    });

    it('should add network if not present', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockEthereum.request
        .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
        .mockRejectedValueOnce({ code: 4902 }) // wallet_switchEthereumChain fails
        .mockResolvedValueOnce(null); // wallet_addEthereumChain

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(1) }),
        getSigner: vi.fn().mockResolvedValue({}),
        getBalance: vi.fn().mockResolvedValue(BigInt(10 ** 18)),
      };

      (BrowserProvider as any).mockImplementation(() => mockProvider);

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      // Connect first
      await act(async () => {
        await result.current.connect();
      });

      // Switch to network not in MetaMask
      await act(async () => {
        await result.current.switchNetwork(11155111);
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: expect.arrayContaining([
          expect.objectContaining({
            chainId: '0xaa36a7',
            chainName: 'Sepolia',
          }),
        ]),
      });
    });
  });

  describe('event listeners', () => {
    it('should listen for account changes', async () => {
      const mockAddress1 = '0x1111111111111111111111111111111111111111';
      const mockAddress2 = '0x2222222222222222222222222222222222222222';

      mockEthereum.request.mockResolvedValueOnce([mockAddress1]);

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(1) }),
        getSigner: vi.fn().mockResolvedValue({}),
        getBalance: vi.fn().mockResolvedValue(BigInt(10 ** 18)),
      };

      (BrowserProvider as any).mockImplementation(() => mockProvider);

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      // Connect
      await act(async () => {
        await result.current.connect();
      });

      // Simulate account change
      const accountsChangedHandler = mockEthereum.on.mock.calls.find(
        (call) => call[0] === 'accountsChanged'
      )?.[1];

      expect(accountsChangedHandler).toBeDefined();

      act(() => {
        accountsChangedHandler([mockAddress2]);
      });

      await waitFor(() => {
        expect(result.current.address).toBe(mockAddress2);
      });
    });

    it('should disconnect when accounts become empty', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockEthereum.request.mockResolvedValueOnce([mockAddress]);

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(1) }),
        getSigner: vi.fn().mockResolvedValue({}),
        getBalance: vi.fn().mockResolvedValue(BigInt(10 ** 18)),
      };

      (BrowserProvider as any).mockImplementation(() => mockProvider);

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      // Connect
      await act(async () => {
        await result.current.connect();
      });

      // Simulate account disconnection
      const accountsChangedHandler = mockEthereum.on.mock.calls.find(
        (call) => call[0] === 'accountsChanged'
      )?.[1];

      act(() => {
        accountsChangedHandler([]);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });
  });

  describe('contract initialization', () => {
    it('should initialize contracts when connected', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockEthereum.request.mockResolvedValueOnce([mockAddress]);

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(1) }),
        getSigner: vi.fn().mockResolvedValue({}),
        getBalance: vi.fn().mockResolvedValue(BigInt(10 ** 18)),
      };

      (BrowserProvider as any).mockImplementation(() => mockProvider);

      const wrapper = ({ children }: any) =>
        React.createElement(Web3Provider, null, children);

      const { result } = renderHook(() => useWeb3(), { wrapper });

      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.paraToken).toBeDefined();
        expect(result.current.seedNFT).toBeDefined();
        expect(result.current.marketplace).toBeDefined();
        expect(result.current.governor).toBeDefined();
      });
    });
  });
});

// Made with Bob
