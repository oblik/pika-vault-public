"use client";

import { useEvmAddress } from "@coinbase/cdp-hooks";
import Header from "@/components/Header";

/**
 * Onramp page component for fiat-to-crypto conversion
 */
export default function OnrampPage() {
  const { evmAddress } = useEvmAddress();

  return (
    <>
      <Header />
      <main className="main flex-col-container flex-grow">
        <div className="main-inner flex-col-container w-full max-w-2xl mx-auto">
          <div className="card">
            <h1 className="card-title">Fund Your Wallet</h1>
            
            {!evmAddress ? (
              <p className="text-cdp-text-secondary">
                Please connect your wallet to access the onramp.
              </p>
            ) : (
              <>
                <p className="text-cdp-text-secondary mb-6">
                  Add funds to your wallet using fiat currency. Powered by Coinbase.
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="border border-cdp-border rounded-lg p-4">
                    <h3 className="font-medium text-cdp-text mb-2">Current Balances</h3>
                    <p className="text-sm text-cdp-text-secondary">
                      Your wallet balances will be updated here after successful onramp.
                    </p>
                  </div>
                </div>

                <button 
                  className="w-full px-6 py-3 bg-cdp-accent text-white rounded-lg hover:bg-cdp-accent-hover transition-colors font-medium"
                  onClick={() => {
                    // TODO: Implement Coinbase Onramp integration
                    alert('Onramp integration coming soon!');
                  }}
                >
                  Open Coinbase Onramp
                </button>

                <p className="text-xs text-cdp-text-secondary mt-4 text-center">
                  Powered by Coinbase • Secure • Fast
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}