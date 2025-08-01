import { resolveTokenAddress } from '../app/helper';

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
  handleClassicSwap: (amount: string, fromToken: string, toToken: string, network: string, slippage: string) => Promise<void>;
  handleLimitOrder: (amount: string, fromToken: string, toToken: string, network: string, rate?: string) => Promise<void>;
  parseSwapCommand: (args: string[]) => any;
  parseLimitOrderCommand: (args: string[]) => any;
  openChartModal?: (token0: string, token1: string, chainId: string, chartType: 'candle' | 'line', interval?: string, token0Symbol?: string, token1Symbol?: string) => void;
  updateTabName?: (operation: string, details?: string) => void;
  domain: string | null;
  hasDomain: boolean;
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
    handleClassicSwap,
    handleLimitOrder,
    parseSwapCommand,
    parseLimitOrderCommand,
    openChartModal,
    updateTabName,
    domain,
    hasDomain
  } = ctx;

  return {
    help: () => [
      'help - Show commands', 
      'clear - Clear terminal', 
      'date - Show date', 
      'whoami - Show user', 
      'history - Command history', 
      'history clear - Clear command history',
      'rpc <method> [params...] [--network <chain>] - Execute Ethereum RPC calls',
      'trace <txHash> [blockNumber] [--network <chain>] - Get transaction execution trace', 
      'networkinfo [chain] - Get network information and statistics',
      'wallet - Show wallet info', 
      'balance - Show ETH balance', 
      'message <text> - Sign message (requires wallet)', 
      'price <symbol|address> [--network <name>] - Get token price', 
      'chart <token0> [token1] [--type candle|line] [--interval <time>] [--network <name>] - Show price chart (defaults to /USDC)',
      'Intervals: 5m, 15m, 1h, 4h, 1d, 1w (default: 1h for candles)',
      'Networks: ethereum, optimism, arbitrum, polygon, base, bsc, avalanche',
      'swap classic <amount> <from> <to> [--network <name>] [--slippage <percent>] - Interactive swap', 
      'swap limit <amount> <from> <to> [--rate <rate>] [--network <name>] - Create limit order'
    ].forEach(cmd => addLine(cmd)),

    clear: () => setLines([]),

    date: () => addLine(new Date().toString()),

    whoami: () => {
      if (!isConnected) {
        addLine('defi-user');
      } else {
        const displayText = hasDomain && domain 
          ? `${domain} (${address})` 
          : address || 'Unknown address';
        addLine(displayText);
      }
    },

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
        const getNetworkName = (chainId: number) => {
          const names: { [key: number]: string } = {
            1: 'Ethereum',
            137: 'Polygon',
            10: 'Optimism',
            42161: 'Arbitrum',
            8453: 'Base',
            56: 'BSC',
            43114: 'Avalanche'
          };
          return names[chainId] || `Chain ${chainId}`;
        };
        
        addLine(`💰 ${formattedBalance} ${balance.symbol}`);
        addLine(`🌐 Network: ${getNetworkName(chainId)}`);
        addLine(`💳 Address: ${address?.slice(0, 6)}...${address?.slice(-4)}`);
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
        openChartModal(token0Address, token1Address, network, chartType, interval, token0Symbol, token1Symbol);
      } else {
        addLine('❌ Chart functionality not available', 'error');
      }
    },

    rpc: async (args: string[]) => {
      if (args.length === 0) {
        addLine('Usage: rpc <method> [params...] [--network <chain>]', 'error');
        addLine('');
        addLine('Examples:');
        addLine('  rpc eth_blockNumber');
        addLine('  rpc eth_getBalance 0x742d35Cc6634C0532925a3b844Bc9e7595f62a40 latest');
        addLine('  rpc eth_getCode 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 latest');
        addLine('  rpc eth_call {"to":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","data":"0x18160ddd"} latest');
        addLine('  rpc eth_getBalance 0x742d35Cc6634C0532925a3b844Bc9e7595f62a40 0x1234567 --network ethereum');
        return;
      }

      const method = args[0];
      let params: any[] = [];
      let network = chainId.toString();

      // Find --network flag
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
          'base': '8453',
          'bsc': '56',
          'avalanche': '43114'
        };
        network = networkMap[networkName] || networkName;
        
        // Remove network args from params
        args = args.slice(1, networkIndex);
      } else {
        args = args.slice(1);
      }

      // Parse parameters
      for (const arg of args) {
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
        const response = await fetch(`/api/eth_rpc?chainId=${network}`, {
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
          if (data.resultHex) {
            addLine(`  Hex: ${data.resultHex}`);
          }
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
    },

    trace: async (args: string[]) => {
      if (args.length < 1) {
        addLine('Usage: trace <txHash> [blockNumber] [--network <chain>]', 'error');
        addLine('');
        addLine('Examples:');
        addLine('  trace 0x16897e492b2e023d8f07be9e925f2c15a91000ef11a01fc71e70f75050f1e03c');
        addLine('  trace 0x16897e492b2e023d8f07be9e925f2c15a91000ef11a01fc71e70f75050f1e03c 18500000');
        addLine('  trace 0x123... --network ethereum');
        addLine('  trace 0x456... 42000000 --network polygon');
        return;
      }

      const txHash = args[0];
      let blockNumber: string | undefined = args[1];
      let network = chainId.toString();

      // Find --network flag
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
          'base': '8453',
          'bsc': '56',
          'avalanche': '43114'
        };
        network = networkMap[networkName] || networkName;
      }

      // Check if blockNumber looks like --network flag (meaning no block number provided)
      if (blockNumber && blockNumber.startsWith('--')) {
        blockNumber = undefined;
      }

      // If no block number provided, fetch it from the transaction
      if (!blockNumber) {
        addLine(`🔍 Fetching transaction details...`);
        try {
          const rpcResponse = await fetch(`/api/eth_rpc?chainId=${network}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionByHash',
              params: [txHash],
              id: Date.now()
            })
          });

          if (!rpcResponse.ok) {
            const error = await rpcResponse.json();
            addLine(`❌ RPC Error: ${error.error?.message || 'Failed to fetch transaction'}`, 'error');
            return;
          }

          const rpcData = await rpcResponse.json();
          
          if (!rpcData.result) {
            addLine(`❌ Transaction not found: ${txHash}`, 'error');
            return;
          }

          // Extract block number from the transaction
          blockNumber = rpcData.result.blockNumber;
          if (blockNumber) {
            // Convert from hex to decimal
            blockNumber = parseInt(blockNumber, 16).toString();
            addLine(`✅ Found block number: ${blockNumber}`);
          } else {
            addLine(`❌ Transaction is pending or block number not available`, 'error');
            return;
          }
        } catch (error) {
          addLine(`❌ Failed to fetch transaction: ${error}`, 'error');
          return;
        }
      }

      addLine(`🔍 Getting transaction trace...`);
      addLine(`📊 TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`);
      addLine(`📦 Block: ${blockNumber} on chain ${network}`);
      
      try {
        const response = await fetch(`/api/traces?chain=${network}&blockNumber=${blockNumber}&txHash=${txHash}`);

        if (!response.ok) {
          const error = await response.json();
          addLine(`❌ Trace Error: ${error.error}`, 'error');
          return;
        }

        const data = await response.json();
        const trace = data.transactionTrace;
        const summary = data.summary;
        
        addLine('✅ Transaction Trace Retrieved:');
        addLine('');
        
        // Basic transaction info
        addLine('📋 Transaction Summary:');
        addLine(`  Status: ${summary.status}`);
        addLine(`  Type: ${summary.type}`);
        addLine(`  From: ${summary.from}`);
        addLine(`  To: ${summary.to}`);
        addLine(`  Value: ${summary.value} wei`);
        addLine('');
        
        // Gas information
        addLine('⛽ Gas Information:');
        if (summary.gasUsed !== undefined && summary.gasUsed !== null) {
          addLine(`  Gas Used: ${summary.gasUsed.toLocaleString()}`);
        }
        if (summary.gasLimit !== undefined && summary.gasLimit !== null) {
          addLine(`  Gas Limit: ${summary.gasLimit.toLocaleString()}`);
        }
        if (summary.gasPrice) {
          addLine(`  Gas Price: ${summary.gasPrice.toLocaleString()} gwei`);
        }
        addLine('');
        
        // Execution details
        addLine('🔧 Execution Details:');
        addLine(`  Logs: ${summary.logCount}`);
        addLine(`  Internal Calls: ${summary.callCount}`);
        
        if (trace.input && trace.input !== '0x') {
          addLine(`  Input Data: ${trace.input.slice(0, 42)}...`);
        }
        
        // Show logs if any
        if (trace.logs && trace.logs.length > 0) {
          addLine('');
          addLine('📝 Event Logs:');
          trace.logs.forEach((log: any, index: number) => {
            addLine(`  Log ${index + 1}:`);
            addLine(`    Contract: ${log.contract}`);
            addLine(`    Topics: ${log.topics.length}`);
            if (log.data && log.data !== '0x') {
              addLine(`    Data: ${log.data.slice(0, 42)}...`);
            }
          });
        }
        
        // Show internal calls if any
        if (trace.calls && trace.calls.length > 0) {
          addLine('');
          addLine('🔄 Internal Calls:');
          addLine(`  Found ${trace.calls.length} internal call(s)`);
          trace.calls.slice(0, 3).forEach((call: any, index: number) => {
            addLine(`  Call ${index + 1}: ${call.type} to ${call.to}`);
          });
          if (trace.calls.length > 3) {
            addLine(`  ... and ${trace.calls.length - 3} more calls`);
          }
        }

      } catch (error) {
        addLine(`❌ Failed to get transaction trace: ${error}`, 'error');
      }
    },

    networkinfo: async (args: string[]) => {
      let network = chainId.toString();

      // If a chain is provided as argument
      if (args.length > 0) {
        const chainInput = args[0].toLowerCase();
        const networkMap: { [key: string]: string } = {
          'ethereum': '1',
          'mainnet': '1',
          'polygon': '137',
          'matic': '137',
          'optimism': '10',
          'arbitrum': '42161',
          'base': '8453',
          'bsc': '56',
          'avalanche': '43114',
          'zksync': '324'
        };
        network = networkMap[chainInput] || chainInput;
      }
      
      addLine(`🌐 Getting network information for chain ${network}...`);
      
      try {
        const response = await fetch(`/api/tokens/details?chain=${network}`);

        if (!response.ok) {
          const error = await response.json();
          addLine(`❌ Failed to get network details: ${error.error}`, 'error');
          if (error.details) {
            addLine(`Details: ${error.details}`, 'error');
          }
          return;
        }

        const data = await response.json();
        
        if (data.assets) {
          const assets = data.assets;
          addLine(`✅ Network Information:`);
          addLine('');
          addLine(`🏷️  ${assets.name} (${assets.symbol})`);
          addLine(`   Chain ID: ${network}`);
          addLine(`   Type: ${assets.type}`);
          addLine(`   Status: ${assets.status}`);
          addLine(`   Decimals: ${assets.decimals}`);
          if (assets.coin_type) {
            addLine(`   Coin Type: ${assets.coin_type}`);
          }
          addLine('');
          
          if (assets.description) {
            addLine(`📝 Description:`);
            addLine(`   ${assets.description}`);
            addLine('');
          }
          
          addLine(`🔗 Resources:`);
          if (assets.website) {
            addLine(`   Website: ${assets.website}`);
          }
          if (assets.explorer) {
            addLine(`   Explorer: ${assets.explorer}`);
          }
          if (assets.rpc_url) {
            addLine(`   RPC URL: ${assets.rpc_url}`);
          }
          if (assets.research) {
            addLine(`   Research: ${assets.research}`);
          }
          
          if (assets.links && assets.links.length > 0) {
            addLine(`   Links:`);
            assets.links.forEach((link: any) => {
              addLine(`     ${link.name}: ${link.url}`);
            });
          }
          
          if (assets.tags && assets.tags.length > 0) {
            addLine(`   Tags: ${assets.tags.join(', ')}`);
          }
          addLine('');
        }
        
        if (data.details) {
          const details = data.details;
          addLine(`📊 Market Data:`);
          if (details.marketCap) {
            addLine(`   Market Cap: $${Math.round(details.marketCap).toLocaleString()}`);
          }
          if (details.circulatingSupply) {
            addLine(`   Circulating Supply: ${Math.round(details.circulatingSupply).toLocaleString()}`);
          }
          if (details.totalSupply) {
            addLine(`   Total Supply: ${Math.round(details.totalSupply).toLocaleString()}`);
          }
          if (details.vol24) {
            addLine(`   24h Volume: $${Math.round(details.vol24).toLocaleString()}`);
          }
          if (details.provider) {
            addLine(`   Data Provider: ${details.provider}`);
            if (details.providerURL) {
              addLine(`   Provider URL: ${details.providerURL}`);
            }
          }
        }

      } catch (error) {
        addLine(`❌ Failed to get network information: ${error}`, 'error');
      }
    }
  };
};

// Command registry with all available commands
export const COMMAND_LIST = [
  'help', 'clear', 'date', 'whoami', 'history', 'wallet', 'balance', 'message', 
  'price', 'chart', 'swap', 'rpc', 'trace', 'networkinfo'
];