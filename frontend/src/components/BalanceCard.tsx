"use client";

import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NETWORKS } from "@/config/networks";
import { Balance } from "@/types";

interface BalanceCardProps {
  onDepositClick?: () => void;
}

/**
 * Balance card showing total wallet value and per-chain breakdown
 */
export default function BalanceCard({ onDepositClick }: BalanceCardProps) {
  const { evmAddress } = useEvmAddress();

  const { data: balances, isLoading } = useQuery({
    queryKey: ['balances', evmAddress],
    queryFn: async (): Promise<Record<string, Balance[]> | null> => {
      if (!evmAddress) return null;
      
      const chainIds = Object.values(NETWORKS).map(n => n.chainId).join(',');
      const response = await fetch(`/api/cdp/balances?address=${evmAddress}&chains=${chainIds}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }
      
      return await response.json();
    },
    enabled: !!evmAddress,
    staleTime: 10000,
  });

  const totalValue = balances ? 
    Object.values(balances)
      .flat()
      .reduce((sum, balance) => sum + (parseFloat(balance.value || '0')), 0)
    : 0;

  if (!evmAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
          <CardDescription>Connect wallet to view balances</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Balance</CardTitle>
        <CardDescription>Total value across all supported chains</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="text-3xl font-bold mb-2">
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </div>
          <p className="text-sm text-muted-foreground">Total wallet value (USD)</p>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : balances && Object.entries(balances).map(([chainId, chainBalances]) => {
            const network = Object.values(NETWORKS).find(n => n.chainId === parseInt(chainId));
            return (
              <div key={chainId} className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">{network?.name}</h3>
                {chainBalances.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tokens</p>
                ) : (
                  <div className="space-y-2">
                    {chainBalances.map((balance, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="font-medium">{balance.symbol}</span>
                        <div className="text-right">
                          <div>
                            {(parseInt(balance.amount) / Math.pow(10, balance.decimals)).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 6
                            })}
                          </div>
                          {balance.value && (
                            <div className="text-muted-foreground">
                              ${parseFloat(balance.value).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={onDepositClick} className="w-full" size="lg">
          Deposit Funds
        </Button>
      </CardContent>
    </Card>
  );
}