import { useState, useCallback } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';

interface FaucetResult {
  network: string;
  asset: string;
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface FaucetResponse {
  address: string;
  results: FaucetResult[];
  summary: {
    successCount: number;
    totalRequests: number;
    successRate: string;
  };
  timestamp: number;
}

interface FaucetOptions {
  assets?: string[];
  networks?: string[];
}

interface UseFaucetReturn {
  isLoading: boolean;
  error: string | null;
  lastResult: FaucetResponse | null;
  requestFaucetFunds: (options?: FaucetOptions) => Promise<FaucetResponse | null>;
  getSupportedNetworks: () => Promise<any>;
}

/**
 * Hook for managing Coinbase CDP Faucet integration
 * Handles requesting test tokens from faucets on multiple networks
 */
export function useFaucet(): UseFaucetReturn {
  const { evmAddress } = useEvmAddress();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FaucetResponse | null>(null);

  const requestFaucetFunds = useCallback(async (options?: FaucetOptions): Promise<FaucetResponse | null> => {
    if (!evmAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: evmAddress,
          assets: options?.assets || ['eth', 'usdc'],
          networks: options?.networks || ['base-sepolia', 'ethereum-sepolia']
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request faucet funds');
      }

      const result: FaucetResponse = await response.json();
      setLastResult(result);
      
      console.log('Faucet request completed:', result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error requesting faucet funds:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [evmAddress]);

  const getSupportedNetworks = useCallback(async () => {
    try {
      const response = await fetch('/api/faucet', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch supported networks');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching supported networks:', err);
      throw err;
    }
  }, []);

  return {
    isLoading,
    error,
    lastResult,
    requestFaucetFunds,
    getSupportedNetworks
  };
}