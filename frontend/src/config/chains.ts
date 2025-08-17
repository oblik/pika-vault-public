/**
 * Chain ID constants for the application
 */
export const CHAIN_IDS = {
  // Mainnets
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  BASE: 8453,
  OPTIMISM: 10,
  
  // Testnets
  ETHEREUM_SEPOLIA: 11155111,
  POLYGON_MUMBAI: 80001,
  ARBITRUM_SEPOLIA: 421614,
  BASE_SEPOLIA: 84532,
  OPTIMISM_SEPOLIA: 11155420,
} as const;

/**
 * Hub chain for the vault system
 */
export const HUB_CHAIN_ID = CHAIN_IDS.BASE_SEPOLIA;

/**
 * Supported chains for cross-chain operations
 */
export const SUPPORTED_CHAIN_IDS = [
  CHAIN_IDS.BASE_SEPOLIA,
  CHAIN_IDS.ARBITRUM_SEPOLIA,
  CHAIN_IDS.ETHEREUM_SEPOLIA,
] as const;

export type SupportedChainId = typeof SUPPORTED_CHAIN_IDS[number];