import { NextRequest, NextResponse } from 'next/server';
import { Coinbase, ExternalAddress } from '@coinbase/coinbase-sdk';

/**
 * POST /api/faucet
 * 
 * Requests test tokens from Coinbase CDP Faucets for both Base Sepolia and Ethereum Sepolia
 * Supports ETH and USDC on both networks
 */
export async function POST(request: NextRequest) {
  try {
    const { address, assets, networks } = await request.json();

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Configure CDP SDK
    const apiKeyId = process.env.CDP_API_KEY_ID;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET;

    if (!apiKeyId || !apiKeySecret) {
      console.error('CDP API credentials not configured');
      return NextResponse.json(
        { error: 'Faucet service not configured' },
        { status: 500 }
      );
    }

    // Initialize Coinbase SDK
    Coinbase.configure({
      apiKeyId,
      apiKeySecret,
    });

    const defaultNetworks = networks || ['base-sepolia', 'ethereum-sepolia'];
    const defaultAssets = assets || ['eth', 'usdc'];
    
    const results: Array<{
      network: string;
      asset: string;
      success: boolean;
      transactionHash?: string;
      error?: string;
    }> = [];

    // Process each network and asset combination
    for (const network of defaultNetworks) {
      for (const asset of defaultAssets) {
        try {
          console.log(`Requesting ${asset} faucet for ${address} on ${network}`);

          // Create external address for the network
          const externalAddress = new ExternalAddress(network, address);

          // Request faucet funds
          const faucetTransaction = await externalAddress.faucet(asset);

          // Wait for transaction to complete
          await faucetTransaction.wait();

          results.push({
            network,
            asset: asset.toUpperCase(),
            success: true,
            transactionHash: faucetTransaction.getTransactionHash(),
          });

          console.log(`✅ ${asset.toUpperCase()} faucet successful on ${network}:`, faucetTransaction.getTransactionHash());

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          results.push({
            network,
            asset: asset.toUpperCase(),
            success: false,
            error: errorMessage,
          });

          console.error(`❌ ${asset.toUpperCase()} faucet failed on ${network}:`, errorMessage);
        }
      }
    }

    // Calculate success rate
    const successCount = results.filter(r => r.success).length;
    const totalRequests = results.length;

    return NextResponse.json({
      address,
      results,
      summary: {
        successCount,
        totalRequests,
        successRate: `${Math.round((successCount / totalRequests) * 100)}%`
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error processing faucet request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process faucet request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/faucet
 * 
 * Returns information about supported faucet networks and assets
 */
export async function GET() {
  return NextResponse.json({
    supportedNetworks: [
      {
        name: 'Base Sepolia',
        id: 'base-sepolia',
        chainId: 84532,
        assets: [
          { symbol: 'ETH', limits: '1000 claims/24hrs, 0.0001 ETH per claim' },
          { symbol: 'USDC', limits: '10 claims/24hrs, 1 USDC per claim' },
        ]
      },
      {
        name: 'Ethereum Sepolia',
        id: 'ethereum-sepolia', 
        chainId: 11155111,
        assets: [
          { symbol: 'ETH', limits: '1000 claims/24hrs, 0.0001 ETH per claim' },
          { symbol: 'USDC', limits: '10 claims/24hrs, 1 USDC per claim' },
        ]
      }
    ],
    rateLimits: {
      eth: {
        claimsPerDay: 1000,
        amountPerClaim: '0.0001 ETH'
      },
      usdc: {
        claimsPerDay: 10,
        amountPerClaim: '1 USDC'
      }
    },
    usage: {
      endpoint: 'POST /api/faucet',
      requiredParams: ['address'],
      optionalParams: ['assets', 'networks'],
      example: {
        address: '0x742d35Cc6634C0532925a3b8D6Ac6dE86c4F04',
        assets: ['eth', 'usdc'],
        networks: ['base-sepolia', 'ethereum-sepolia']
      }
    }
  });
}