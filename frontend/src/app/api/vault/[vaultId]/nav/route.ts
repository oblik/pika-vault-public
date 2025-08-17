import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia, arbitrumSepolia, sepolia } from 'viem/chains';
import { CONTRACTS } from '@/config/contracts';

const VAULT_ABI = [
  {
    "inputs": [],
    "name": "totalAssets",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "asset",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

/**
 * GET /api/vault/[vaultId]/nav
 * 
 * Fetches vault NAV (Net Asset Value) and holdings from the deployed contracts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string }> }
) {
  try {
    const { vaultId } = await params;

    if (vaultId !== 'usdc-multichain') {
      return NextResponse.json(
        { error: 'Vault not found' },
        { status: 404 }
      );
    }

    // Create clients for different chains
    const baseClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    });

    const arbClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http()
    });

    const ethClient = createPublicClient({
      chain: sepolia,
      transport: http()
    });

    // Fetch vault data from hub (Base Sepolia)
    const [totalAssets, totalSupply] = await Promise.all([
      baseClient.readContract({
        address: CONTRACTS.hub.vault as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'totalAssets',
      }),
      baseClient.readContract({
        address: CONTRACTS.hub.vault as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'totalSupply',
      }),
    ]);

    // Calculate NAV (price per share)
    const nav = totalSupply > 0n 
      ? Number(formatUnits(totalAssets, 6)) / Number(formatUnits(totalSupply, 18))
      : 1.0;

    // Fetch USDC balances across all chains for holdings breakdown
    const [baseUsdcBalance, arbUsdcBalance, ethUsdcBalance] = await Promise.all([
      // Base Sepolia USDC balance
      baseClient.readContract({
        address: CONTRACTS.cctp.baseSepolia.usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [CONTRACTS.hub.vault as `0x${string}`],
      }),
      // Arbitrum Sepolia USDC balance  
      arbClient.readContract({
        address: CONTRACTS.cctp.arbSepolia.usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [CONTRACTS.spokes.arbSepolia.shareOFT as `0x${string}`],
      }),
      // Ethereum Sepolia USDC balance
      ethClient.readContract({
        address: CONTRACTS.cctp.ethSepolia.usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [CONTRACTS.spokes.ethSepolia.shareOFT as `0x${string}`],
      }),
    ]);

    // Format holdings data
    const holdings = [
      {
        chainId: 84532,
        chainName: 'Base Sepolia',
        asset: 'USDC',
        balance: formatUnits(baseUsdcBalance, 6),
        value: formatUnits(baseUsdcBalance, 6) // 1:1 for USDC
      },
      {
        chainId: 421614,
        chainName: 'Arbitrum Sepolia',
        asset: 'USDC',
        balance: formatUnits(arbUsdcBalance, 6),
        value: formatUnits(arbUsdcBalance, 6)
      },
      {
        chainId: 11155111,
        chainName: 'Ethereum Sepolia',
        asset: 'USDC',
        balance: formatUnits(ethUsdcBalance, 6),
        value: formatUnits(ethUsdcBalance, 6)
      }
    ].filter(holding => Number(holding.balance) > 0); // Only show non-zero holdings

    const navData = {
      nav: nav.toFixed(6),
      totalAssets: formatUnits(totalAssets, 6),
      totalSupply: formatUnits(totalSupply, 18),
      holdings,
      timestamp: Date.now()
    };

    return NextResponse.json(navData);
  } catch (error) {
    console.error('Error fetching vault NAV:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault data' },
      { status: 500 }
    );
  }
}