import { PluginCommand, CommandHandler } from './types';
import { OneInchAPI } from './api';

// Parse command arguments and extract network/protocol info
const parseArgs = (args: string[], defaultNetwork: string) => {
  const networkMap: { [key: string]: string } = {
    'ethereum': '1',
    'mainnet': '1',
    'polygon': '137',
    'matic': '137',
    'optimism': '10',
    'arbitrum': '42161',
    'arb': '42161',
    'base': '8453',
    'bsc': '56',
    'binance': '56',
    'avalanche': '43114',
    'avax': '43114'
  };

  let network = defaultNetwork;
  let networkIndex = -1;

  // Check for network shortcuts
  for (const [networkName, chainId] of Object.entries(networkMap)) {
    if (args.includes(`--${networkName}`)) {
      network = chainId;
      networkIndex = args.indexOf(`--${networkName}`);
      break;
    }
  }

  // Check for --network flag with value
  if (networkIndex === -1) {
    const netIdx = args.findIndex(arg => arg === '--network');
    if (netIdx !== -1 && netIdx + 1 < args.length) {
      const networkName = args[netIdx + 1].toLowerCase();
      if (networkMap[networkName]) {
        network = networkMap[networkName];
        networkIndex = netIdx;
      }
    }
  }

  // Filter out network args
  const cleanArgs = args.filter((_, index) => {
    if (networkIndex !== -1) {
      if (args[networkIndex] === '--network' && (index === networkIndex || index === networkIndex + 1)) {
        return false;
      }
      if (args[networkIndex].startsWith('--') && index === networkIndex) {
        return false;
      }
    }
    return true;
  });

  return { network, cleanArgs };
};

// Helper to show available tokens for a network
const showAvailableTokens = (chainId: string, addLine: any) => {
  const tokenMap: { [key: string]: string[] } = {
    '1': ['eth', 'weth', 'usdc', 'usdt', 'dai', 'wbtc', 'link', 'uni', 'aave'],
    '42161': ['eth', 'weth', 'usdc', 'usdc.e', 'usdt', 'dai', 'wbtc', 'arb', 'link', 'uni'],
    '10': ['eth', 'weth', 'usdc', 'usdc.e', 'usdt', 'dai', 'wbtc', 'op', 'link'],
    '137': ['matic', 'wmatic', 'usdc', 'usdt', 'dai', 'weth', 'wbtc', 'link'],
    '8453': ['eth', 'weth', 'usdc', 'usdbc', 'dai', 'wbtc', 'link'],
    '56': ['bnb', 'wbnb', 'usdc', 'usdt', 'busd', 'eth', 'btcb'],
    '43114': ['avax', 'wavax', 'usdc', 'usdc.e', 'usdt', 'dai', 'weth']
  };

  const tokens = tokenMap[chainId];
  if (tokens) {
    addLine(`💡 Available tokens on chain ${chainId}: ${tokens.join(', ')}`);
  }
};

