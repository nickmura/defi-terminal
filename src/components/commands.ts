import { TOKENS } from '../app/helper';

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
    parseLimitOrderCommand
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
        await handleClassicSwap(amount, fromToken, toToken, network, slippage);
        
      } else if (args[0] === 'limit') {
        const parsed = parseLimitOrderCommand(args);
        if (!parsed) {
          addLine('Usage: swap limit <amount> <from> <to> [--rate <rate>] [--network <name>]', 'error');
          addLine('Example: swap limit 1 eth usdc --rate 4000 --network optimism', 'error');
          return;
        }

        const { amount, fromToken, toToken, network, rate } = parsed;
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
        if (networkName === 'optimism') network = '10';
        else if (networkName === 'arbitrum') network = '42161';
      }

      try {
        addLine(`🔍 Getting price for ${token.toUpperCase()}...`);
        
        const response = await fetch(`/api/prices/price_by_token?chainId=${network}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (!response.ok) {
          const errorData = await response.json();
          addLine(`❌ Failed to get price: ${errorData.error}`, 'error');
          return;
        }

        const data = await response.json();
        const networkName = network === '10' ? 'Optimism' : network === '42161' ? 'Arbitrum' : `Chain ${network}`;
        
        addLine(`💰 ${token.toUpperCase()} Price:`);
        addLine(`   Price: $${parseFloat(data.price).toFixed(4)} USD`);
        addLine(`   Network: ${networkName}`);
        addLine(`   Address: ${data.token}`);
      } catch (error) {
        addLine(`❌ Error getting price: ${error}`, 'error');
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
  'price', 'swap'
];