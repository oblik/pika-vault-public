"use client";

import { useParams } from "next/navigation";
import { getVaultById } from "@/config/vaults";
import VaultDetail from "@/components/VaultDetail";

/**
 * Individual vault detail page with trading interface
 */
export default function VaultDetailPage() {
  const params = useParams();
  const vaultId = params.vaultId as string;
  const vault = getVaultById(vaultId);

  if (!vault) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-lg border p-6 text-center">
              <h1 className="text-xl font-semibold mb-2">Vault Not Found</h1>
              <p className="text-muted-foreground">The vault you&apos;re looking for doesn&apos;t exist.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <VaultDetail vault={vault} />
    </div>
  );
}