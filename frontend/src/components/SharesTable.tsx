"use client";

import { useState } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HUB_CHAIN_ID } from "@/config/chains";

interface ShareBalance {
  chainId: number;
  chainName: string;
  balance: string;
  formatted: string;
  symbol: string;
  decimals: number;
  contractAddress: string;
}

interface SharesResponse {
  shares: ShareBalance[];
  totalShares: string;
  timestamp: number;
}

interface SharesTableProps {
  vaultId: string;
}

export function SharesTable({ vaultId }: SharesTableProps) {
  const {evmAddress} = useEvmAddress();
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch OFT shares across all chains
  const {
    data: sharesData,
    isLoading,
    error,
    refetch
  } = useQuery<SharesResponse>({
    queryKey: ['vault-shares', vaultId, evmAddress, refreshKey],
    queryFn: async () => {
      if (!evmAddress) throw new Error('No wallet connected');

      const response = await fetch(
        `/api/vault/${vaultId}/shares?address=${evmAddress}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch shares');
      }

      return response.json();
    },
    enabled: !!evmAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const getChainBadgeColor = (chainId: number) => {
    if (chainId === HUB_CHAIN_ID) return "bg-primary/20 text-primary";
    return "bg-muted text-muted-foreground";
  };

  if (!evmAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Vault Shares</CardTitle>
          <CardDescription>
            Connect your wallet to view your vault shares across all chains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Please connect your wallet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Vault Shares</CardTitle>
            <CardDescription>
              View your vault shares distributed across all supported chains
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">Failed to load shares data</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
            </div>
          </div>
        ) : sharesData ? (
          <div className="space-y-4">
            {/* Total Shares Summary */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                  <p className="text-2xl font-bold text-foreground">{sharesData.totalShares}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Last updated: {new Date(sharesData.timestamp).toLocaleTimeString()}
                </Badge>
              </div>
            </div>

            {/* Shares Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chain</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Symbol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharesData.shares.map((share) => (
                    <TableRow key={share.chainId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{share.chainName}</span>
                          {share.chainId === HUB_CHAIN_ID && (
                            <Badge className={getChainBadgeColor(share.chainId)}>
                              Hub
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          {share.contractAddress.slice(0, 8)}...{share.contractAddress.slice(-6)}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {share.formatted}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{share.symbol}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* No Shares Message */}
            {sharesData.shares.every(share => parseFloat(share.formatted.replace(/,/g, '')) === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>You don&apos;t have any vault shares yet.</p>
                <p className="text-sm mt-2">Make a deposit to start earning vault shares!</p>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
