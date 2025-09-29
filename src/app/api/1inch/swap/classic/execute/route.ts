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
    const from = searchParams.get('from');
    const slippage = searchParams.get('slippage');
    const chainId = searchParams.get('chainId') || '42161'; // Default to Arbitrum

    if (!src || !dst || !amount || !from) {
      return NextResponse.json(
        { error: 'Missing required parameters: src, dst, amount, from' },
        { status: 400 }
      );
    }

    console.log('Swap request for chain:', chainId);
    const url = new URL(`${BASE_URL}/${chainId}/swap`);
    url.searchParams.append('src', src);
    url.searchParams.append('dst', dst);
    url.searchParams.append('amount', amount);
    url.searchParams.append('from', from);
    if (slippage) {
      url.searchParams.append('slippage', slippage);
    }
    url.searchParams.append('disableEstimate', 'true');
    url.searchParams.append('allowPartialFill', 'false');

    console.log('Getting swap data from:', url.toString());

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
      console.error('1inch swap API error:', errorText);
      return NextResponse.json(
        { error: `1inch API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Swap proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}