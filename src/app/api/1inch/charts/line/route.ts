import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.1inch.dev/charts/v1.0/chart/line';

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
    const period = searchParams.get('period') || 'AllTime'; // Default to all time
    const chainId = searchParams.get('chainId') || '1'; // Default to Ethereum
    
    if (!token0 || !token1) {
      return NextResponse.json(
        { error: 'Missing required parameters: token0 and token1' },
        { status: 400 }
      );
    }

    // Use the documented parameters: token0, token1, period, chainId
    const url = `${BASE_URL}/${token0}/${token1}/${period}/${chainId}`;
    
    console.log('Line chart API URL:', url);
    
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
    if (Array.isArray(data)) {
      console.log(`Line chart received ${data.length} data points`);
    } else if (data.data && Array.isArray(data.data)) {
      console.log(`Line chart received ${data.data.length} data points`);
    } else {
      console.log('Line chart data structure:', Object.keys(data));
    }
    
    return NextResponse.json({
      token0,
      token1,
      period,
      chainId: parseInt(chainId),
      lineData: data
    });
  } catch (error) {
    console.error('Line charts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}