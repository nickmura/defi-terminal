// Main export file for plugins
export { createOneInchPlugin, OneInchPlugin } from './1inch/index';
export type { DexPlugin, PluginCommand } from './1inch/index';
export { pluginRegistry, PluginRegistry } from './registry';

// Type exports
export type {
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
} from './1inch/index';