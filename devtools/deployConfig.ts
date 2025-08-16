import { EndpointId } from '@layerzerolabs/lz-definitions'

export const DEPLOYMENT_CONFIG = {
    // Vault chain configuration (where the ERC4626 vault lives)
    vault: {
        eid: EndpointId.BASESEP_V2_TESTNET,
        contracts: {
            vault: 'OVault4626AsyncRedeem',
            shareAdapter: 'MyShareOFTAdapter',
            composer: 'MyOVaultComposer',
        },
        // IF YOU HAVE A PRE-DEPLOYED ASSET, SET THE ADDRESS HERE
        // this will effectively skip the deployment of the asset OFT, and use this instead.
        assetAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC Base Sepolia (string)
    },

    // Asset OFT configuration (deployed on all chains OR use existing address)
    asset: {
        contract: 'MyAssetOFT',
        metadata: {
            name: 'MyAssetOFT',
            symbol: 'ASSET',
        },
        // Using USDC via CCTP on Base; no asset OFT mesh needed by default
        chains: [],
    },

    // Share OFT configuration (only on spoke chains)
    share: {
        contract: 'MyShareOFT',
        metadata: {
            name: 'MyShareOFT',
            symbol: 'SHARE',
        },
        // Spokes: Ethereum Sepolia and Arbitrum Sepolia (exclude hub/Base)
        chains: [EndpointId.SEPOLIA_V2_TESTNET, EndpointId.ARBSEP_V2_TESTNET],
    },
} as const

export const isVaultChain = (eid: number): boolean => eid === DEPLOYMENT_CONFIG.vault.eid
export const shouldDeployAsset = (eid: number): boolean =>
    !DEPLOYMENT_CONFIG.vault.assetAddress && DEPLOYMENT_CONFIG.asset.chains.includes(eid)
export const shouldDeployShare = (eid: number): boolean => DEPLOYMENT_CONFIG.share.chains.includes(eid)


