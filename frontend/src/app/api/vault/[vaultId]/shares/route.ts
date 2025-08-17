import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getContract } from 'viem';
import { baseSepolia, arbitrumSepolia, sepolia } from 'viem/chains';
import { CONTRACTS, getSpokeContracts } from '@/config/contracts';
import { HUB_CHAIN_ID, SUPPORTED_CHAIN_IDS } from '@/config/chains';
import { abi as OFT_ABI } from '@/abis/MyShareOFT.json'

// Get chain configuration
function getChainConfig(chainId: number) {
  switch (chainId) {
    case 84532: return { ...baseSepolia, alchemyName: 'base-sepolia' };
    case 421614: return { ...arbitrumSepolia, alchemyName: 'arb-sepolia' };
    case 11155111: return { ...sepolia, alchemyName: 'eth-sepolia' };
    default: return null;
  }
}

// Get OFT contract address for each chain
function getOFTContract(chainId: number) {
  if (chainId === HUB_CHAIN_ID) {
    return CONTRACTS.hub.vault; // Hub uses vault?
  }

  const spokeContracts = getSpokeContracts(chainId);
  return spokeContracts?.shareOFT; // Spokes use shareOFT
}

// Get chain name for display
function getChainName(chainId: number) {
  switch (chainId) {
    case 84532: return 'Base Sepolia';
    case 421614: return 'Arbitrum Sepolia';
    case 11155111: return 'Ethereum Sepolia';
    default: return `Chain ${chainId}`;
  }
}

/**
 * GET /api/vault/[vaultId]/shares
 *
 * Fetches user's OFT share balances across all supported chains
 * Query params: address (user wallet address)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { vaultId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    console.log('Fetching shares for address:', address);

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const shares: Array<{
      chainId: number;
      chainName: string;
      balance: string;
      formatted: string;
      symbol: string;
      decimals: number;
      contractAddress: string;
    }> = [];

    // Fetch balances from all supported chains
    await Promise.all(
      SUPPORTED_CHAIN_IDS.map(async (chainId) => {
        try {
          const chainConfig = getChainConfig(chainId);
          const oftAddress = getOFTContract(chainId);

          if (!chainConfig || !oftAddress) {
            return;
          }

          // Create public client for the chain
          const client = createPublicClient({
            chain: chainConfig,
            transport: http(`https://${chainConfig.alchemyName}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
          });

          const oftContract = getContract({
            address: oftAddress as `0x${string}`,
            abi: OFT_ABI,
            client,
          });

          const [balance, symbol, decimals] = await Promise.all([
            oftContract.read.balanceOf([address as `0x${string}`]),
            oftContract.read.symbol(),
            oftContract.read.decimals(),
          ]);

          console.log({ chainId, balance, symbol, decimals });

          const balanceStr = balance.toString();
          const balanceNumber = Number(balance) / Math.pow(10, decimals);

          shares.push({
            chainId,
            chainName: getChainName(chainId),
            balance: balanceStr,
            formatted: balanceNumber.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6
            }),
            symbol,
            decimals,
            contractAddress: oftAddress,
          });
        } catch (error) {
          console.error(`Error fetching OFT balance for chain ${chainId}:`, error);

          // Add zero balance entry for failed chains
          const oftAddress = getOFTContract(chainId);
          if (oftAddress) {
            shares.push({
              chainId,
              chainName: getChainName(chainId),
              balance: '0',
              formatted: '0',
              symbol: 'SHARES',
              decimals: 6,
              contractAddress: oftAddress,
            });
          }
        }
      })
    );

    // Sort by chain ID for consistent ordering
    shares.sort((a, b) => a.chainId - b.chainId);

    // Calculate total shares across all chains
    const totalShares = shares.reduce((sum, share) => {
      return sum + parseFloat(share.formatted.replace(/,/g, ''));
    }, 0);

    return NextResponse.json({
      shares,
      totalShares: totalShares.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      }),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching OFT shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OFT shares' },
      { status: 500 }
    );
  }
}
