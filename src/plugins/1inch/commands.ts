import { PluginCommand, CommandHandler } from './types';
import { OneInchAPI } from './api';
import { config } from '@/hooks/config';
import { resolveTokenAddress } from '../../app/helper';

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

  // Debug output (only if debug mode is enabled)
  if (config.debug_commands_mode) {
    addLine(`🔍 Debug: Original args: [${args.join(', ')}]`);
    addLine(`🔍 Debug: Clean args: [${cleanArgs.join(', ')}]`);
    addLine(`🔍 Debug: Swap type: ${swapType}, Network: ${network}`);
    addLine(`🔄 Debug: using 1INCH for ${swapType} swap on chain ${network}`);

    
  }


  if (swapType === 'classic') {
    // parseSwapCommand expects [type, amount, from, to, ...] NOT ['swap', type, amount, from, to]
    // So we pass cleanArgs directly: ['classic', '0.001', 'eth', 'usdc']
    if (config.debug_commands_mode) {
      addLine(`🔍 Debug: Args for parseSwapCommand: [${cleanArgs.join(', ')}]`);
    }

    const parsed = parseSwapCommand(cleanArgs);
    if (!parsed) {
      addLine('Usage: swap classic <amount> <from> <to> [--network <name>] [--slippage <percent>]', 'error');
      addLine('Example: swap classic 0.001 eth usdc --network arbitrum --slippage 0.5', 'error');
      showAvailableTokens(network, addLine);
      return;
    }

    const { amount, fromToken, toToken, slippage } = parsed;
    if (config.debug_commands_mode) {
      addLine(`🔍 Debug: Parsed result - amount: ${amount}, fromToken: ${fromToken}, toToken: ${toToken}, slippage: ${slippage}`);
    }
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

// Price command
const priceCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId, updateTabName } = context;

  if (!args[0]) {
    addLine('Usage: price <symbol|address> [--network <name>]', 'error');
    addLine('Example: price eth --network arbitrum', 'error');
    return;
  }

  const token = args[0];
  const { network } = parseArgs(args, chainId.toString());

  try {
    let tokenAddress = token;

    // If it looks like a symbol (not an address), try to resolve it
    if (!token.startsWith('0x') && token.length < 10) {
      addLine(`🔍 Resolving ${token.toUpperCase()} address...`);
      const resolved = await resolveTokenAddress(token, parseInt(network));
      if (resolved) {
        tokenAddress = resolved;
        addLine(`✅ Resolved to: ${resolved}`);
      } else {
        addLine(`⚠️  Token not found, trying symbol directly...`);
        tokenAddress = token; // Fallback to using symbol
      }
    }

    addLine(`🔍 Getting price for ${token.toUpperCase()}...`);

    // Update tab name temporarily for price operation
    updateTabName?.('price', token.toLowerCase());

    const response = await fetch(`/api/1inch/prices/price_by_token?chainId=${network}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenAddress })
    });

    if (!response.ok) {
      const errorData = await response.json();
      addLine(`❌ Failed to get price: ${errorData.error}`, 'error');
      return;
    }

    const data = await response.json();
    const getNetworkName = (chainId: string) => {
      const names: { [key: string]: string } = {
        '1': 'Ethereum',
        '137': 'Polygon',
        '10': 'Optimism',
        '42161': 'Arbitrum',
        '8453': 'Base',
        '56': 'BSC',
        '43114': 'Avalanche'
      };
      return names[chainId] || `Chain ${chainId}`;
    };
    const networkName = getNetworkName(network);

    const price = parseFloat(data.price);

    // Format price to show significant digits instead of fixed decimal places
    let formattedPrice;
    if (price >= 1) {
      formattedPrice = price.toFixed(4);
    } else if (price >= 0.01) {
      formattedPrice = price.toFixed(6);
    } else if (price >= 0.0001) {
      formattedPrice = price.toFixed(8);
    } else {
      // For very small prices, use toPrecision to show significant digits
      formattedPrice = price.toPrecision(6);
    }

    addLine(`💰 ${token.toUpperCase()} Price:`);
    addLine(`   Price: $${formattedPrice} USD`);
    addLine(`   Network: ${networkName}`);
    addLine(`   Address: ${data.token}`);

    // Reset tab name after price operation
    updateTabName?.('defi');
  } catch (error) {
    addLine(`❌ Error getting price: ${error}`, 'error');
    // Reset tab name on error too
    updateTabName?.('defi');
  }
};

// Gas command
const gasCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId } = context;
  const { network } = parseArgs(args, chainId.toString());

  addLine(`⛽ Getting gas prices for network ${network}...`);

  try {
    const response = await fetch(`/api/1inch/gas?chainId=${network}`);

    if (!response.ok) {
      const errorData = await response.json();
      addLine(`❌ Failed to get gas prices: ${errorData.error}`, 'error');
      return;
    }

    const data = await response.json();
    const getNetworkName = (chainId: string) => {
      const names: { [key: string]: string } = {
        '1': 'Ethereum',
        '137': 'Polygon',
        '10': 'Optimism',
        '42161': 'Arbitrum',
        '8453': 'Base',
        '56': 'BSC',
        '43114': 'Avalanche'
      };
      return names[chainId] || `Chain ${chainId}`;
    };
    const networkName = getNetworkName(network);

    const baseFee = data.baseFee || 0;
    const priorityFeeLow = data.low?.maxPriorityFeePerGas || 0;
    const priorityFeeMedium = data.medium?.maxPriorityFeePerGas || baseFee * 0.1;
    const priorityFeeHigh = data.high?.maxPriorityFeePerGas || baseFee * 0.2;

    addLine(`⛽ Gas Prices on ${networkName}:`);

    if (data.low) {
      const lowTotal = (baseFee + priorityFeeLow) / 1e9;
      addLine(`   🟢 Low: ${lowTotal.toFixed(2)} Gwei`);
    }

    if (data.medium) {
      const mediumTotal = (baseFee + priorityFeeMedium) / 1e9;
      addLine(`   🟡 Medium: ${mediumTotal.toFixed(2)} Gwei`);
    }

    if (data.high) {
      const highTotal = (baseFee + priorityFeeHigh) / 1e9;
      addLine(`   🔴 High: ${highTotal.toFixed(2)} Gwei`);
    }

    if (baseFee) {
      addLine(`   📊 Base Fee: ${(baseFee / 1e9).toFixed(2)} Gwei`);
    }
  } catch (error) {
    addLine(`❌ Error fetching gas prices: ${error}`, 'error');
  }
};

// Tokens command
const tokensCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId } = context;
  const { network } = parseArgs(args, chainId.toString());

  addLine(`📋 Getting supported tokens for chain ${network}...`);

  try {
    const response = await fetch(`/api/1inch/tokens/details?chain=${network}`);

    if (!response.ok) {
      const errorData = await response.json();
      addLine(`❌ Failed to get tokens: ${errorData.error}`, 'error');
      return;
    }

    const data = await response.json();

    addLine(`💎 Supported Tokens on Chain ${network}:`);
    addLine('');

    // Sort tokens by symbol for easier reading
    const sortedTokens = Object.entries(data.tokens)
      .sort(([, a]: any, [, b]: any) => a.symbol.localeCompare(b.symbol))
      .slice(0, 20); // Show first 20 tokens

    sortedTokens.forEach(([address, token]: any) => {
      addLine(`  ${token.symbol.padEnd(8)} - ${token.name}`);
      addLine(`    Address: ${address}`);
    });

    addLine(`\nShowing 20 of ${Object.keys(data.tokens).length} tokens`);
  } catch (error) {
    addLine(`❌ Error fetching tokens: ${error}`, 'error');
  }
};

// Chart command
const chartCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId, openChartModal } = context;

  if (args.length < 1) {
    addLine('Usage: chart <token0> [token1] [--type candle|line] [--network <name>]', 'error');
    addLine('Example: chart eth usdc --network arbitrum', 'error');
    return;
  }

  const { network, cleanArgs } = parseArgs(args, chainId.toString());
  let chartType: 'candle' | 'line' = 'candle';

  const typeIndex = cleanArgs.findIndex(arg => arg === '--type');
  if (typeIndex !== -1 && typeIndex + 1 < cleanArgs.length) {
    const type = cleanArgs[typeIndex + 1].toLowerCase();
    if (type === 'line' || type === 'candle') {
      chartType = type;
    }
  }

  // Filter out type flags
  const tokenArgs = cleanArgs.filter((arg, index) => {
    if (index === typeIndex || index === typeIndex + 1) return false;
    return true;
  });

  const token0 = tokenArgs[0] || '';
  const token1 = tokenArgs[1] || 'usdc'; // Default to USDC

  addLine(`📊 Opening ${chartType} chart for ${token0.toUpperCase()}/${token1.toUpperCase()}`);
  openChartModal?.(token0, token1, network, chartType, '1h');
};

// Trace command
const traceCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId } = context;

  if (args.length < 1) {
    addLine('Usage: trace <txHash> [blockNumber] [--network <chain>]', 'error');
    return;
  }

  const txHash = args[0];
  const blockNumber = args[1] || 'latest';
  const { network } = parseArgs(args, chainId.toString());

  addLine(`🔍 Getting transaction trace for ${txHash.slice(0, 10)}...`);
  addLine(`📦 Block: ${blockNumber}`);
  addLine(`🌐 Network: Chain ${network}`);

  try {
    const response = await fetch(`/api/1inch/traces?chain=${network}&blockNumber=${blockNumber}&txHash=${txHash}`);

    if (!response.ok) {
      const errorData = await response.json();
      addLine(`❌ Failed to get trace: ${errorData.error}`, 'error');
      return;
    }

    const data = await response.json();

    if (data.message) {
      addLine(`⚠️  ${data.message}`, 'warn');
    }

    // Display transaction summary
    if (data.summary) {
      addLine('📊 Transaction Summary:');
      addLine(`   Status: ${data.summary.status}`);
      addLine(`   From: ${data.summary.from}`);
      addLine(`   To: ${data.summary.to}`);
      addLine(`   Gas Used: ${data.summary.gasUsed}`);
    }
  } catch (error) {
    addLine(`❌ Error getting trace: ${error}`, 'error');
  }
};

// NFT command
const nftCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, address: userAddress, isConnected, chainId } = context;

  let targetAddress = userAddress;
  let chains = [chainId.toString()];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('0x')) {
      targetAddress = args[i];
    } else if (args[i] === '--all-chains') {
      chains = ['1', '137', '10', '42161', '8453', '56', '43114'];
    }
  }

  if (!targetAddress || !isConnected) {
    addLine('❌ Please connect your wallet or provide an address', 'error');
    addLine('Usage: nft [address] [--all-chains]', 'error');
    return;
  }

  addLine(`🖼️  Fetching NFTs for ${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`);

  try {
    const chainParams = chains.map(c => `chainId=${c}`).join('&');
    const response = await fetch(`/api/1inch/nft/byaddress?address=${targetAddress}&${chainParams}`);

    if (!response.ok) {
      const errorData = await response.json();
      addLine(`❌ Failed to fetch NFTs: ${errorData.error}`, 'error');
      return;
    }

    const data = await response.json();

    if (data.message) {
      addLine(`⚠️  ${data.message}`, 'warn');
      return;
    }

    addLine('📭 NFT fetching not yet fully implemented');
  } catch (error) {
    addLine(`❌ Error fetching NFTs: ${error}`, 'error');
  }
};

// RPC command - direct Ethereum RPC calls through 1inch infrastructure
const rpcCommand: CommandHandler = async (args: string[], context: any) => {
  const { addLine, chainId } = context;

  if (args.length === 0) {
    addLine('Usage: rpc <method> [params...] [--network <chain>]', 'error');
    addLine('');
    addLine('Examples:');
    addLine('  rpc eth_blockNumber');
    addLine('  rpc eth_getBalance 0x742d35Cc6634C0532925a3b844Bc9e7595f62a40 latest');
    addLine('  rpc eth_getCode 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 latest');
    addLine('  rpc eth_call {"to":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","data":"0x18160ddd"} latest');
    return;
  }

  const method = args[0];
  let params: any[] = [];
  const { network } = parseArgs(args, chainId.toString());

  // Parse parameters (skip method name)
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    // Skip network flags
    if (arg.startsWith('--')) {
      if (arg === '--network') i++; // Skip next arg too
      continue;
    }

    // Try to parse as JSON first (for objects)
    if (arg.startsWith('{') || arg.startsWith('[')) {
      try {
        params.push(JSON.parse(arg));
      } catch {
        params.push(arg);
      }
    } else {
      params.push(arg);
    }
  }

  addLine(`🔄 Executing RPC: ${method} on chain ${network}`);

  try {
    const response = await fetch(`/api/1inch/eth_rpc?chainId=${network}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      addLine(`❌ RPC Error: ${error.error?.message || 'Unknown error'}`, 'error');
      return;
    }

    const data = await response.json();

    if (data.error) {
      addLine(`❌ RPC Error: ${data.error.message}`, 'error');
      if (data.error.data) {
        addLine(`Details: ${data.error.data}`, 'error');
      }
      return;
    }

    // Format the result based on the method
    addLine('✅ RPC Result:');

    if (method === 'eth_blockNumber') {
      addLine(`  Block Number: ${data.result}`);
    } else if (method === 'eth_getBalance') {
      if (typeof data.result === 'object') {
        addLine(`  Balance: ${data.result.ether} ETH`);
        addLine(`  Wei: ${data.result.wei}`);
        addLine(`  Hex: ${data.result.hex}`);
      } else {
        addLine(`  Result: ${data.result}`);
      }
    } else if (method === 'eth_getCode') {
      const code = data.result;
      if (code === '0x') {
        addLine('  No contract code (EOA address)');
      } else {
        addLine(`  Contract bytecode: ${code.slice(0, 66)}...`);
        addLine(`  Size: ${(code.length - 2) / 2} bytes`);
      }
    } else {
      // Generic result display
      addLine(`  Result: ${JSON.stringify(data.result, null, 2)}`);
    }

  } catch (error) {
    addLine(`❌ Failed to execute RPC: ${error}`, 'error');
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
    name: 'price',
    description: 'Get token price from 1inch',
    usage: 'price <symbol|address> [--network <name>]',
    examples: ['price eth --network arbitrum'],
    handler: priceCommand
  },
  {
    name: 'gas',
    description: 'Get current gas prices from 1inch',
    usage: 'gas [--network <name>]',
    examples: ['gas --network ethereum'],
    handler: gasCommand
  },
  {
    name: 'tokens',
    description: 'List supported tokens on 1inch',
    usage: 'tokens [--network <name>]',
    examples: ['tokens --network optimism'],
    handler: tokensCommand
  },
  {
    name: 'chart',
    description: 'Display price chart for token pair',
    usage: 'chart <token0> [token1] [--type candle|line] [--network <name>]',
    examples: ['chart eth usdc --network arbitrum'],
    handler: chartCommand
  },
  {
    name: 'trace',
    description: 'Get transaction trace details',
    usage: 'trace <txHash> [blockNumber] [--network <chain>]',
    examples: ['trace 0x123...abc --network ethereum'],
    handler: traceCommand
  },
  {
    name: 'nft',
    description: 'Get NFTs for an address',
    usage: 'nft [address] [--all-chains]',
    examples: ['nft 0x123...abc --all-chains'],
    handler: nftCommand
  },
  {
    name: 'rpc',
    description: 'Execute Ethereum RPC calls through 1inch infrastructure',
    usage: 'rpc <method> [params...] [--network <chain>]',
    examples: ['rpc eth_blockNumber', 'rpc eth_getBalance 0x742d35... latest'],
    handler: rpcCommand
  }
];