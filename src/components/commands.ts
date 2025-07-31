import { TOKENS, resolveTokenAddress } from '../app/helper';

// Types for command context
export interface CommandContext {
  addLine: (content: string, type?: 'output' | 'error' | 'command') => void;
  setLines: (lines: any[]) => void;
  isConnected: boolean;
  address: string | undefined;
  balance: any;
  chainId: number;
  commandHistory: string[];
  setCommandHistory: (history: string[]) => void;
  signMessageAsync: (params: { message: string }) => Promise<string>;
  writeContractAsync: (params: any) => Promise<string>;
  signTypedDataAsync: (params: any) => Promise<string>;
  handleClassicSwap: (amount: string, fromToken: string, toToken: string, network: string, slippage: string) => Promise<void>;
  handleLimitOrder: (amount: string, fromToken: string, toToken: string, network: string, rate?: string) => Promise<void>;
  parseSwapCommand: (args: string[]) => any;
  parseLimitOrderCommand: (args: string[]) => any;
  openChartModal?: (token0: string, token1: string, chainId: string, chartType: 'candle' | 'line', interval?: string) => void;
  updateTabName?: (operation: string, details?: string) => void;
}

export const createCommands = (ctx: CommandContext) => {
  const { 
    addLine, 
    setLines, 
    isConnected, 
    address, 
    balance, 
    chainId, 
    commandHistory, 
    setCommandHistory,
    signMessageAsync,
    writeContractAsync,
    signTypedDataAsync,
    handleClassicSwap,
    handleLimitOrder,
    parseSwapCommand,
    parseLimitOrderCommand,
    openChartModal,
    updateTabName
  } = ctx;

  return {
    help: () => [
      'help - Show commands', 
      'clear - Clear terminal', 
      'echo <text> - Echo text', 
      'date - Show date', 
      'whoami - Show user', 
      'pwd - Show directory', 
      'ls - List files', 
      'history - Command history', 
      'history clear - Clear command history', 
      'curl <url> - HTTP request', 
      'sleep <ms> - Wait', 
      'wallet - Show wallet info', 
      'balance - Show wallet balance', 
      'message <text> - Sign message (requires wallet)', 
      'price <symbol|address> [--network <name>] - Get token price', 
      'chart <token0> [token1] [--type candle|line] [--interval <time>] [--network <name>] - Show price chart (defaults to /USDC)',
      'Intervals: 5m, 15m, 1h, 4h, 1d, 1w (default: 1h for candles)',
      'Networks: ethereum, optimism, arbitrum, polygon, base, bsc, avalanche',
      'swap classic <amount> <from> <to> [--network <name>] [--slippage <percent>] - Interactive swap', 
      'swap limit <amount> <from> <to> [--rate <rate>] [--network <name>] - Create limit order'
    ].forEach(cmd => addLine(cmd)),

    clear: () => setLines([]),

    echo: (args: string[]) => addLine(args.join(' ')),

    date: () => addLine(new Date().toString()),

    whoami: () => addLine(isConnected ? address?.slice(0, 6) + '...' + address?.slice(-4) : 'defi-user'),

    pwd: () => addLine('/home/defi-user/terminal'),

    ls: () => ['contracts/', 'scripts/', 'config.json', 'README.md'].forEach(cmd => addLine(cmd)),

    history: (args: string[]) => {
      if (args[0] === 'clear') {
        setCommandHistory([]);
        addLine('Command history cleared');
      } else {
        if (commandHistory.length === 0) {
          addLine('No command history available');
        } else {
          addLine(`Command history (${commandHistory.length} entries):`);
          commandHistory.forEach((cmd, i) => addLine(`${i + 1}  ${cmd}`));
        }
      }
    },

    wallet: () => {
      if (!isConnected) {
        addLine('Wallet not connected. Click the Connect Wallet button above.', 'error');
      } else {
        addLine(`Connected to: ${address}`);
        addLine(`Network: ${balance?.symbol || 'Unknown'}`);
      }
    },

    balance: () => {
      if (!isConnected) {
        addLine('Wallet not connected. Click the Connect Wallet button above.', 'error');
      } else if (balance) {
        const formattedBalance = (Number(balance.value) / Math.pow(10, balance.decimals)).toFixed(6);
        addLine(`${formattedBalance} ${balance.symbol}`);
      } else {
        addLine('Balance not available');
      }
    },

    message: async (args: string[]) => {
      if (!isConnected) {
        addLine('❌ Access denied: Wallet connection required', 'error');
        addLine('Connect your wallet to use this command', 'error');
        return;
      }
      if (args.length === 0) {
        addLine('Usage: message <text>', 'error');
        return;
      }
      
      addLine(`🔐 Wallet authenticated: ${address?.slice(0, 6)}...${address?.slice(-4)}`);
      
      try {
        const messageText = args.join(' ');
        addLine(`📝 Signing message: "${messageText}"`);
        addLine('Please confirm in your wallet...');
        
        const signature = await signMessageAsync({ message: messageText });
        
        addLine('✅ Message signed successfully!');
        addLine(`🔏 Signature: ${signature.slice(0, 20)}...${signature.slice(-10)}`);
      } catch (error) {
        addLine('❌ Message signing failed or cancelled', 'error');
      }
    },

    swap: async (args: string[]) => {
      if (!isConnected) {
        addLine('❌ Access denied: Wallet connection required', 'error');
        addLine('Connect your wallet to use swap commands', 'error');
        return;
      }

      if (args[0] === 'classic') {
        const parsed = parseSwapCommand(args);
        if (!parsed) {
          addLine('Usage: swap classic <amount> <from> <to> [--network <name>] [--slippage <percent>]', 'error');
          addLine('Example: swap classic 0.001 eth usdc --network optimism --slippage 0.5', 'error');
          return;
        }

        const { amount, fromToken, toToken, network, slippage } = parsed;
        updateTabName?.('swap', 'classic');
        await handleClassicSwap(amount, fromToken, toToken, network, slippage);
        
      } else if (args[0] === 'limit') {
        const parsed = parseLimitOrderCommand(args);
        if (!parsed) {
          addLine('Usage: swap limit <amount> <from> <to> [--rate <rate>] [--network <name>]', 'error');
          addLine('Example: swap limit 1 eth usdc --rate 4000 --network optimism', 'error');
          return;
        }

        const { amount, fromToken, toToken, network, rate } = parsed;
        updateTabName?.('swap', 'limit');
        await handleLimitOrder(amount, fromToken, toToken, network, rate);
        
      } else {
        addLine('Usage: swap <classic|limit> <amount> <from> <to> [options]', 'error');
        addLine('  swap classic - Immediate swap with slippage protection', 'error');
        addLine('  swap limit - Create limit order at specific rate', 'error');
        return;
      }
    },

    curl: async (args: string[]) => {
      if (!args[0]) return addLine('Usage: curl <url>', 'error');
      try {
        addLine(`Fetching ${args[0]}...`);
        const res = await fetch(args[0]);
        addLine(`Status: ${res.status}`);
        const text = await res.text();
        addLine(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
      } catch { 
        addLine(`Failed to fetch ${args[0]}`, 'error'); 
      }
    },

    price: async (args: string[]) => {
      if (!args[0]) {
        addLine('Usage: price <symbol|address> [--network <name>]', 'error');
        addLine('Example: price eth --network arbitrum', 'error');
        return;
      }

      const token = args[0];
      let network = chainId.toString();
      
      // Check for --network flag
      const networkIndex = args.findIndex(arg => arg === '--network');
      if (networkIndex !== -1 && networkIndex + 1 < args.length) {
        const networkName = args[networkIndex + 1].toLowerCase();
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
        if (networkMap[networkName]) {
          network = networkMap[networkName];
        }
      }

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
        
        const response = await fetch(`/api/prices/price_by_token?chainId=${network}`, {
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
    },

    chart: async (args: string[]) => {
      if (args.length < 1) {
        addLine('Usage: chart <token0> [token1] [--type candle|line] [--network <name>]', 'error');
        addLine('Example: chart eth          # ETH/USDC chart (USDC default)', 'error');
        addLine('Example: chart eth usdt     # ETH/USDT chart', 'error');
        addLine('Example: chart arb --network arbitrum  # ARB/USDC on Arbitrum', 'error');
        return;
      }

      const token0Symbol = args[0];
      const token1Symbol = args[1] || 'usdc'; // Default to USDC
      let network = chainId.toString();
      let chartType: 'candle' | 'line' = 'candle';
      let interval = '1h'; // Default interval

      // Check for --network flag
      const networkIndex = args.findIndex(arg => arg === '--network');
      if (networkIndex !== -1 && networkIndex + 1 < args.length) {
        const networkName = args[networkIndex + 1].toLowerCase();
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
        if (networkMap[networkName]) {
          network = networkMap[networkName];
        }
      }

      // Check for --type flag
      const typeIndex = args.findIndex(arg => arg === '--type');
      if (typeIndex !== -1 && typeIndex + 1 < args.length) {
        const type = args[typeIndex + 1].toLowerCase();
        if (type === 'line' || type === 'candle') {
          chartType = type;
        }
      }

      // Check for --interval flag
      const intervalIndex = args.findIndex(arg => arg === '--interval');
      if (intervalIndex !== -1 && intervalIndex + 1 < args.length) {
        const inputInterval = args[intervalIndex + 1].toLowerCase();
        const validIntervals = ['5m', '15m', '1h', '4h', '1d', '1w'];
        if (validIntervals.includes(inputInterval)) {
          interval = inputInterval;
          // Warn about 5m interval issue
          if (inputInterval === '5m') {
            addLine('⚠️  Note: 5m interval has API issues, using 15m data instead');
          }
        } else {
          addLine(`❌ Invalid interval: ${inputInterval}. Valid options: ${validIntervals.join(', ')}`, 'error');
          return;
        }
      }

      // Resolve token symbols to addresses
      let token0Address = token0Symbol;
      let token1Address = token1Symbol;

      // If token looks like a symbol, try to resolve it to an address
      if (!token0Symbol.startsWith('0x') && token0Symbol.length < 10) {
        addLine(`🔍 Resolving ${token0Symbol.toUpperCase()} address...`);
        const resolved = await resolveTokenAddress(token0Symbol, parseInt(network));
        if (resolved) {
          token0Address = resolved;
        } else {
          addLine(`❌ Token ${token0Symbol.toUpperCase()} not found on network ${network}`, 'error');
          addLine(`Try using the token's contract address instead`, 'error');
          return;
        }
      }

      if (!token1Symbol.startsWith('0x') && token1Symbol.length < 10) {
        addLine(`🔍 Resolving ${token1Symbol.toUpperCase()} address...`);
        const resolved = await resolveTokenAddress(token1Symbol, parseInt(network));
        if (resolved) {
          token1Address = resolved;
        } else {
          addLine(`❌ Token ${token1Symbol.toUpperCase()} not found on network ${network}`, 'error');
          addLine(`Try using the token's contract address instead`, 'error');
          return;
        }
      }

      const intervalText = chartType === 'candle' ? ` (${interval} intervals)` : '';
      addLine(`📈 Opening ${chartType} chart for ${token0Symbol.toUpperCase()}/${token1Symbol.toUpperCase()}${intervalText}`);
      
      // Update tab name to show chart operation
      updateTabName?.('chart', `${token0Symbol.toLowerCase()}`);
      
      if (openChartModal) {
        openChartModal(token0Address, token1Address, network, chartType, interval);
      } else {
        addLine('❌ Chart functionality not available', 'error');
      }
    },

    sleep: async (args: string[]) => {
      const ms = parseInt(args[0]) || 1000;
      addLine(`Sleeping for ${ms}ms...`);
      await new Promise(resolve => setTimeout(resolve, ms));
      addLine('Done!');
    }
  };
};

// Command registry with all available commands
export const COMMAND_LIST = [
  'help', 'clear', 'echo', 'date', 'whoami', 'pwd', 'ls', 
  'history', 'curl', 'sleep', 'wallet', 'balance', 'message', 
  'price', 'chart', 'swap'
];