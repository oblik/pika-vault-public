"use client";

import { getAllVaults } from "@/config/vaults";
import VaultCard from "@/components/VaultCard";
import Header from "@/components/Header";

/**
 * Vault catalog page - browse available vaults
 */
export default function VaultsPage() {
  const vaults = getAllVaults();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Available Vaults</h1>
            <p className="text-muted-foreground">Explore our collection of omnichain ETF vaults</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}