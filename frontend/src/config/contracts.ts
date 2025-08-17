export const CONTRACTS = {
  // Hub contracts (Base Sepolia)
  hub: {
    vault: "0x0000000000000000000000000000000000000000", // OVault4626AsyncRedeem
    composer: "0x0000000000000000000000000000000000000000", // AsyncComposer OApp
    shareOFTAdapter: "0x0000000000000000000000000000000000000000", // Share OFT Adapter
  },

  // Spoke contracts per chain
  spokes: {
    arbSepolia: {
      shareOFT: "0x0000000000000000000000000000000000000000",
      assetOFT: "0x0000000000000000000000000000000000000000",
      spokeRedeemOApp: "0x0000000000000000000000000000000000000000",
    },
    ethSepolia: {
      shareOFT: "0x0000000000000000000000000000000000000000",
      assetOFT: "0x0000000000000000000000000000000000000000",
      spokeRedeemOApp: "0x0000000000000000000000000000000000000000",
    }
  },

  // CCTP contracts per chain
  cctp: {
    baseSepolia: { 
      tokenMessengerV2: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    },
    arbSepolia: { 
      tokenMessengerV2: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    },
    ethSepolia: {
      tokenMessengerV2: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    }
  },

  // CCIP NAV receivers per chain
  ccip: {
    navReceivers: {
      baseSepolia: "0x0000000000000000000000000000000000000000",
      arbSepolia: "0x0000000000000000000000000000000000000000",
      ethSepolia: "0x0000000000000000000000000000000000000000",
    }
  }
} as const;

export type ContractAddress = `0x${string}`;

// Helper function to get spoke contracts for a chain
export const getSpokeContracts = (chainId: number) => {
  switch (chainId) {
    case 421614: return CONTRACTS.spokes.arbSepolia;
    case 11155111: return CONTRACTS.spokes.ethSepolia;
    default: return null;
  }
};

// Helper function to get CCTP contracts for a chain
export const getCCTPContracts = (chainId: number) => {
  switch (chainId) {
    case 84532: return CONTRACTS.cctp.baseSepolia;
    case 421614: return CONTRACTS.cctp.arbSepolia;
    case 11155111: return CONTRACTS.cctp.ethSepolia;
    default: return null;
  }
};