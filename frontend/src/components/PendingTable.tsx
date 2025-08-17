"use client";

import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { NETWORKS } from "@/config/networks";
import { PendingRequest } from "@/types";

/**
 * Pending table showing ongoing cross-chain operations with status tracking
 */
export default function PendingTable() {
  const { evmAddress } = useEvmAddress();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['pending-requests', evmAddress],
    queryFn: async (): Promise<PendingRequest[]> => {
      if (!evmAddress) return [];
      
      // Mock data for now - will be replaced with actual API calls
      return [
        {
          requestId: '0x1234...5678',
          type: 'DEPOSIT',
          originChainId: 421614,
          destChainId: 84532,
          status: 'IN_FLIGHT',
          amount: '1000.00',
          asset: 'USDC',
          createdAt: Date.now() - 30000, // 30 seconds ago
          events: [
            {
              timestamp: Date.now() - 30000,
              label: 'Deposit initiated',
              txUrl: 'https://sepolia.arbiscan.io/tx/0x1234567890abcdef'
            },
            {
              timestamp: Date.now() - 15000,
              label: 'CCTP burn confirmed',
              txUrl: 'https://sepolia.arbiscan.io/tx/0xabcdef1234567890',
              cctpUrl: 'https://circle.com/explorer/cctp/0x1234567890abcdef'
            }
          ]
        },
        {
          requestId: '0xabcd...1234',
          type: 'REDEEM',
          originChainId: 84532,
          destChainId: 421614,
          status: 'CLAIMABLE',
          amount: '500.00',
          asset: 'shares',
          createdAt: Date.now() - 180000, // 3 minutes ago
          events: [
            {
              timestamp: Date.now() - 180000,
              label: 'Redeem requested',
              txUrl: 'https://sepolia.basescan.org/tx/0x9876543210fedcba'
            },
            {
              timestamp: Date.now() - 120000,
              label: 'Request processed',
              lzTxUrl: 'https://layerzeroscan.com/tx/0x9876543210fedcba'
            },
            {
              timestamp: Date.now() - 60000,
              label: 'Ready to claim',
            }
          ]
        }
      ];
    },
    enabled: !!evmAddress,
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 0,
  });

  const getStatusColor = (status: PendingRequest['status']) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-500';
      case 'IN_FLIGHT': return 'text-blue-500';
      case 'CLAIMABLE': return 'text-green-500';
      case 'CLAIMED': return 'text-gray-500';
      case 'FAILED': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: PendingRequest['status']) => {
    switch (status) {
      case 'PENDING': return '⏳';
      case 'IN_FLIGHT': return '🚀';
      case 'CLAIMABLE': return '✅';
      case 'CLAIMED': return '✓';
      case 'FAILED': return '❌';
      default: return '⚪';
    }
  };

  if (!evmAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Connect wallet to view pending operations</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Requests</CardTitle>
        <CardDescription>Track your ongoing cross-chain operations</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : pendingRequests && pendingRequests.length > 0 ? (
          <div className="space-y-4">
          {pendingRequests.map((request) => {
            const originNetwork = Object.values(NETWORKS).find(n => n.chainId === request.originChainId);
            const destNetwork = Object.values(NETWORKS).find(n => n.chainId === request.destChainId);
            const latestEvent = request.events[request.events.length - 1];

            return (
              <div key={request.requestId} className="rounded-lg border p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon(request.status)}</span>
                      <span className="font-medium">
                        {request.type === 'DEPOSIT' ? 'Deposit' : 'Redeem'}
                      </span>
                      <Badge 
                        variant={request.status === 'CLAIMABLE' ? 'default' : 'secondary'}
                        className={request.status === 'IN_FLIGHT' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                      >
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{originNetwork?.name}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">{destNetwork?.name}</Badge>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="font-medium">
                      {request.amount} {request.asset}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {request.requestId}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Latest: </span>
                    <span>{latestEvent.label}</span>
                    <span className="text-muted-foreground ml-2">
                      ({new Date(latestEvent.timestamp).toLocaleTimeString()})
                    </span>
                  </div>
                  
                  <div className="flex gap-2 text-xs">
                    {latestEvent.txUrl && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <a
                          href={latestEvent.txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View TX →
                        </a>
                      </Button>
                    )}
                    {latestEvent.lzTxUrl && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <a
                          href={latestEvent.lzTxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          LayerZero →
                        </a>
                      </Button>
                    )}
                    {latestEvent.cctpUrl && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <a
                          href={latestEvent.cctpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          CCTP →
                        </a>
                      </Button>
                    )}
                  </div>

                  {request.status === 'CLAIMABLE' && (
                    <Button className="w-full" size="sm">
                      Claim Now
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No pending operations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}