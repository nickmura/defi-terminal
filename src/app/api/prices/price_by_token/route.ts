import { NextRequest, NextResponse } from 'next/server';
import { TOKENS } from '../../../helper';

const BASE_URL = 'https://api.1inch.dev/price/v1.1';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '1inch API key not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chainId = searchParams.get('chainId') || '1'; // Default to Arbitrum
    
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing required parameter: token (address or symbol)' },
        { status: 400 }
      );
    }

    let tokenAddress = token;

    // If token looks like a symbol, try to resolve it to an address
    if (!token.startsWith('0x') && token.length < 10) {
      const networkTokens = TOKENS[parseInt(chainId) as keyof typeof TOKENS];
      if (networkTokens) {
        const tokenInfo = networkTokens[token.toUpperCase() as keyof typeof networkTokens];
        if (tokenInfo) {
          tokenAddress = tokenInfo.address;
        } else {
          return NextResponse.json(
            { error: `Token ${token.toUpperCase()} not found on chain ${chainId}` },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: `Chain ${chainId} not supported` },
          { status: 400 }
        );
      }
    }

    const url = `${BASE_URL}/${chainId}`;
    
    const requestBody = {
      tokens: [tokenAddress],
      currency: "USD"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch price API error:', response.status, errorText);
      return NextResponse.json(
        { error: `1inch API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();


    const priceResponse = {
      token: tokenAddress,
      symbol: token,
      chainId,
      price: data[tokenAddress.toLowerCase()],
      currency: 'USD'
    }

    console.log(priceResponse)
    return NextResponse.json(priceResponse);
  } catch (error) {
    console.error('Price lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}