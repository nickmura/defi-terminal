import { NextRequest, NextResponse } from 'next/server';

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
    const symbol = searchParams.get('symbol')?.toLowerCase();
    const chainId = searchParams.get('chainId') || '1';
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required parameter: symbol' },
        { status: 400 }
      );
    }

    // Call 1inch multi-chain tokens API with required parameters
    const url = new URL('https://api.1inch.dev/token/v1.3/multi-chain');
    url.searchParams.append('provider', '1inch');
    url.searchParams.append('country', 'US');
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch tokens API error:', response.status, errorText);
      return NextResponse.json(
        { error: `1inch API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('1inch API response type:', Array.isArray(data) ? 'array' : 'object');
    console.log(`Looking for symbol: ${symbol} on chain ${chainId}`);
    
    // The API returns an array of token objects, not organized by chainId
    let foundToken = null;
    
    if (Array.isArray(data)) {
      // Filter by chainId and symbol
      for (const token of data) {
        if (token.chainId === parseInt(chainId) && 
            token.symbol && 
            token.symbol.toLowerCase() === symbol) {
          console.log(`Found token: ${token.symbol} at ${token.address} on chain ${token.chainId}`);
          foundToken = {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoURI: token.logoURI
          };
          break;
        }
      }
    } else {
      console.log('Unexpected data structure from 1inch API');
    }

    console.log('Found token:', foundToken);

    if (!foundToken) {
      return NextResponse.json(
        { error: `Token ${symbol.toUpperCase()} not found on chain ${chainId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      chainId: parseInt(chainId),
      token: foundToken
    });

  } catch (error) {
    console.error('Token resolve API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}