import { NextRequest, NextResponse } from 'next/server';
import { createOneInchPlugin } from '@/plugins/1inch';

export async function GET(request: NextRequest) {
  try {
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
    console.log('Request params:', { src, dst, amount, slippage });

    // Use the 1inch plugin
    const plugin = createOneInchPlugin();
    const data = await plugin.getSwapQuote({
      chainId: parseInt(chainId),
      src,
      dst,
      amount,
      slippage: slippage ? parseFloat(slippage) : undefined
    });

    console.log('Response status: success');
    console.log(data);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Quote proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}