import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cdp/session
 * 
 * Mints a Coinbase Onramp session token for the given address and chain
 * Body: { address: string, chainId: number, amount?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chainId, amount } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!chainId) {
      return NextResponse.json(
        { error: 'ChainId is required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual Coinbase Onramp API integration
    // This would normally use CDP server-side SDK to mint session tokens
    
    // Mock session token generation
    const sessionToken = generateMockSessionToken(address, chainId, amount);
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes from now

    return NextResponse.json({
      token: sessionToken,
      expiresAt
    });
  } catch (error) {
    console.error('Error creating onramp session:', error);
    return NextResponse.json(
      { error: 'Failed to create onramp session' },
      { status: 500 }
    );
  }
}

function generateMockSessionToken(address: string, chainId: number, amount?: string): string {
  // Generate a mock session token for development
  const payload = {
    address,
    chainId,
    amount: amount || '100',
    timestamp: Date.now()
  };
  
  // In a real implementation, this would be properly signed and encrypted
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}