export const NETWORKS = {
  baseSepolia: { 
    chainId: 84532, 
    name: "Base Sepolia", 
    cctpDomain: 6, 
    lzEid: 40245,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org"
  },
  arbSepolia: { 
    chainId: 421614, 
    name: "Arbitrum Sepolia", 
    cctpDomain: 3, 
    lzEid: 40231,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io"
  },
  ethSepolia: { 
    chainId: 11155111, 
    name: "Ethereum Sepolia", 
    cctpDomain: 0, 
    lzEid: 40161,
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io"
  }
} as const;

export type NetworkKey = keyof typeof NETWORKS;
export type Network = typeof NETWORKS[NetworkKey];

export const getNetworkByChainId = (chainId: number): Network | undefined => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};

export const getNetworkKey = (chainId: number): NetworkKey | undefined => {
  const entry = Object.entries(NETWORKS).find(([, network]) => network.chainId === chainId);
  return entry?.[0] as NetworkKey;
};