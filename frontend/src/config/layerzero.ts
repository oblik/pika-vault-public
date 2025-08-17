/**
 * LayerZero configuration and constants
 */
export const LAYERZERO_CONFIG = {
  // LayerZero Endpoint addresses per chain
  endpoints: {
    baseSepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f", 
    arbSepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    ethSepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f"
  },
  
  // LayerZero Endpoint IDs (EIDs)
  eids: {
    baseSepolia: 40245, // Base Sepolia EID
    arbSepolia: 40231,  // Arbitrum Sepolia EID 
    ethSepolia: 40161   // Ethereum Sepolia EID
  },
  
  // CCTP domain IDs
  cctpDomains: {
    baseSepolia: 6,     // Base Sepolia CCTP domain
    arbSepolia: 3,      // Arbitrum Sepolia CCTP domain
    ethSepolia: 0       // Ethereum Sepolia CCTP domain
  }
} as const;

// Helper function to get LayerZero endpoint for a chain
export const getLayerZeroEndpoint = (chainId: number) => {
  switch (chainId) {
    case 84532: return LAYERZERO_CONFIG.endpoints.baseSepolia;
    case 421614: return LAYERZERO_CONFIG.endpoints.arbSepolia;
    case 11155111: return LAYERZERO_CONFIG.endpoints.ethSepolia;
    default: return null;
  }
};

// Helper function to get LayerZero EID for a chain
export const getLayerZeroEID = (chainId: number) => {
  switch (chainId) {
    case 84532: return LAYERZERO_CONFIG.eids.baseSepolia;
    case 421614: return LAYERZERO_CONFIG.eids.arbSepolia;
    case 11155111: return LAYERZERO_CONFIG.eids.ethSepolia;
    default: return null;
  }
};

// Helper function to get CCTP domain for a chain
export const getCCTPDomain = (chainId: number) => {
  switch (chainId) {
    case 84532: return LAYERZERO_CONFIG.cctpDomains.baseSepolia;
    case 421614: return LAYERZERO_CONFIG.cctpDomains.arbSepolia;
    case 11155111: return LAYERZERO_CONFIG.cctpDomains.ethSepolia;
    default: return null;
  }
};