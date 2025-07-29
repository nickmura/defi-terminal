import { FetchProviderConnector, LimitOrderWithFee, Sdk } from "@1inch/limit-order-sdk";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  try {
    const {
        fromChainId,
        build,
        extension,
        signature,
    } = await request.json();
    const authKey = process.env.ONEINCH_API_KEY;
    if (!authKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const httpConnector = new FetchProviderConnector();

    const sdk = new Sdk({
      networkId: fromChainId,
      authKey: authKey,
      httpConnector: httpConnector,
    });

    
   

    const limitOrderWithFee = LimitOrderWithFee.fromDataAndExtension(build, extension)
    console.log(limitOrderWithFee, limitOrderWithFee instanceof LimitOrderWithFee);

    const submitOrder = await sdk.submitOrder(limitOrderWithFee, signature);
    console.log(submitOrder);


    return NextResponse.json({
      success: true,
      message: 'Limit order submitted successfully'
    });

  } catch (error) {
    console.error('Order submission error:', error);
    return NextResponse.json({
      success: false,
      error: 'Order submission failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}