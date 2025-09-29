import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chainIds = searchParams.getAll('chainId');
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    if (chainIds.length === 0) {
      return NextResponse.json({ error: 'At least one chainId parameter is required' }, { status: 400 });
    }

    const chainIdParams = chainIds.map(id => `chainIds=${id}`).join('&');
    const url = `https://api.1inch.dev/nft/v2/byaddress?${chainIdParams}&address=${address}`;
    console.log(url)
    const apiKey = process.env.ONEINCH_API_KEY;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`1inch API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.log(error)
    console.error('NFT API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFT data' },
      { status: 500 }
    );
  }
}