// 1inch Swap Command
const swapCommand: CommandHandler = async (args: string[], context: any) => {
  const {
    addLine,
    isConnected,
    chainId,
    handleClassicSwap,
    handleLimitOrder,
    parseSwapCommand,
    parseLimitOrderCommand,
    updateTabName
  } = context;

  if (!isConnected) {
    addLine('❌ Access denied: Wallet connection required', 'error');
    addLine('Connect your wallet to use swap commands', 'error');
    return;
  }

  const { network, cleanArgs } = parseArgs(args, chainId.toString());
  const swapType = cleanArgs[0];

  // Debug output
  addLine(`🔍 Debug: Original args: [${args.join(', ')}]`);
  addLine(`🔍 Debug: Clean args: [${cleanArgs.join(', ')}]`);
  addLine(`🔍 Debug: Swap type: ${swapType}, Network: ${network}`);

  addLine(`🔄 Using 1INCH for ${swapType} swap on chain ${network}`);

  if (swapType === 'classic') {
    // parseSwapCommand expects [type, amount, from, to, ...] NOT ['swap', type, amount, from, to]
    // So we pass cleanArgs directly: ['classic', '0.001', 'eth', 'usdc']
    addLine(`🔍 Debug: Args for parseSwapCommand: [${cleanArgs.join(', ')}]`);

    const parsed = parseSwapCommand(cleanArgs);
    if (!parsed) {
      addLine('Usage: swap classic <amount> <from> <to> [--network <name>] [--slippage <percent>]', 'error');
      addLine('Example: swap classic 0.001 eth usdc --network arbitrum --slippage 0.5', 'error');
      showAvailableTokens(network, addLine);
      return;
    }

    const { amount, fromToken, toToken, slippage } = parsed;
    addLine(`🔍 Debug: Parsed result - amount: ${amount}, fromToken: ${fromToken}, toToken: ${toToken}, slippage: ${slippage}`);
    addLine(`📊 Swapping ${amount} ${fromToken.toUpperCase()} → ${toToken.toUpperCase()}`);
    updateTabName?.('swap', '1inch-classic');

    try {
      await handleClassicSwap(amount, fromToken, toToken, network, slippage);
    } catch (error: any) {
      addLine(`❌ Swap failed: ${error.message}`, 'error');
      if (error.message.includes('Token not found')) {
        addLine('', 'error');
        showAvailableTokens(network, addLine);
        addLine('💡 Tip: You can also use contract addresses directly', 'error');
      }
    }

  } else if (swapType === 'limit') {
    // parseLimitOrderCommand expects [type, amount, from, to, ...] NOT ['swap', type, amount, from, to]
    // So we pass cleanArgs directly: ['limit', '1', 'weth', 'usdc']
    const parsed = parseLimitOrderCommand(cleanArgs);
    if (!parsed) {
      addLine('Usage: swap limit <amount> <from> <to> [--rate <rate>] [--network <name>]', 'error');
      addLine('Example: swap limit 1 weth usdc --rate 4000 --network arbitrum', 'error');
      showAvailableTokens(network, addLine);
      return;
    }

    const { amount, fromToken, toToken, rate } = parsed;
    addLine(`📊 Creating limit order: ${amount} ${fromToken.toUpperCase()} → ${toToken.toUpperCase()}`);
    updateTabName?.('swap', '1inch-limit');

    try {
      await handleLimitOrder(amount, fromToken, toToken, network, rate);
    } catch (error: any) {
      addLine(`❌ Limit order failed: ${error.message}`, 'error');
      if (error.message.includes('Token not found')) {
        addLine('', 'error');
        showAvailableTokens(network, addLine);
        addLine('💡 Tip: You can also use contract addresses directly', 'error');
      }
    }

  } else {
    addLine('Usage: swap <classic|limit> <amount> <from> <to> [options]', 'error');
    addLine('  swap classic - Immediate swap with slippage protection', 'error');
    addLine('  swap limit - Create limit order at specific rate', 'error');
    addLine('');
    showAvailableTokens(network, addLine);
  }
};

// 1inch Stats Command
const statsCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId } = context;
  const { network } = parseArgs(args, chainId.toString());

  addLine('📊 1inch Protocol Statistics');
  addLine(`🌐 Network: Chain ${network}`);
  addLine('');
  addLine('✅ Features supported:');
  addLine('   • Classic swaps with gas optimization');
  addLine('   • Limit orders with 5-minute expiration');
  addLine('   • Multiple protocol aggregation');
  addLine('   • Partial fills on limit orders');
  addLine('');
  addLine('🔗 API Version: v6.0');
  addLine('📈 Protocol: Aggregated DEX routing');
};

// Compare rates across 1inch routes
const routesCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId } = context;

  if (args.length < 3) {
    addLine('Usage: 1inch-routes <amount> <from> <to> [--network <chain>]', 'error');
    addLine('Example: 1inch-routes 1 eth usdc --network optimism', 'error');
    return;
  }

  const [amount, fromToken, toToken] = args;
  const { network } = parseArgs(args, chainId.toString());

  addLine(`🔍 Finding best 1inch routes for ${amount} ${fromToken.toUpperCase()} → ${toToken.toUpperCase()}`);
  addLine(`🌐 Network: Chain ${network}`);
  addLine('');

  try {
    // This would call the 1inch API to get route breakdown
    addLine('⏳ Fetching route options...');
    addLine('✅ This would show detailed routing through different DEXs');
    addLine('📊 Route optimization analysis would appear here');

  } catch (error) {
    addLine(`❌ Failed to fetch routes: ${error}`, 'error');
  }
};

// Export all 1inch commands
export const oneInchCommands: PluginCommand[] = [
  {
    name: 'swap',
    description: 'Execute swaps using 1inch aggregator',
    usage: 'swap <classic|limit> <amount> <from> <to> [options]',
    examples: [
      'swap classic 1 eth usdc --network optimism --slippage 0.5',
      'swap limit 1 weth usdc --rate 4000 --network ethereum'
    ],
    handler: swapCommand
  },
  {
    name: '1inch-stats',
    description: 'Show 1inch protocol statistics and features',
    usage: '1inch-stats [--network <chain>]',
    examples: ['1inch-stats --network optimism'],
    handler: statsCommand
  },
  {
    name: '1inch-routes',
    description: 'Analyze 1inch routing options for a trade',
    usage: '1inch-routes <amount> <from> <to> [--network <chain>]',
    examples: ['1inch-routes 1 eth usdc --network optimism'],
    handler: routesCommand
  }
];