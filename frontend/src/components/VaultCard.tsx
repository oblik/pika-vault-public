"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vault } from "@/config/vaults";
import { NETWORKS } from "@/config/networks";

interface VaultCardProps {
  vault: Vault;
}

/**
 * Vault card component for displaying vault information in catalog
 */
export default function VaultCard({ vault }: VaultCardProps) {
  const supportedNetworks = vault.supportedChains.map(
    (chainId) => Object.values(NETWORKS).find(network => network.chainId === chainId)?.name
  ).filter(Boolean);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-lg font-bold text-primary-foreground">
              {vault.baseAsset.symbol[0]}
            </span>
          </div>
          <div>
            <CardTitle className="text-left">{vault.name}</CardTitle>
            <CardDescription>
              Base Asset: {vault.baseAsset.symbol}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {vault.description}
        </p>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Supported Chains:</p>
          <div className="flex flex-wrap gap-1">
            {supportedNetworks.map((networkName, index) => (
              <Badge key={index} variant="secondary">
                {networkName}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Fast Mode:</span>
            <Badge 
              variant={vault.baseAsset.isUSDC ? 'default' : 'outline'}
              className={`ml-2 ${vault.baseAsset.isUSDC ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}`}
            >
              {vault.baseAsset.isUSDC ? 'Available' : 'N/A'}
            </Badge>
          </div>
          <Button asChild>
            <Link href={`/vaults/${vault.id}`}>
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}