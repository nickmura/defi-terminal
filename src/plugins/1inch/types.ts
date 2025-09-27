// Core plugin types
export type CommandHandler = (args: string[], context: any) => Promise<void> | void;

export interface PluginCommand {
  name: string;
  description: string;
  usage: string;
  examples?: string[];
  handler: CommandHandler;
}

export interface DexPlugin {
  name: string;
  supportedChains: number[];

  // Feature support flags
  supportsLimitOrders?: boolean;
  supportsQuoteRefresh?: boolean;
  supportsBatchSwaps?: boolean;

  // Command system
  getCommands(): PluginCommand[];
  executeCommand(commandName: string, args: string[], context: any): Promise<void>;

  // API methods
  getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse>;
  executeSwap(params: SwapExecuteParams): Promise<SwapExecuteResponse>;
  getApprovalSpender(chainId: number): Promise<string>;
  checkAllowance(params: AllowanceParams): Promise<string>;

  // Optional methods
  getLimitOrderQuote?(params: LimitQuoteParams): Promise<LimitQuoteResponse>;
  createLimitOrder?(params: CreateLimitOrderParams): Promise<CreateLimitOrderResponse>;
  submitLimitOrder?(params: SubmitLimitOrderParams): Promise<SubmitLimitOrderResponse>;
}

// API Types
export interface SwapQuoteParams {
  chainId: number;
  src: string;
  dst: string;
  amount: string;
  slippage?: number;
}

export interface SwapQuoteResponse {
  dstAmount: string;
  gas?: string;
  srcToken: any;
  dstToken: any;
  protocols?: any;
}

export interface SwapExecuteParams {
  chainId: number;
  src: string;
  dst: string;
  amount: string;
  from: string;
  slippage?: number;
  disableEstimate?: boolean;
  allowPartialFill?: boolean;
}

export interface SwapExecuteResponse {
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: string;
  };
  dstAmount: string;
}

export interface AllowanceParams {
  chainId: number;
  tokenAddress: string;
  walletAddress: string;
}

export interface LimitQuoteParams {
  chainId: number;
  src: string;
  dst: string;
  amount: string;
}

export interface LimitQuoteResponse {
  marketRate: string;
  suggestedRate: string;
  dstAmount: string;
}

export interface CreateLimitOrderParams {
  chainId: number;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  maker: string;
}

export interface CreateLimitOrderResponse {
  orderTypedData: any;
  orderBuildData: any;
  extension: string;
}

export interface SubmitLimitOrderParams {
  chainId: number;
  orderData: any;
  signature: string;
}

export interface SubmitLimitOrderResponse {
  orderHash: string;
  status: string;
}