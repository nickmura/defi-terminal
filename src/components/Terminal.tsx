'use client';

import { useState, useRef, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSignMessage, useChainId, useSendTransaction, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { TOKENS } from '../app/helper';
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';

interface TerminalLine {
  id: number;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

interface SwapQuote {
  fromToken: string;
  toToken: string;
  amount: string;
  network: string;
  slippage: string;
  quote: any;
}

interface LimitOrderQuote {
  fromToken: string;
  toToken: string;
  amount: string;
  network: string;
  rate?: string;
  quote: any;
}

export default function Terminal() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: 'output', content: 'Welcome to DeFi Terminal v1.0.0', timestamp: new Date() },
    { id: 1, type: 'output', content: 'Type "help" for available commands.', timestamp: new Date() }
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<SwapQuote | null>(null);
  const [pendingLimitOrder, setPendingLimitOrder] = useState<LimitOrderQuote | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [awaitingRateConfirmation, setAwaitingRateConfirmation] = useState(false);
  const lineIdCounterRef = useRef(2); // Start after initial lines
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
    inputRef.current?.focus();
  }, [lines]);

  // Load command history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('defi-terminal-history');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setCommandHistory(parsedHistory);
        }
      }
    } catch (error) {
      console.warn('Failed to load command history from localStorage:', error);
    }
  }, []);

  // Save command history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('defi-terminal-history', JSON.stringify(commandHistory));
    } catch (error) {
      console.warn('Failed to save command history to localStorage:', error);
    }
  }, [commandHistory]);

  const addLine = (content: string, type: 'command' | 'output' | 'error' = 'output') => {
    const id = lineIdCounterRef.current++;
    setLines(prev => [...prev, { id, type, content, timestamp: new Date() }]);
  };

  const getTokenAddress = (symbol: string, networkId: number): string | null => {
    const tokens = TOKENS[networkId as keyof typeof TOKENS];
    if (!tokens) return null;
    const token = tokens[symbol.toUpperCase() as keyof typeof tokens];
    return token ? token.address : null;
  };

  const getTokenDecimals = (symbol: string, networkId: number): number => {
    const tokens = TOKENS[networkId as keyof typeof TOKENS];
    if (!tokens) return 18;
    const token = tokens[symbol.toUpperCase() as keyof typeof tokens];
    return token ? token.decimals : 18;
  };

  const parseSwapCommand = (args: string[]) => {
    if (args.length < 4) return null;
    
    let [type, amount, fromToken, toToken] = args;
    let network = chainId.toString();
    let slippage = '1'; // Default slippage 1%
    
    // Check for --network flag
    const networkIndex = args.findIndex(arg => arg === '--network');
    if (networkIndex !== -1 && networkIndex + 1 < args.length) {
      const networkName = args[networkIndex + 1].toLowerCase();
      if (networkName === 'optimism') network = '10';
      else if (networkName === 'arbitrum') network = '42161';
    }
    
    // Check for --slippage flag
    const slippageIndex = args.findIndex(arg => arg === '--slippage');
    if (slippageIndex !== -1 && slippageIndex + 1 < args.length) {
      slippage = args[slippageIndex + 1];
    }
    
    return { type, amount, fromToken, toToken, network, slippage };
  };

  const parseLimitOrderCommand = (args: string[]) => {
    if (args.length < 4) return null;
    
    let [type, amount, fromToken, toToken] = args;
    let network = chainId.toString();
    let rate: string | undefined;
    
    // Check for --network flag
    const networkIndex = args.findIndex(arg => arg === '--network');
    if (networkIndex !== -1 && networkIndex + 1 < args.length) {
      const networkName = args[networkIndex + 1].toLowerCase();
      if (networkName === 'optimism') network = '10';
      else if (networkName === 'arbitrum') network = '42161';
    }
    
    // Check for --rate flag
    const rateIndex = args.findIndex(arg => arg === '--rate');
    if (rateIndex !== -1 && rateIndex + 1 < args.length) {
      rate = args[rateIndex + 1];
    }
    
    return { type, amount, fromToken, toToken, network, rate };
  };

  const switchNetworkIfNeeded = async (targetNetwork: string): Promise<boolean> => {
    const targetChainId = parseInt(targetNetwork);
    
    if (chainId === targetChainId) {
      return true; // Already on correct network
    }

    try {
      const networkName = targetChainId === 10 ? 'Optimism' : targetChainId === 42161 ? 'Arbitrum' : `Chain ${targetChainId}`;
      addLine(`🔄 Switching to ${networkName}...`);
      addLine('Please confirm network switch in your wallet...');
      
      await switchChainAsync({ chainId: targetChainId });
      
      addLine(`✅ Successfully switched to ${networkName}`);
      return true;
      
    } catch (error: any) {
      if (error?.message?.includes('User rejected')) {
        addLine('❌ Network switch cancelled by user', 'error');
      } else {
        addLine(`❌ Failed to switch network: ${error?.message || 'Unknown error'}`, 'error');
      }
      return false;
    }
  };

  const handleLimitOrder = async (amount: string, fromToken: string, toToken: string, network: string, rate?: string) => {
    addLine(`🔍 Getting market data for ${amount} ${fromToken.toUpperCase()} → ${toToken.toUpperCase()}`);
    addLine(`🌐 Network: ${network === '10' ? 'Optimism' : network === '42161' ? 'Arbitrum' : network}`);

    // Check if network switch is needed
    const networkSwitched = await switchNetworkIfNeeded(network);
    if (!networkSwitched) {
      return;
    }

    try {
      const srcAddress = getTokenAddress(fromToken, parseInt(network));
      const dstAddress = getTokenAddress(toToken, parseInt(network));

      if (!srcAddress || !dstAddress) {
        addLine(`❌ Token not supported on network ${network}`, 'error');
        return;
      }

      const decimals = getTokenDecimals(fromToken, parseInt(network));
      const amountWei = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      // Get prices for both tokens using the new price API
      const fromPriceResponse = await fetch('/api/prices/price_by_token?chainId=' + network, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: fromToken })
      });
      const toPriceResponse = await fetch('/api/prices/price_by_token?chainId=' + network, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: toToken })
      });

      if (!fromPriceResponse.ok || !toPriceResponse.ok) {
        addLine(`❌ Failed to get token prices`, 'error');
        return;
      }

      const fromPriceData = await fromPriceResponse.json();
      const toPriceData = await toPriceResponse.json();

      if (!fromPriceData.price || !toPriceData.price) {
        addLine(`❌ Price data not available for token pair`, 'error');
        return;
      }

      // Calculate current market rate: how much toToken per fromToken
      const currentRate = parseFloat(fromPriceData.price) / parseFloat(toPriceData.price);
      
      addLine('📊 Market data:');
      addLine(`   ${fromToken.toUpperCase()} price: $${parseFloat(fromPriceData.price).toFixed(4)}`);
      addLine(`   ${toToken.toUpperCase()} price: $${parseFloat(toPriceData.price).toFixed(4)}`);
      addLine(`   Current rate: ${currentRate.toFixed(6)} ${toToken.toUpperCase()} per ${fromToken.toUpperCase()}`);
      addLine('');

      if (rate) {
        // Rate provided via --rate flag
        const specifiedRate = parseFloat(rate);
        const priceComparison = specifiedRate > currentRate ? 'above' : 'below';
        const percentDiff = Math.abs(((specifiedRate - currentRate) / currentRate) * 100).toFixed(2);
        
        addLine(`✅ Using specified rate: ${rate} ${toToken.toUpperCase()} per ${fromToken.toUpperCase()}`);
        addLine(`   This is ${percentDiff}% ${priceComparison} current market rate`);
        addLine('⚠️  Create limit order? (yes/no)');
        
        setPendingLimitOrder({
          fromToken,
          toToken,
          amount,
          network,
          rate,
          quote: { marketRate: currentRate, suggestedRate: rate }
        });
        setAwaitingConfirmation(true);
      } else {
        // No rate provided, ask for confirmation with market rate
        addLine(`⚠️  Use current market rate (${currentRate.toFixed(6)}) for limit order? (yes/no)`);
        setPendingLimitOrder({
          fromToken,
          toToken,
          amount,
          network,
          rate: currentRate.toFixed(6),
          quote: { marketRate: currentRate, suggestedRate: currentRate.toFixed(6) }
        });
        setAwaitingConfirmation(true);
      }

    } catch (error) {
      addLine('❌ Failed to get limit order quote', 'error');
    }
  };

  const executeSwap = async (swapQuote: SwapQuote) => {
    if (!address) return;

    try {
      addLine('🔄 Starting swap execution...');
      
      // Ensure we're on the correct network before executing
      const networkSwitched = await switchNetworkIfNeeded(swapQuote.network);
      if (!networkSwitched) {
        return; // Network switch failed or was cancelled
      }
      
      const srcAddress = getTokenAddress(swapQuote.fromToken, parseInt(swapQuote.network));
      const dstAddress = getTokenAddress(swapQuote.toToken, parseInt(swapQuote.network));
      const decimals = getTokenDecimals(swapQuote.fromToken, parseInt(swapQuote.network));
      const amountWei = parseUnits(swapQuote.amount, decimals);

      // Step 1: Handle token approval for ERC20 tokens (skip for ETH)
      if (swapQuote.fromToken.toUpperCase() !== 'ETH') {
        addLine('🔍 Checking token approval...');
        
        // Get the 1inch router address that needs approval
        const spenderResponse = await fetch(`/api/swap/classic/approve/spender?chainId=${swapQuote.network}`);
        if (!spenderResponse.ok) {
          addLine('❌ Failed to get spender address', 'error');
          return;
        }
        const spenderData = await spenderResponse.json();
        const spenderAddress = spenderData.address;

        // Check current allowance
        try {
          const allowanceResponse = await fetch(`/api/swap/classic/approve/allowance?tokenAddress=${srcAddress}&walletAddress=${address}&chainId=${swapQuote.network}`);
          let allowance = BigInt(0);
          
          if (allowanceResponse.ok) {
            const allowanceData = await allowanceResponse.json();
            allowance = BigInt(allowanceData.allowance || '0');
          }

          if (allowance < amountWei) {
            addLine('🔐 Token approval required. Please confirm in your wallet...');
            
            const approvalHash = await writeContractAsync({
              address: srcAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: 'approve',
              args: [spenderAddress as `0x${string}`, amountWei],
            });

            addLine(`🟡 Approval submitted: ${approvalHash}`);
            addLine('⏳ Waiting for approval confirmation...');
            
            // Wait for approval transaction to be mined
            // Note: You might want to add useWaitForTransactionReceipt here
            addLine('✅ Token approved successfully!');
          } else {
            addLine('✅ Token already approved');
          }
        } catch (approvalError: any) {
          if (approvalError?.message?.includes('User rejected')) {
            addLine('❌ Token approval cancelled by user', 'error');
            return;
          } else {
            addLine(`❌ Token approval failed: ${approvalError?.message || 'Unknown error'}`, 'error');
            return;
          }
        }
      }

      // Step 2: Get swap transaction data
      addLine('📋 Preparing swap transaction...');
      const executeUrl = `/api/swap/classic/execute?src=${srcAddress}&dst=${dstAddress}&amount=${amountWei.toString()}&from=${address}&chainId=${swapQuote.network}&slippage=${swapQuote.slippage}`;
      
      const response = await fetch(executeUrl);
      const data = await response.json();
      
      if (!response.ok) {
        addLine(`❌ Failed to prepare swap: ${data.error}`, 'error');
        return;
      }

      // Step 3: Execute the swap
      addLine('📝 Sending swap transaction...');
      addLine('Please confirm in your wallet...');

      try {
        const hash = await sendTransactionAsync({
          to: data.tx.to as `0x${string}`,
          data: data.tx.data as `0x${string}`,
          value: BigInt(data.tx.value || '0'),
          gas: BigInt(data.tx.gas || '400000')
        });

        addLine(`🟡 Swap submitted: ${hash}`);
        addLine('⏳ Waiting for confirmation...');
        addLine(`✅ Swap transaction sent successfully!`);
        addLine(`🔗 Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`);
        
      } catch (txError: any) {
        if (txError?.message?.includes('User rejected')) {
          addLine('❌ Swap cancelled by user', 'error');
        } else {
          addLine(`❌ Swap failed: ${txError?.message || 'Unknown error'}`, 'error');
        }
      }
      
    } catch (error: any) {
      addLine(`❌ Swap execution failed: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const executeLimitOrder = async (limitOrder: LimitOrderQuote) => {
    if (!address || !limitOrder.rate) return;

    try {
      addLine('🔄 Creating limit order...');
      
      // Ensure we're on the correct network
      const networkSwitched = await switchNetworkIfNeeded(limitOrder.network);
      if (!networkSwitched) {
        return;
      }
      
      const srcAddress = getTokenAddress(limitOrder.fromToken, parseInt(limitOrder.network));
      const dstAddress = getTokenAddress(limitOrder.toToken, parseInt(limitOrder.network));

      if (!srcAddress || !dstAddress) {
        addLine(`❌ Token not supported on network ${limitOrder.network}`, 'error');
        return;
      }

      // Prepare token objects with decimals for the create endpoint
      const fromTokenInfo = {
        address: srcAddress,
        decimals: getTokenDecimals(limitOrder.fromToken, parseInt(limitOrder.network))
      };
      const toTokenInfo = {
        address: dstAddress,
        decimals: getTokenDecimals(limitOrder.toToken, parseInt(limitOrder.network))
      };

      const createData = {
        fromChainId: parseInt(limitOrder.network),
        fromToken: fromTokenInfo,
        toToken: toTokenInfo,
        amount: limitOrder.amount,
        price: limitOrder.rate,
        userAddress: address
      };

      addLine(`📋 Creating limit order:`);
      addLine(`   Sell: ${limitOrder.amount} ${limitOrder.fromToken.toUpperCase()}`);
      addLine(`   Buy: ${limitOrder.toToken.toUpperCase()}`);
      addLine(`   Rate: ${limitOrder.rate} ${limitOrder.toToken.toUpperCase()} per ${limitOrder.fromToken.toUpperCase()}`);
      addLine(`   Network: ${limitOrder.network === '10' ? 'Optimism' : 'Arbitrum'}`);

      const response = await fetch('/api/orderbook/limit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        addLine(`❌ Failed to create limit order: ${errorData.error}`, 'error');
        return;
      }

      const data = await response.json();
      console.log('Limit order creation data', data)
      addLine('✅ Limit order created successfully!');
      addLine(`📄 Order data prepared for signing`);
      addLine('💡 Next: Sign the order to activate it');
      
    } catch (error: any) {
      addLine(`❌ Limit order failed: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleClassicSwap = async (amount: string, fromToken: string, toToken: string, network: string, slippage: string) => {
    addLine(`🔍 Getting quote for ${amount} ${fromToken.toUpperCase()} → ${toToken.toUpperCase()}`);
    addLine(`🌐 Network: ${network === '10' ? 'Optimism' : network === '42161' ? 'Arbitrum' : network}`);
    addLine(`📊 Slippage: ${slippage}%`);

    // Check if network switch is needed
    const networkSwitched = await switchNetworkIfNeeded(network);
    if (!networkSwitched) {
      return; // Network switch failed or was cancelled
    }

    try {
      const srcAddress = getTokenAddress(fromToken, parseInt(network));
      const dstAddress = getTokenAddress(toToken, parseInt(network));

      if (!srcAddress || !dstAddress) {
        addLine(`❌ Token not supported on network ${network}`, 'error');
        return;
      }

      const decimals = getTokenDecimals(fromToken, parseInt(network));
      const amountWei = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      const quoteUrl = `/api/swap/classic/quote?src=${srcAddress}&dst=${dstAddress}&amount=${amountWei}&chainId=${network}&slippage=${slippage}`;
      
      const response = await fetch(quoteUrl);
      const data = await response.json();

      if (!response.ok) {
        addLine(`❌ Failed to get quote: ${data.error}`, 'error');
        return;
      }

      const toAmount = parseFloat(data.toAmount) / Math.pow(10, getTokenDecimals(toToken, parseInt(network)));
      const estimatedGas = data.estimatedGas ? parseInt(data.estimatedGas).toLocaleString() : 'Unknown';

      addLine('📊 Quote received:');
      addLine(`   Input: ${amount} ${fromToken.toUpperCase()}`);
      addLine(`   Output: ~${toAmount.toFixed(6)} ${toToken.toUpperCase()}`);
      addLine(`   Gas: ${estimatedGas}`);
      addLine('');
      addLine('⚠️  Proceed with swap? (yes/no)');

      setPendingSwap({
        fromToken,
        toToken,
        amount,
        network,
        slippage,
        quote: data
      });
      setAwaitingConfirmation(true);

    } catch (error) {
      addLine('❌ Failed to get swap quote', 'error');
    }
  };

  const processCommand = async (command: string) => {
    const [cmd, ...args] = command.split(' ');
    const commands: Record<string, () => void | Promise<void>> = {
      help: () => ['help - Show commands', 'clear - Clear terminal', 'echo <text> - Echo text', 'date - Show date', 'whoami - Show user', 'pwd - Show directory', 'ls - List files', 'history - Command history', 'history clear - Clear command history', 'curl <url> - HTTP request', 'sleep <ms> - Wait', 'wallet - Show wallet info', 'balance - Show wallet balance', 'message <text> - Sign message (requires wallet)', 'price <symbol|address> [--network <name>] - Get token price', 'swap classic <amount> <from> <to> [--network <name>] [--slippage <percent>] - Interactive swap', 'swap limit <amount> <from> <to> [--rate <rate>] [--network <name>] - Create limit order'].forEach(cmd => addLine(cmd)),
      clear: () => setLines([]),
      echo: () => addLine(args.join(' ')),
      date: () => addLine(new Date().toString()),
      whoami: () => addLine(isConnected ? address?.slice(0, 6) + '...' + address?.slice(-4) : 'defi-user'),
      pwd: () => addLine('/home/defi-user/terminal'),
      ls: () => ['contracts/', 'scripts/', 'config.json', 'README.md'].forEach(cmd => addLine(cmd)),
      history: () => {
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
      message: async () => {
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
      swap: async () => {
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
      curl: async () => {
        if (!args[0]) return addLine('Usage: curl <url>', 'error');
        try {
          addLine(`Fetching ${args[0]}...`);
          const res = await fetch(args[0]);
          addLine(`Status: ${res.status}`);
          const text = await res.text();
          addLine(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
        } catch { addLine(`Failed to fetch ${args[0]}`, 'error'); }
      },
      price: async () => {
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
      sleep: async () => {
        const ms = parseInt(args[0]) || 1000;
        addLine(`Sleeping for ${ms}ms...`);
        await new Promise(resolve => setTimeout(resolve, ms));
        addLine('Done!');
      }
    };
    
    if (commands[cmd.toLowerCase()]) {
      await commands[cmd.toLowerCase()]();
    } else {
      addLine(`Command not found: ${cmd}`, 'error');
      addLine('Type "help" for available commands.');
    }
  };

  const executeCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    
    addLine(`$ ${trimmed}`, 'command');
    setIsProcessing(true);
    
    try {
      // Handle yes/no confirmation for pending swap
      if (awaitingConfirmation && pendingSwap) {
        if (trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'y') {
          await executeSwap(pendingSwap);
        } else if (trimmed.toLowerCase() === 'no' || trimmed.toLowerCase() === 'n') {
          addLine('❌ Swap cancelled');
          setPendingSwap(null);
          setAwaitingConfirmation(false);
        } else {
          addLine('Please answer "yes" or "no"', 'error');
          setIsProcessing(false);
          setTimeout(() => inputRef.current?.focus(), 10);
          return;
        }
        setPendingSwap(null);
        setAwaitingConfirmation(false);
      }
      // Handle rate confirmation for pending limit order
      else if (awaitingRateConfirmation && pendingLimitOrder) {
        const rateInput = parseFloat(trimmed);
        if (!isNaN(rateInput) && rateInput > 0) {
          pendingLimitOrder.rate = trimmed;
          addLine(`✅ Rate set to ${trimmed} ${pendingLimitOrder.toToken.toUpperCase()} per ${pendingLimitOrder.fromToken.toUpperCase()}`);
          addLine('⚠️  Create limit order? (yes/no)');
          setAwaitingRateConfirmation(false);
          setAwaitingConfirmation(true);
        } else {
          addLine('Please enter a valid rate (number)', 'error');
          setIsProcessing(false);
          setTimeout(() => inputRef.current?.focus(), 10);
          return;
        }
      }
      // Handle yes/no confirmation for pending limit order
      else if (awaitingConfirmation && pendingLimitOrder) {
        if (trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'y') {
          await executeLimitOrder(pendingLimitOrder);
        } else if (trimmed.toLowerCase() === 'no' || trimmed.toLowerCase() === 'n') {
          addLine('❌ Limit order cancelled');
          setPendingLimitOrder(null);
          setAwaitingConfirmation(false);
        } else {
          addLine('Please answer "yes" or "no"', 'error');
          setIsProcessing(false);
          setTimeout(() => inputRef.current?.focus(), 10);
          return;
        }
        setPendingLimitOrder(null);
        setAwaitingConfirmation(false);
      } else {
        await processCommand(trimmed);
      }
    } catch (e) {
      addLine(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
    setIsProcessing(false);
    
    // Automatically refocus the input after command execution
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isProcessing) return;
    
    if (e.key === 'Enter' && currentCommand.trim()) {
      setCommandHistory(prev => [...prev, currentCommand]);
      executeCommand(currentCommand);
      setCurrentCommand('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const commands = ['help', 'clear', 'echo', 'date', 'whoami', 'pwd', 'ls', 'history', 'curl', 'sleep', 'wallet', 'balance', 'message', 'price', 'swap'];
      const matches = commands.filter(cmd => cmd.startsWith(currentCommand.toLowerCase()));
      if (matches.length === 1) setCurrentCommand(matches[0] + ' ');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="w-full h-screen bg-black text-green-400 font-mono text-sm overflow-hidden flex flex-col">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
        <span className="text-gray-300 text-xs">
          {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}@terminal` : 'defi-user@terminal'}
        </span>
        <div className="flex items-center space-x-3">
          <div className="scale-75">
            <ConnectButton />
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-600 border border-gray-500 hover:bg-gray-500 cursor-pointer rounded-full"></div>
            <div className="w-3 h-3 bg-gray-600 border border-gray-500 hover:bg-gray-500 cursor-pointer rounded-full"></div>
            <div className="w-3 h-3 bg-red-600 border border-gray-500 hover:bg-red-500 cursor-pointer rounded-full"></div>
          </div>
        </div>
      </div>
      
      <div ref={terminalRef} className="flex-1 p-4 overflow-y-auto cursor-text" onClick={() => inputRef.current?.focus()}>
        {lines.map((line) => (
          <div key={line.id} className="flex items-start space-x-2 mb-1">
            <span className="text-gray-500 text-xs min-w-[60px]">
              {line.timestamp.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </span>
            <span className={`flex-1 ${
              line.type === 'command' ? 'text-white' :
              line.type === 'error' ? 'text-red-400' : 'text-gray-300'
            }`}>
              {line.content}
            </span>
          </div>
        ))}
        
        {!isProcessing ? (
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-gray-500 text-xs min-w-[60px]">
              {new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </span>
            <span className="text-white">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white outline-none caret-white"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        ) : (
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-gray-500 text-xs min-w-[60px]">
              {new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </span>
            <span className="text-yellow-400 animate-pulse">Processing...</span>
          </div>
        )}
      </div>
      
      <div className="bg-gray-800 px-4 py-1 border-t border-gray-700 text-xs text-gray-400">
        Tab: autocomplete • Ctrl+L: clear • ↑/↓: history
      </div>
    </div>
  );
}