import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.1inch.dev/charts/v1.0/chart/aggregated/candle';

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
    const token0 = searchParams.get('token0');
    const token1 = searchParams.get('token1');
    const seconds = searchParams.get('seconds') || '3600'; // Default to 1 hour
    const chainId = searchParams.get('chainId') || '1'; // Default to Ethereum
    console.log(token0, token1)
    if (!token0 || !token1) {
      return NextResponse.json(
        { error: 'Missing required parameters: token0 and token1' },
        { status: 400 }
      );
    }

    // Use only the 4 documented parameters: token0, token1, seconds, chainId
    const url = `${BASE_URL}/${token0}/${token1}/${seconds}/${chainId}`;
    
    console.log('Candle chart API URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch charts API error:', response.status, errorText);
      return NextResponse.json(
        { error: `1inch API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log data points count for debugging
    if (data.candles && Array.isArray(data.candles)) {
      console.log(`Candle chart received ${data.candles.length} candles`);
    } else if (data.data && Array.isArray(data.data)) {
      console.log(`Candle chart received ${data.data.length} candles`);
    } else if (Array.isArray(data)) {
      console.log(`Candle chart received ${data.length} candles`);
    } else {
      console.log('Candle chart data structure:', Object.keys(data));
    }
    
    return NextResponse.json({
      token0,
      token1,
      seconds: parseInt(seconds),
      chainId: parseInt(chainId),
      candles: data
    });
  } catch (error) {
    console.error('Charts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}