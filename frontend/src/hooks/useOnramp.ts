import { useState, useCallback } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';

interface OnrampSession {
  sessionToken: string;
  expiresIn: number;
  onrampUrl: string;
}

interface UseOnrampReturn {
  isLoading: boolean;
  error: string | null;
  createOnrampSession: (options?: OnrampOptions) => Promise<OnrampSession | null>;
  openOnramp: (options?: OnrampOptions) => Promise<void>;
}

interface OnrampOptions {
  assets?: string[];
  blockchain?: string;
  fiatAmount?: string;
}

/**
 * Hook for managing Coinbase Onramp integration
 * Handles session creation and URL generation for secure onramp flow
 */
export function useOnramp(): UseOnrampReturn {
  const { evmAddress } = useEvmAddress();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOnrampSession = useCallback(async (options?: OnrampOptions): Promise<OnrampSession | null> => {
    if (!evmAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onramp/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: evmAddress,
          assets: options?.assets || ['USDC', 'ETH'],
          blockchain: options?.blockchain || 'base',
          fiatAmount: options?.fiatAmount || '10'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create onramp session');
      }

      const session: OnrampSession = await response.json();
      console.log('Onramp session created:', session);
      
      return session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error creating onramp session:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [evmAddress]);

  const openOnramp = useCallback(async (options?: OnrampOptions): Promise<void> => {
    const session = await createOnrampSession(options);
    
    if (session) {
      // Open the onramp URL in a new window/tab
      const popup = window.open(
        session.onrampUrl,
        'coinbase-onramp',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        setError('Popup blocked. Please allow popups for this site.');
        return;
      }

      // Optional: Listen for the popup to close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          console.log('Onramp popup closed');
          // Could trigger a balance refresh here
        }
      }, 1000);

      // Clean up interval after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
      }, 300000);
    }
  }, [createOnrampSession]);

  return {
    isLoading,
    error,
    createOnrampSession,
    openOnramp
  };
}