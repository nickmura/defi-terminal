import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.1inch.dev/swap/v6.0';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '1inch API key not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const src = searchParams.get('src');
    const dst = searchParams.get('dst');
    const amount = searchParams.get('amount');
    const chainId = searchParams.get('chainId') || '1'; // Default to ETH Mainnet

    if (!src || !dst || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: src, dst, amount' },
        { status: 400 }
      );
    }

    // Get current market rate using the swap quote endpoint
    const url = new URL(`${BASE_URL}/${chainId}/quote`);
    url.searchParams.append('src', src);
    url.searchParams.append('dst', dst);
    url.searchParams.append('amount', amount);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch quote API error:', response.status, errorText);
      return NextResponse.json(
        { error: `1inch API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Calculate the rate (how much dst per unit of src)
    const srcAmount = parseFloat(amount);
    const dstAmount = parseFloat(data.toAmount);
    const rate = dstAmount / srcAmount;

    return NextResponse.json({
      ...data,
      marketRate: rate,
      suggestedRate: Math.floor(rate * 0.98), // Suggest 2% below market for better fill chance
    });
  } catch (error) {
    console.error('Limit order quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}