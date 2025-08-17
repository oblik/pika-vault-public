"use client";

import { useState } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ExternalLink, CreditCard, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOnramp } from "@/hooks/useOnramp";
import { Balance } from "@/types";

/**
 * Onramp page component for fiat-to-crypto conversion
 */
export default function OnrampPage() {
  const { evmAddress } = useEvmAddress();
  const { isLoading, error, openOnramp } = useOnramp();
  
  // State for onramp configuration
  const [selectedAsset, setSelectedAsset] = useState("USDC");
  const [fiatAmount, setFiatAmount] = useState("10");

  // Fetch current wallet balances
  const { data: balances, isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
    queryKey: ['wallet-balances', evmAddress],
    queryFn: async () => {
      if (!evmAddress) return null;

      const response = await fetch(
        `/api/cdp/balances?address=${evmAddress}&chains=84532` // Base Sepolia
      );

      if (!response.ok) throw new Error('Failed to fetch balances');

      const data: Record<string, Balance[]> = await response.json();
      return data['84532'] || [];
    },
    enabled: !!evmAddress,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const handleOpenOnramp = async () => {
    try {
      await openOnramp({
        assets: [selectedAsset],
        blockchain: 'base',
        fiatAmount
      });

      toast.success("Onramp Opened", {
        description: "Complete your purchase in the popup window. Your balance will update automatically.",
        duration: 5000,
      });

      // Refresh balances after a delay to catch updates
      setTimeout(() => {
        refetchBalances();
      }, 10000);

    } catch (err) {
      toast.error("Failed to Open Onramp", {
        description: err instanceof Error ? err.message : "Please try again",
        duration: 5000,
      });
    }
  };

  const formatBalance = (balance: Balance) => {
    const amount = parseInt(balance.amount) / Math.pow(10, balance.decimals);
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const getAssetFromBalance = (balance: Balance) => {
    if (balance.contract.toLowerCase() === '0x036CbD53842c5426634e7929541eC2318f3dCF7e'.toLowerCase()) {
      return 'USDC';
    }
    return balance.symbol || 'Unknown';
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Fund Your Wallet</h1>
            <p className="text-muted-foreground">
              Add funds to your wallet using fiat currency. Powered by Coinbase.
            </p>
          </div>
          
          {!evmAddress ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Connect Wallet
                </CardTitle>
                <CardDescription>
                  Please connect your wallet to access the onramp.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Balances */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Current Balances</span>
                    <Badge variant="outline">Base Sepolia</Badge>
                  </CardTitle>
                  <CardDescription>
                    Your current wallet balances on Base Sepolia testnet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {balancesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading balances...</span>
                    </div>
                  ) : balances && balances.length > 0 ? (
                    <div className="space-y-3">
                      {balances.map((balance, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{getAssetFromBalance(balance)}</p>
                            <p className="text-sm text-muted-foreground">{balance.symbol}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono">{formatBalance(balance)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No balances found</p>
                      <p className="text-sm mt-2">Add funds using the onramp to get started!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Onramp Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Buy Crypto
                  </CardTitle>
                  <CardDescription>
                    Configure your purchase and open Coinbase Onramp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fiat-amount">Amount (USD)</Label>
                    <Input
                      id="fiat-amount"
                      type="number"
                      placeholder="10"
                      value={fiatAmount}
                      onChange={(e) => setFiatAmount(e.target.value)}
                      min="1"
                      max="500"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum: $1 • Maximum: $500 (testnet limit)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset">Asset</Label>
                    <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDC">USDC - USD Coin</SelectItem>
                        <SelectItem value="ETH">ETH - Ethereum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={handleOpenOnramp}
                    disabled={isLoading || !fiatAmount || parseFloat(fiatAmount) < 1}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening Onramp...
                      </>
                    ) : (
                      <>
                        Buy ${fiatAmount} {selectedAsset}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                    <span>Powered by Coinbase</span>
                    <span>•</span>
                    <span>Secure</span>
                    <span>•</span>
                    <span>Fast</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</div>
                    <h3 className="font-medium">Configure</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select the amount and asset you want to purchase
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <h3 className="font-medium">Purchase</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Complete your purchase using Apple Pay or debit card
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <h3 className="font-medium">Receive</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your crypto will appear in your wallet within minutes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}