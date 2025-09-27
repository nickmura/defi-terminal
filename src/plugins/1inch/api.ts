import {
  Sdk,
  MakerTraits,
  FetchProviderConnector,
  Address,
  Extension,
  randBigInt,
  LimitOrderWithFee
} from '@1inch/limit-order-sdk';

import {
  SwapQuoteParams,
  SwapQuoteResponse,
  SwapExecuteParams,
  SwapExecuteResponse,
  AllowanceParams,
  LimitQuoteParams,
  LimitQuoteResponse,
  CreateLimitOrderParams,
  CreateLimitOrderResponse,
  SubmitLimitOrderParams,
  SubmitLimitOrderResponse
} from './types';

// Helper function to map native token addresses
const getProperTokenAddress = (token: string, chainId: number): string => {
  const nativeTokenPlaceholder = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  if (token.toLowerCase() !== nativeTokenPlaceholder.toLowerCase()) {
    return token;
  }

  const wrappedTokens: { [key: number]: string } = {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',    // WETH on Ethereum
    10: '0x4200000000000000000000000000000000000006',   // WETH on Optimism
    137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',  // WMATIC on Polygon
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
    8453: '0x4200000000000000000000000000000000000006',  // WETH on Base
    56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',   // WBNB on BSC
    43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX on Avalanche
  };

  return wrappedTokens[chainId] || token;
};

export class OneInchAPI {
  private apiKey: string;
  private baseUrl = 'https://api.1inch.dev/swap/v6.0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new Error('1inch API key is required. Please set ONEINCH_API_KEY environment variable.');
    }
  }

  private async makeRequest(endpoint: string, params?: any): Promise<any> {
    this.ensureApiKey(); // Check API key before making request

    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.description || `1inch API error: ${response.status}`);
    }

    return response.json();
  }

  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse> {
    const { chainId, src, dst, amount, slippage = 1 } = params;

    const data = await this.makeRequest(`/${chainId}/quote`, {
      src,
      dst,
      amount,
      includeGas: true,
      includeProtocols: true,
      includeTokensInfo: true,
      slippage,
    });

    return {
      dstAmount: data.dstAmount,
      gas: data.gas,
      srcToken: data.srcToken,
      dstToken: data.dstToken,
      protocols: data.protocols,
    };
  }

  async executeSwap(params: SwapExecuteParams): Promise<SwapExecuteResponse> {
    const {
      chainId,
      src,
      dst,
      amount,
      from,
      slippage = 1,
      disableEstimate = false,
      allowPartialFill = false
    } = params;

    const data = await this.makeRequest(`/${chainId}/swap`, {
      src,
      dst,
      amount,
      from,
      slippage,
      disableEstimate,
      allowPartialFill,
      includeGas: true,
      includeProtocols: true,
      includeTokensInfo: true,
    });

    return {
      tx: data.tx,
      dstAmount: data.dstAmount,
    };
  }

  async getApprovalSpender(chainId: number): Promise<string> {
    const data = await this.makeRequest(`/${chainId}/approve/spender`);
    return data.address;
  }

  async checkAllowance(params: AllowanceParams): Promise<string> {
    const { chainId, tokenAddress, walletAddress } = params;

    const data = await this.makeRequest(`/${chainId}/approve/allowance`, {
      tokenAddress,
      walletAddress,
    });

    return data.allowance;
  }

  async getLimitOrderQuote(params: LimitQuoteParams): Promise<LimitQuoteResponse> {
    const { chainId, src, dst, amount } = params;

    // Get market rate from swap quote
    const quoteData = await this.makeRequest(`/${chainId}/quote`, {
      src,
      dst,
      amount,
      includeGas: false,
    });

    const marketRate = (BigInt(quoteData.dstAmount) * BigInt(10 ** 18)) / BigInt(amount);
    const suggestedRate = (marketRate * BigInt(98)) / BigInt(100); // 2% below market

    return {
      marketRate: marketRate.toString(),
      suggestedRate: suggestedRate.toString(),
      dstAmount: quoteData.dstAmount,
    };
  }

  async createLimitOrder(params: CreateLimitOrderParams): Promise<CreateLimitOrderResponse> {
    this.ensureApiKey(); // Check API key before SDK operations

    const { chainId, makerAsset, takerAsset, makingAmount, takingAmount, maker } = params;

    // Get proper token addresses for limit orders
    const properMakerAsset = getProperTokenAddress(makerAsset, chainId);
    const properTakerAsset = getProperTokenAddress(takerAsset, chainId);

    // Check if trying to use native token
    if (properMakerAsset === makerAsset && makerAsset === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      throw new Error('Cannot create limit orders with native tokens. Please use wrapped tokens (WETH, WMATIC, etc.)');
    }

    // Create SDK instance with the new SDK
    const httpConnector = new FetchProviderConnector();
    const sdk = new Sdk({
      networkId: chainId,
      authKey: this.apiKey,
      httpConnector: httpConnector,
    });

    // Setup expiration (5 minutes)
    const expiresIn = BigInt(300);
    const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;
    const UINT_40_MAX = (BigInt(1) << BigInt(40)) - BigInt(1);

    // Create MakerTraits with order parameters
    const makerTraits = MakerTraits.default()
      .withExpiration(expiration)
      .withNonce(randBigInt(UINT_40_MAX))
      .allowMultipleFills()
      .allowPartialFills();

    // Create order info
    const orderInfo = {
      makerAsset: new Address(properMakerAsset),
      takerAsset: new Address(properTakerAsset),
      makingAmount: BigInt(makingAmount),
      takingAmount: BigInt(takingAmount),
      maker: new Address(maker),
    };

    // Create the order with SDK
    const limitOrder = await sdk.createOrder(orderInfo, makerTraits);
    const build = limitOrder.build();
    const extension: Extension = limitOrder.extension;
    const typedData = limitOrder.getTypedData(chainId);

    return {
      orderTypedData: typedData,
      orderBuildData: build,
      extension: extension.encode(),
    };
  }

  async submitLimitOrder(params: SubmitLimitOrderParams): Promise<SubmitLimitOrderResponse> {
    const { chainId, orderData, signature } = params;

    // Create SDK instance
    const httpConnector = new FetchProviderConnector();
    const sdk = new Sdk({
      networkId: chainId,
      authKey: this.apiKey,
      httpConnector: httpConnector,
    });

    // Reconstruct the limit order from build data and extension
    const limitOrderWithFee = LimitOrderWithFee.fromDataAndExtension(
      orderData.orderBuildData,
      orderData.extension
    );

    // Submit the order using the SDK
    await sdk.submitOrder(limitOrderWithFee, signature);

    return {
      orderHash: 'pending',
      status: 'submitted',
    };
  }
}