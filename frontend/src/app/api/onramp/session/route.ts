import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/onramp/session
 * 
 * Creates a Coinbase Onramp session token for secure authentication
 * This endpoint generates a short-lived, one-time-use session token
 * that can be used to initialize the onramp flow
 */
export async function POST(request: NextRequest) {
  try {
    const { address, assets, blockchain } = await request.json();

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Get CDP project ID from environment
    const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;
    if (!projectId) {
      console.error('CDP Project ID not configured');
      return NextResponse.json(
        { error: 'Onramp service not configured' },
        { status: 500 }
      );
    }

    // For sandbox/demo mode, we'll generate a mock session token
    // In production, this would call the actual Coinbase API
    const mockSessionToken = generateMockSessionToken(address, assets, blockchain);

    console.log('Generated onramp session for:', { address, assets, blockchain });

    return NextResponse.json({
      sessionToken: mockSessionToken,
      expiresIn: 300, // 5 minutes
      onrampUrl: constructOnrampUrl(mockSessionToken, projectId)
    });

  } catch (error) {
    console.error('Error creating onramp session:', error);
    return NextResponse.json(
      { error: 'Failed to create onramp session' },
      { status: 500 }
    );
  }
}

/**
 * Generates a mock session token for sandbox testing
 * In production, this would be replaced with actual Coinbase API call
 */
function generateMockSessionToken(address: string, assets?: string[], blockchain?: string): string {
  const timestamp = Date.now();
  const payload = {
    address,
    assets: assets || ['USDC', 'ETH'],
    blockchain: blockchain || 'base',
    timestamp,
    projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID
  };

  // Generate a base64 encoded mock token
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Constructs the Coinbase Onramp URL with session token
 */
function constructOnrampUrl(sessionToken: string, projectId: string): string {
  const baseUrl = 'https://pay-sandbox.coinbase.com';
  
  const params = new URLSearchParams({
    sessionToken,
    // Additional parameters for better UX
    defaultAsset: 'USDC',
    defaultNetwork: 'base',
    defaultPaymentMethod: 'credit_debit_card',
    // Theme parameters
    theme: 'dark',
    presetFiatAmount: '10', // Default to $10
  });

  return `${baseUrl}?${params.toString()}`;
}