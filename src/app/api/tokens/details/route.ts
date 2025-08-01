import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_API_BASE = 'https://api.1inch.dev/token-details';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '1inch API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || '1';
    
    console.log(`Getting network details for chain ${chain}`);

    // Call 1inch token details API to get network information
    const url = `${ONEINCH_API_BASE}/v1.0/details/${chain}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch network details API error:', response.status, errorText);
      console.error('Full URL:', url);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Network chain ${chain} not found or not supported` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Network details lookup failed: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      chain,
      details: data.details || null,
      assets: data.assets || null,
      rawResponse: data
    });

  } catch (error) {
    console.error('Network details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}