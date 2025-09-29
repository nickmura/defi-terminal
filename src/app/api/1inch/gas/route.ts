import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_API_BASE = 'https://api.1inch.dev/gas-price';

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
    const chainId = searchParams.get('chainId') || '1';
    
    console.log(`Getting gas prices for chain ${chainId}`);

    // Call 1inch gas price API
    const url = `${ONEINCH_API_BASE}/v1.6/${chainId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch gas price API error:', response.status, errorText);
      
      return NextResponse.json(
        { error: `Gas price lookup failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Process the response to include formatted values
    const processedData = {
      chainId,
      baseFee: data.baseFee,
      baseFeeGwei: data.baseFee ? (parseInt(data.baseFee) / 1e9).toFixed(2) : null,
      low: data.low ? {
        maxFeePerGas: data.low.maxFeePerGas,
        maxPriorityFeePerGas: data.low.maxPriorityFeePerGas,
        gwei: data.low.maxFeePerGas ? (parseInt(data.low.maxFeePerGas) / 1e9).toFixed(2) : null
      } : null,
      medium: data.medium ? {
        maxFeePerGas: data.medium.maxFeePerGas,
        maxPriorityFeePerGas: data.medium.maxPriorityFeePerGas,
        gwei: data.medium.maxFeePerGas ? (parseInt(data.medium.maxFeePerGas) / 1e9).toFixed(2) : null
      } : null,
      high: data.high ? {
        maxFeePerGas: data.high.maxFeePerGas,
        maxPriorityFeePerGas: data.high.maxPriorityFeePerGas,
        gwei: data.high.maxFeePerGas ? (parseInt(data.high.maxFeePerGas) / 1e9).toFixed(2) : null
      } : null,
      instant: data.instant ? {
        maxFeePerGas: data.instant.maxFeePerGas,
        maxPriorityFeePerGas: data.instant.maxPriorityFeePerGas,
        gwei: data.instant.maxFeePerGas ? (parseInt(data.instant.maxFeePerGas) / 1e9).toFixed(2) : null
      } : null
    };
    
    return NextResponse.json(processedData);

  } catch (error) {
    console.error('Gas price error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}