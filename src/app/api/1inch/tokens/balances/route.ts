import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_API_BASE = 'https://api.1inch.dev';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('walletAddress');
  const chainId = searchParams.get('chainId') || '1'; // Default to Ethereum

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: 'Invalid wallet address format' },
      { status: 400 }
    );
  }

  try {
    const apiUrl = `${ONEINCH_API_BASE}/balance/v1.2/${chainId}/balances/${walletAddress}`;
    console.log('Fetching balances from:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch API error:', response.status, errorText);
      console.error('Request URL:', apiUrl);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'API authentication failed' },
          { status: 401 }
        );
      }
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Wallet address not found or no balances' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch balances: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Raw 1inch API response:', JSON.stringify(data, null, 2));
    
    // Transform the response to include more readable information
    const transformedBalances = Object.entries(data).map(([tokenAddress, tokenData]: [string, any]) => {
      const balance = parseFloat(tokenData.balance) / Math.pow(10, tokenData.decimals);
      
      return {
        tokenAddress,
        symbol: tokenData.symbol,
        name: tokenData.name,
        decimals: tokenData.decimals,
        balance: tokenData.balance,
        formattedBalance: balance.toFixed(6),
        displayBalance: balance < 0.000001 && balance > 0 ? balance.toExponential(3) : balance.toFixed(6)
      };
    });

    // Sort by balance value (highest first)
    transformedBalances.sort((a, b) => parseFloat(b.formattedBalance) - parseFloat(a.formattedBalance));

    return NextResponse.json({
      walletAddress,
      chainId,
      balances: transformedBalances,
      totalTokens: transformedBalances.length
    });

  } catch (error) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}