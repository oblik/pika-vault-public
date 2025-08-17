"use client";

import Link from "next/link";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getAllVaults } from "@/config/vaults";
import { NETWORKS } from "@/config/networks";
import { Position } from "@/types";

/**
 * Positions table showing user's vault positions across chains
 */
export default function PositionsTable() {
  const { evmAddress } = useEvmAddress();
  const vaults = getAllVaults();

  // TODO: Replace with actual position fetching from contracts
  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions', evmAddress],
    queryFn: async (): Promise<Position[]> => {
      if (!evmAddress) return [];
      
      // Mock data for now - will be replaced with contract reads
      return [
        {
          vaultId: 'usdc-multichain',
          chainId: 84532,
          shares: '1000000000', // 1000 shares with 6 decimals
          value: '1050.00'
        },
        {
          vaultId: 'eth-multichain', 
          chainId: 421614,
          shares: '500000000000000000', // 0.5 shares with 18 decimals
          value: '1200.50'
        }
      ];
    },
    enabled: !!evmAddress,
    staleTime: 15000,
  });

  if (!evmAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vault Positions</CardTitle>
          <CardDescription>Connect wallet to view positions</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vault Positions</CardTitle>
        <CardDescription>Your active vault holdings across chains</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="space-y-4">
            {positions.map((position, index) => {
              const vault = vaults.find(v => v.id === position.vaultId);
              const network = Object.values(NETWORKS).find(n => n.chainId === position.chainId);
              
              if (!vault) return null;

              const shares = parseFloat(position.shares) / Math.pow(10, vault.baseAsset.decimals);

              return (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-medium">{vault.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{network?.name}</Badge>
                        <Badge variant="outline">{vault.baseAsset.symbol}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/vaults/${vault.id}`}>
                        View →
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-medium">
                        {shares.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 6
                        })} shares
                      </div>
                      {position.value && (
                        <div className="text-sm text-muted-foreground">
                          ≈ ${parseFloat(position.value).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">No vault positions yet</p>
            <Button asChild>
              <Link href="/vaults">Browse Vaults</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}