import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getContract } from 'viem';
import { baseSepolia, arbitrumSepolia, sepolia } from 'viem/chains';
import { Balance } from '@/types';
import { getCCTPContracts } from '@/config/contracts';

/**
 * GET /api/cdp/balances
 * 
 * Fetches wallet token balances across multiple chains using CDP Data API
 * Query params: address, chains (comma-separated chain IDs)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chains = searchParams.get('chains');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    if (!chains) {
      return NextResponse.json(
        { error: 'Chains parameter is required' },
        { status: 400 }
      );
    }

    const chainIds = chains.split(',').map(id => parseInt(id.trim()));
    const balances: Record<string, Balance[]> = {};

    // Fetch real balances from blockchain
    for (const chainId of chainIds) {
      try {
        balances[chainId.toString()] = await getRealBalances(address, chainId);
      } catch (error) {
        console.error(`Error fetching balances for chain ${chainId}:`, error);
        balances[chainId.toString()] = [];
      }
    }

    return NextResponse.json(balances);
  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  }
] as const;

// Get chain configuration
function getChainConfig(chainId: number) {
  switch (chainId) {
    case 84532: return baseSepolia;
    case 421614: return arbitrumSepolia; 
    case 11155111: return sepolia;
    default: return null;
  }
}

// Fetch real balances from blockchain
async function getRealBalances(address: string, chainId: number): Promise<Balance[]> {
  const chainConfig = getChainConfig(chainId);
  const cctp = getCCTPContracts(chainId);
  
  if (!chainConfig || !cctp?.usdc) {
    return [];
  }

  try {
    // Create public client for the chain
    const client = createPublicClient({
      chain: chainConfig,
      transport: http(),
    });

    const balances: Balance[] = [];

    // Get USDC balance
    try {
      const usdcContract = getContract({
        address: cctp.usdc as `0x${string}`,
        abi: ERC20_ABI,
        client,
      });

      const [balance, symbol, decimals] = await Promise.all([
        usdcContract.read.balanceOf([address as `0x${string}`]),
        usdcContract.read.symbol(),
        usdcContract.read.decimals(),
      ]);

      const balanceStr = balance.toString();
      const balanceNumber = Number(balance) / Math.pow(10, decimals);

      balances.push({
        contract: cctp.usdc,
        symbol,
        decimals,
        amount: balanceStr,
        value: balanceNumber.toFixed(2),
      });
    } catch (error) {
      console.error(`Error fetching USDC balance for chain ${chainId}:`, error);
    }

    // Get native ETH balance
    try {
      const ethBalance = await client.getBalance({ 
        address: address as `0x${string}` 
      });
      
      const balanceStr = ethBalance.toString();
      const balanceNumber = Number(ethBalance) / Math.pow(10, 18);

      balances.push({
        contract: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        amount: balanceStr,
        value: (balanceNumber * 2500).toFixed(2), // Mock ETH price
      });
    } catch (error) {
      console.error(`Error fetching ETH balance for chain ${chainId}:`, error);
    }

    return balances;
  } catch (error) {
    console.error(`Error creating client for chain ${chainId}:`, error);
    return [];
  }
}