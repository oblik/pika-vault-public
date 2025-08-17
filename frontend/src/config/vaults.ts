import { NETWORKS } from './networks';

export interface Vault {
  id: string;
  name: string;
  description: string;
  baseAsset: {
    symbol: string;
    name: string;
    decimals: number;
    isUSDC: boolean;
  };
  supportedChains: number[];
  hubChainId: number;
}

// Static vault configuration for v1
export const VAULTS: Record<string, Vault> = {
  'usdc-multichain': {
    id: 'usdc-multichain',
    name: 'Multi-Chain USDC Vault',
    description: 'Cross-chain USDC vault with native settlement via CCTP',
    baseAsset: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      isUSDC: true,
    },
    supportedChains: [NETWORKS.baseSepolia.chainId, NETWORKS.arbSepolia.chainId, NETWORKS.ethSepolia.chainId],
    hubChainId: NETWORKS.baseSepolia.chainId,
  },
  'eth-multichain': {
    id: 'eth-multichain',
    name: 'Multi-Chain ETH Vault',
    description: 'Cross-chain ETH vault using OFT for asset movement',
    baseAsset: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      isUSDC: false,
    },
    supportedChains: [NETWORKS.baseSepolia.chainId, NETWORKS.arbSepolia.chainId, NETWORKS.ethSepolia.chainId],
    hubChainId: NETWORKS.baseSepolia.chainId,
  },
} as const;

export const getVaultById = (id: string): Vault | undefined => {
  return VAULTS[id];
};

export const getAllVaults = (): Vault[] => {
  return Object.values(VAULTS);
};

export const getVaultsForChain = (chainId: number): Vault[] => {
  return Object.values(VAULTS).filter(vault => 
    vault.supportedChains.includes(chainId)
  );
};