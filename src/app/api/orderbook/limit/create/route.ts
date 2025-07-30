import { NextRequest, NextResponse } from "next/server";
import { Sdk, MakerTraits, FetchProviderConnector, Address, Extension, randBigInt } from "@1inch/limit-order-sdk";
import { keccak256 } from 'viem';

import { getProperTokenAddress } from "../../../helper";

export async function POST(request: NextRequest) {
  try {
    const {
      fromChainId,
      fromToken,
      toToken,
      amount,
      price,
      userAddress,
    } = await request.json();

    const authKey = process.env.ONEINCH_API_KEY;
    if (!authKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Create SDK instance
    const httpConnector = new FetchProviderConnector();
    const sdk = new Sdk({
      networkId: fromChainId,
      authKey: authKey,
      httpConnector: httpConnector,
    });

    // Convert amounts to BigInt with proper decimals
    const makingAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals)));
    const takingAmount = BigInt(Math.floor(parseFloat(amount) * parseFloat(price) * Math.pow(10, toToken.decimals)));



    const makerAssetAddress = getProperTokenAddress(fromToken, fromChainId);
    const takerAssetAddress = getProperTokenAddress(toToken, fromChainId);
    // Optional expiration setup
    const expiresIn = BigInt(300); // 5 minutes
    const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;
    const UINT_40_MAX = (BigInt(1) << BigInt(40)) - BigInt(1); // 40 bits, not 48

    // Create MakerTraits
    const makerTraits = MakerTraits.default()

      .withExpiration(expiration)
      .withNonce(randBigInt(UINT_40_MAX))
      .allowMultipleFills()
      .allowPartialFills()


    // Create order info
    const orderInfo = {
      makerAsset: new Address(makerAssetAddress),
      takerAsset: new Address(takerAssetAddress),
      makingAmount: makingAmount,
      takingAmount: takingAmount,
      maker: new Address(userAddress),
    };

    // Create the order with SDK
    const limitOrder = await sdk.createOrder(orderInfo, makerTraits);
    const build = limitOrder.build() // non encoded  
    const extension:Extension = limitOrder.extension 


    const typedData = limitOrder.getTypedData(fromChainId)

    return NextResponse.json({
      fromChainId,
      build,
      extension,
      typedData
    })
  } catch (error) {
    console.error('Limit order creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create limit order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}