"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BalanceCard from "@/components/BalanceCard";
import PositionsTable from "@/components/PositionsTable";
import PendingTable from "@/components/PendingTable";

/**
 * The Signed In screen - Dashboard layout
 */
export default function SignedInScreen() {
  const router = useRouter();

  const handleDepositClick = () => {
    router.push('/onramp');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BalanceCard onDepositClick={handleDepositClick} />
            <PositionsTable />
          </div>
          <PendingTable />
        </div>
      </main>
    </div>
  );
}
