"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Vault } from "@/config/vaults";
import { NETWORKS } from "@/config/networks";

interface VaultDetailProps {
  vault: Vault;
}

/**
 * Vault detail component showing charts, holdings, and trading interface
 */
export default function VaultDetail({ vault }: VaultDetailProps) {
  const [activeTab, setActiveTab] = useState<'nav' | 'composition'>('nav');
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy');

  const supportedNetworks = vault.supportedChains.map(
    (chainId) => Object.values(NETWORKS).find(network => network.chainId === chainId)
  ).filter(Boolean);

  return (
    <>
      <Header />
      <main className="main flex-col-container flex-grow">
        <div className="main-inner w-full max-w-7xl mx-auto">
          {/* Vault Header */}
          <div className="card mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-cdp-accent rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {vault.baseAsset.symbol[0]}
                </span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-cdp-text">{vault.name}</h1>
                <p className="text-cdp-text-secondary">{vault.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-cdp-text-secondary">
                    Base Asset: <span className="text-cdp-text font-medium">{vault.baseAsset.symbol}</span>
                  </span>
                  <span className="text-sm text-cdp-text-secondary">
                    NAV: <span className="text-cdp-text font-medium">$1.05</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {supportedNetworks.map((network, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-cdp-accent/10 text-cdp-accent text-sm rounded-md"
                >
                  {network?.name}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts and Holdings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Chart Tabs */}
              <div className="card">
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setActiveTab('nav')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'nav'
                        ? 'bg-cdp-accent text-white'
                        : 'bg-cdp-bg text-cdp-text-secondary hover:text-cdp-text'
                    }`}
                  >
                    NAV
                  </button>
                  <button
                    onClick={() => setActiveTab('composition')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'composition'
                        ? 'bg-cdp-accent text-white'
                        : 'bg-cdp-bg text-cdp-text-secondary hover:text-cdp-text'
                    }`}
                  >
                    Composition
                  </button>
                </div>

                <div className="h-64 flex items-center justify-center bg-cdp-bg rounded-lg">
                  <p className="text-cdp-text-secondary">
                    {activeTab === 'nav' ? 'NAV chart coming soon' : 'Composition chart coming soon'}
                  </p>
                </div>
              </div>

              {/* Holdings Table */}
              <div className="card">
                <h3 className="card-title mb-4">Holdings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cdp-border">
                        <th className="text-left py-2 text-cdp-text-secondary">Chain</th>
                        <th className="text-left py-2 text-cdp-text-secondary">Asset</th>
                        <th className="text-right py-2 text-cdp-text-secondary">Quantity</th>
                        <th className="text-right py-2 text-cdp-text-secondary">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-cdp-border">
                        <td className="py-3 text-cdp-text">Base Sepolia</td>
                        <td className="py-3 text-cdp-text">{vault.baseAsset.symbol}</td>
                        <td className="py-3 text-right text-cdp-text">1,000.00</td>
                        <td className="py-3 text-right text-cdp-text">$1,050.00</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-cdp-text">Arbitrum Sepolia</td>
                        <td className="py-3 text-cdp-text">{vault.baseAsset.symbol}</td>
                        <td className="py-3 text-right text-cdp-text">500.00</td>
                        <td className="py-3 text-right text-cdp-text">$525.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Trade Panel */}
            <div className="space-y-6">
              <div className="card">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTradeTab('buy')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      tradeTab === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'bg-cdp-bg text-cdp-text-secondary hover:text-cdp-text'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeTab('sell')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      tradeTab === 'sell'
                        ? 'bg-red-500 text-white'
                        : 'bg-cdp-bg text-cdp-text-secondary hover:text-cdp-text'
                    }`}
                  >
                    Sell
                  </button>
                </div>

                {tradeTab === 'buy' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cdp-text mb-2">
                        Amount ({vault.baseAsset.symbol})
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full p-3 border border-cdp-border rounded-lg bg-cdp-card text-cdp-text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cdp-text mb-2">
                        Origin Chain
                      </label>
                      <select className="w-full p-3 border border-cdp-border rounded-lg bg-cdp-card text-cdp-text">
                        {supportedNetworks.map((network, index) => (
                          <option key={index} value={network?.chainId}>
                            {network?.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {vault.baseAsset.isUSDC && (
                      <div>
                        <label className="block text-sm font-medium text-cdp-text mb-2">
                          Mode
                        </label>
                        <select className="w-full p-3 border border-cdp-border rounded-lg bg-cdp-card text-cdp-text">
                          <option value="standard">Standard (OFT)</option>
                          <option value="fast">Fast (CCTP)</option>
                        </select>
                      </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        Cross-chain deposits are processed asynchronously. You&apos;ll receive shares after confirmation.
                      </p>
                    </div>

                    <button className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                      Deposit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cdp-text mb-2">
                        Shares to Redeem
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full p-3 border border-cdp-border rounded-lg bg-cdp-card text-cdp-text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cdp-text mb-2">
                        Destination Chain
                      </label>
                      <select className="w-full p-3 border border-cdp-border rounded-lg bg-cdp-card text-cdp-text">
                        {supportedNetworks.map((network, index) => (
                          <option key={index} value={network?.chainId}>
                            {network?.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        Redemptions are processed in two steps: Request → Claim
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button className="py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
                        Request Redeem
                      </button>
                      <button 
                        className="py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium"
                        disabled
                      >
                        Claim
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}