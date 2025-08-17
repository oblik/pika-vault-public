"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import TradingCard from "@/components/TradingCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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

  const supportedNetworks = vault.supportedChains.map(
    (chainId) => Object.values(NETWORKS).find(network => network.chainId === chainId)
  ).filter(Boolean);

  // Fetch real vault data from the API
  const { data: vaultData, isLoading: vaultLoading } = useQuery({
    queryKey: ['vault-nav', vault.id],
    queryFn: async () => {
      const response = await fetch(`/api/vault/${vault.id}/nav`);
      if (!response.ok) throw new Error('Failed to fetch vault data');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Vault Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {vault.baseAsset.symbol[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{vault.name}</CardTitle>
                  <CardDescription className="text-base mt-1">{vault.description}</CardDescription>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm text-muted-foreground">
                      Base Asset: <span className="font-medium text-foreground">{vault.baseAsset.symbol}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      NAV: {vaultLoading ? (
                        <Skeleton className="inline-block w-12 h-4" />
                      ) : (
                        <span className="font-medium text-foreground">
                          ${vaultData?.nav || '1.00'}
                        </span>
                      )}
                    </span>
                    {vaultData?.totalAssets && (
                      <span className="text-sm text-muted-foreground">
                        TVL: <span className="font-medium text-foreground">
                          ${parseFloat(vaultData.totalAssets).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {supportedNetworks.map((network, index) => (
                  <Badge key={index} variant="secondary">
                    {network?.name}
                  </Badge>
                ))}
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts and Holdings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Chart Tabs */}
              <Card>
                <CardHeader>
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'nav' | 'composition')}>
                    <TabsList>
                      <TabsTrigger value="nav">NAV</TabsTrigger>
                      <TabsTrigger value="composition">Composition</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                    <p className="text-muted-foreground">
                      {activeTab === 'nav' ? 'NAV chart coming soon' : 'Composition chart coming soon'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Holdings Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Holdings</CardTitle>
                  <CardDescription>Vault assets across supported chains</CardDescription>
                </CardHeader>
                <CardContent>
                  {vaultLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 text-muted-foreground">Chain</th>
                            <th className="text-left py-2 text-muted-foreground">Asset</th>
                            <th className="text-right py-2 text-muted-foreground">Balance</th>
                            <th className="text-right py-2 text-muted-foreground">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vaultData?.holdings?.length > 0 ? (
                            vaultData.holdings.map((holding: any, index: number) => (
                              <tr key={index} className={index < vaultData.holdings.length - 1 ? "border-b" : ""}>
                                <td className="py-3">{holding.chainName}</td>
                                <td className="py-3">{holding.asset}</td>
                                <td className="py-3 text-right">
                                  {parseFloat(holding.balance).toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 6 
                                  })}
                                </td>
                                <td className="py-3 text-right">
                                  ${parseFloat(holding.value).toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-muted-foreground">
                                No holdings data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trade Panel */}
            <div className="space-y-6">
              <TradingCard vault={vault} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}