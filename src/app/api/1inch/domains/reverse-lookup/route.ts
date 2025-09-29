import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_API_BASE = 'https://api.1inch.dev/domains';

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
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    console.log(`Looking up domain for address: ${address}`);

    // Call 1inch domains reverse lookup API
    const url = `${ONEINCH_API_BASE}/v2.0/reverse-lookup?address=${address}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'address': address.toLowerCase() // 1inch expects lowercase addresses
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No domain found for this address
        return NextResponse.json({
          address: address.toLowerCase(),
          domain: null,
          hasDomain: false
        });
      }
      
      const errorText = await response.text();
      console.error('1inch domains API error:', response.status, errorText);
      
      return NextResponse.json(
        { error: `Domain lookup failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('1inch domains API response:', data);
    
    // Extract domain name from response structure: { result: [{ protocol: "ENS", domain: "nickmura.eth", ... }] }
    let domainName = null;
    
    if (data.result && Array.isArray(data.result) && data.result.length > 0) {
      // Take the first result (there could be multiple domains)
      const firstResult = data.result[0];
      if (firstResult && firstResult.domain) {
        domainName = firstResult.domain;
      }
    }
    
    return NextResponse.json({
      address: address.toLowerCase(),
      domain: domainName,
      hasDomain: domainName !== null,
      protocol: data.result?.[0]?.protocol || null,
      rawResponse: data // For debugging
    });

  } catch (error) {
    console.error('Domain reverse lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}