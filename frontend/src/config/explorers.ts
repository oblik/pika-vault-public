/**
 * Block explorer configuration for different chains
 */
export const BLOCK_EXPLORERS = {
  84532: {
    name: "BaseScan",
    url: "https://sepolia.basescan.org",
  },
  421614: {
    name: "Arbiscan",
    url: "https://sepolia.arbiscan.io", 
  },
  11155111: {
    name: "Etherscan",
    url: "https://sepolia.etherscan.io",
  },
} as const;

// Helper function to get explorer URL for a transaction
export const getExplorerUrl = (chainId: number, txHash: string) => {
  const explorer = BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS];
  if (!explorer) return null;
  
  return `${explorer.url}/tx/${txHash}`;
};

// Helper function to get explorer name
export const getExplorerName = (chainId: number) => {
  const explorer = BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS];
  return explorer?.name ?? "Explorer";
};