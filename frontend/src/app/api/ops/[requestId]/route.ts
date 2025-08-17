import { NextRequest, NextResponse } from 'next/server';
import { PendingRequest } from '@/types';

/**
 * GET /api/ops/[requestId]
 * 
 * Returns merged status for a specific cross-chain request including:
 * - Hub and spoke events
 * - LayerZero message tracking
 * - CCTP burn/mint receipts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual contract event queries and external API calls
    // This would normally:
    // 1. Query hub and spoke contract events for this requestId
    // 2. Check LayerZero message status via LZ API
    // 3. Query CCTP attestation service for burn/mint status
    // 4. Merge all data into a unified view

    const requestData = await getMockRequestStatus(requestId);

    if (!requestData) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(requestData);
  } catch (error) {
    console.error('Error fetching request status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request status' },
      { status: 500 }
    );
  }
}

// Mock request status for development
async function getMockRequestStatus(requestId: string): Promise<PendingRequest | null> {
  // Simulate different request states based on requestId
  const mockRequests: Record<string, PendingRequest> = {
    '0x1234...5678': {
      requestId: '0x1234...5678',
      type: 'DEPOSIT',
      originChainId: 421614,
      destChainId: 84532,
      status: 'IN_FLIGHT',
      amount: '1000.00',
      asset: 'USDC',
      createdAt: Date.now() - 120000, // 2 minutes ago
      events: [
        {
          timestamp: Date.now() - 120000,
          label: 'Deposit initiated on Arbitrum',
          txUrl: 'https://sepolia.arbiscan.io/tx/0x1234567890abcdef'
        },
        {
          timestamp: Date.now() - 90000,
          label: 'CCTP burn confirmed',
          txUrl: 'https://sepolia.arbiscan.io/tx/0xabcdef1234567890',
          cctpUrl: 'https://circle.com/explorer/cctp/0x1234567890abcdef'
        },
        {
          timestamp: Date.now() - 60000,
          label: 'LayerZero message sent',
          lzTxUrl: 'https://layerzeroscan.com/tx/0x9876543210fedcba'
        },
        {
          timestamp: Date.now() - 30000,
          label: 'Processing on Base Sepolia',
        }
      ]
    },
    '0xabcd...1234': {
      requestId: '0xabcd...1234',
      type: 'REDEEM',
      originChainId: 84532,
      destChainId: 421614,
      status: 'CLAIMABLE',
      amount: '500.00',
      asset: 'shares',
      createdAt: Date.now() - 300000, // 5 minutes ago
      events: [
        {
          timestamp: Date.now() - 300000,
          label: 'Redeem requested on Base',
          txUrl: 'https://sepolia.basescan.org/tx/0x9876543210fedcba'
        },
        {
          timestamp: Date.now() - 240000,
          label: 'Shares burned on spoke',
          txUrl: 'https://sepolia.basescan.org/tx/0xfedcba0987654321'
        },
        {
          timestamp: Date.now() - 180000,
          label: 'LayerZero message delivered',
          lzTxUrl: 'https://layerzeroscan.com/tx/0xabcdef1234567890'
        },
        {
          timestamp: Date.now() - 120000,
          label: 'Hub processed redemption',
          txUrl: 'https://sepolia.basescan.org/tx/0x1111222233334444'
        },
        {
          timestamp: Date.now() - 60000,
          label: 'Ready to claim on Arbitrum',
        }
      ]
    }
  };

  return mockRequests[requestId] || null;
}