import { NextRequest, NextResponse } from 'next/server';
import { Balance } from '@/types';

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

    // TODO: Replace with actual CDP Data API integration
    // For now, return mock data that matches the expected structure
    for (const chainId of chainIds) {
      balances[chainId.toString()] = await getMockBalances(address, chainId);
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

// Mock balance data for development
async function getMockBalances(address: string, chainId: number): Promise<Balance[]> {
  // Simulate different balances based on chain
  switch (chainId) {
    case 84532: // Base Sepolia
      return [
        {
          contract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          symbol: 'USDC',
          decimals: 6,
          amount: '2500000000', // 2500 USDC
          value: '2500.00'
        },
        {
          contract: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
          amount: '1500000000000000000', // 1.5 ETH
          value: '3750.00'
        }
      ];
    
    case 421614: // Arbitrum Sepolia
      return [
        {
          contract: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
          symbol: 'USDC',
          decimals: 6,
          amount: '1000000000', // 1000 USDC
          value: '1000.00'
        }
      ];
    
    case 11155111: // Ethereum Sepolia
      return [
        {
          contract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
          symbol: 'USDC',
          decimals: 6,
          amount: '500000000', // 500 USDC
          value: '500.00'
        },
        {
          contract: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
          amount: '2000000000000000000', // 2.0 ETH
          value: '5000.00'
        }
      ];
    
    default:
      return [];
  }
}