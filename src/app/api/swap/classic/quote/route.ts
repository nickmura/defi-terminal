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
    const slippage = searchParams.get('slippage');
    const chainId = searchParams.get('chainId') || '42161'; // Default to Arbitrum

    if (!src || !dst || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: src, dst, amount' },
        { status: 400 }
      );
    }

    console.log('Quote request for chain:', chainId);
    const url = new URL(`${BASE_URL}/${chainId}/quote`);
    url.searchParams.append('src', src);
    url.searchParams.append('dst', dst);
    url.searchParams.append('amount', amount);
    url.searchParams.append('includeGas', 'true');
    if (slippage) {
      url.searchParams.append('slippage', slippage);
    }


    console.log('Getting quote from:', url.toString());
    console.log('Request params:', { src, dst, amount, slippage });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    // console.log('Response headers:', [...response.headers.entries()]);


    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch quote API error:', response.status, errorText);
      console.error('Request URL was:', url.toString());
      return NextResponse.json(
        { error: `1inch API error: ${response.status}`, details: errorText, requestUrl: url.toString() },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(data)

    return NextResponse.json(data);
  } catch (error) {
    console.error('Quote proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}