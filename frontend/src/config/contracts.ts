export const CONTRACTS = {
  // Hub contracts (Base Sepolia)
  hub: {
    vault: "0x81A7A4Ece4D161e720ec602Ad152a7026B82448b", // OVault4626AsyncRedeem
    composer: "0xCD771B830C1775308e8EE5B8F582f3956054041c", // AsyncComposer OApp
    shareOFTAdapter: "0x6Df71536c389d09E9175ea9585f7DCD1A95B29d3", // Share OFT Adapter
    cctpBridger: "0x42Ffc8306c022Dd17f09daD0FF71f7313Df0A48D", // CCTP Bridger
    cctpDepositReceiver: "0x138108cB4Ae27856d292D52205BBC530A4A4E229", // CCTP Deposit Receiver
    navReceiver: "0x77e424Dab916412C04eBe6B8c0435B3202f4C81B", // NAV Receiver
  },

  // Spoke contracts per chain
  spokes: {
    arbSepolia: {
      shareOFT: "0x6Df71536c389d09E9175ea9585f7DCD1A95B29d3",
      spokeRedeemOApp: "0xC91A582E0FB8f2DbFe1309B3f578876564Bd7Ee0",
      navPusher: "0x77e424Dab916412C04eBe6B8c0435B3202f4C81B",
      cctpBridger: "0x81A7A4Ece4D161e720ec602Ad152a7026B82448b",
    },
    ethSepolia: {
      shareOFT: "0xACF7C2898bF9397AE1453aB98400763FeA2296A3",
      spokeRedeemOApp: "0xEB2b3Ce4ff766d1f1032E40576e2298b0eE014Ab",
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