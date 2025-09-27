import { OneInchAPI } from './api';
import { oneInchCommands } from './commands';
import {
  DexPlugin,
  PluginCommand,
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

export class OneInchPlugin implements DexPlugin {
  name = '1inch';
  supportedChains = [1, 10, 137, 42161, 8453, 56, 43114];

  // Feature flags
  supportsLimitOrders = true;
  supportsQuoteRefresh = true;
  supportsBatchSwaps = false;

  private api: OneInchAPI;
  private commands: Map<string, PluginCommand> = new Map();

  constructor(apiKey: string) {
    this.api = new OneInchAPI(apiKey);

    // Register all commands
    oneInchCommands.forEach(cmd => {
      this.commands.set(cmd.name, cmd);
    });
  }

  getCommands(): PluginCommand[] {
    return oneInchCommands;
  }

  async executeCommand(commandName: string, args: string[], context: any): Promise<void> {
    const command = this.commands.get(commandName);

    if (!command || !command.handler) {
      throw new Error(`Command "${commandName}" not found in 1inch plugin`);
    }

    await command.handler(args, context);
  }

  // API method delegations
  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse> {
    return this.api.getSwapQuote(params);
  }

  async executeSwap(params: SwapExecuteParams): Promise<SwapExecuteResponse> {
    return this.api.executeSwap(params);
  }

  async getApprovalSpender(chainId: number): Promise<string> {
    return this.api.getApprovalSpender(chainId);
  }

  async checkAllowance(params: AllowanceParams): Promise<string> {
    return this.api.checkAllowance(params);
  }

  async getLimitOrderQuote(params: LimitQuoteParams): Promise<LimitQuoteResponse> {
    return this.api.getLimitOrderQuote(params);
  }

  async createLimitOrder(params: CreateLimitOrderParams): Promise<CreateLimitOrderResponse> {
    return this.api.createLimitOrder(params);
  }

  async submitLimitOrder(params: SubmitLimitOrderParams): Promise<SubmitLimitOrderResponse> {
    return this.api.submitLimitOrder(params);
  }
}

// Plugin factory
export function createOneInchPlugin(apiKey?: string): OneInchPlugin {
  const key = apiKey || process.env.ONEINCH_API_KEY || '';
  return new OneInchPlugin(key);
}

// Re-export types for external use
export type {
  DexPlugin,
  PluginCommand,
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