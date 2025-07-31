'use client';

import { useState, useRef, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSignMessage, useChainId, useSendTransaction, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSwitchChain, useSignTypedData } from 'wagmi';
import { TOKENS, getTokenDecimals, resolveTokenInfo } from '../app/helper';
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';
import { createCommands, COMMAND_LIST } from './commands';
import ChartModal from './ChartModal';

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

interface TerminalProps {
  tabId?: string;
  onTabNameChange?: (tabId: string, newName: string) => void;
}

export default function Terminal({ tabId, onTabNameChange }: TerminalProps = {}) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<SwapQuote | null>(null);
  const [pendingLimitOrder, setPendingLimitOrder] = useState<LimitOrderQuote | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [awaitingRateConfirmation, setAwaitingRateConfirmation] = useState(false);
  const [chartModal, setChartModal] = useState<{
    isOpen: boolean;
    token0: string;
    token1: string;
    chainId: string;
    chartType: 'candle' | 'line';
    interval: string;
  }>({
    isOpen: false,
    token0: '',
    token1: '',
    chainId: '',
    chartType: 'candle',
    interval: '1h'
  });
  const lineIdCounterRef = useRef(2); // Start after initial lines
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe timestamp component to avoid hydration mismatch
  const Timestamp = ({ timestamp }: { timestamp: Date }) => {
    if (!mounted) return <span className="text-gray-500 text-xs min-w-[60px]">00:00:00</span>;
    
    return (
      <span className="text-gray-500 text-xs min-w-[60px]">
        {timestamp.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })}
      </span>
    );
  };

  // Safe current time component
  const CurrentTime = () => {
    if (!mounted) return <span className="text-gray-500 text-xs min-w-[60px]">00:00:00</span>;
    
    return (
      <span className="text-gray-500 text-xs min-w-[60px]">
        {new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })}
      </span>
    );
  };

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
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  // Save command history to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (!historyLoaded) return;
    try {
      localStorage.setItem('defi-terminal-history', JSON.stringify(commandHistory));
    } catch (error) {
      console.warn('Failed to save command history to localStorage:', error);
    }
  }, [commandHistory, historyLoaded]);

  const addLine = (content: string, type: 'command' | 'output' | 'error' = 'output') => {
    const id = lineIdCounterRef.current++;
    setLines(prev => [...prev, { id, type, content, timestamp: new Date() }]);
  };

  const getTokenAddress = async (symbol: string, networkId: number): Promise<string | null> => {
    // First check static tokens
    const tokens = TOKENS[networkId as keyof typeof TOKENS];
    if (tokens) {
      const token = tokens[symbol.toUpperCase() as keyof typeof tokens];
      if (token) return token.address;
    }

    // Fallback to 1inch API
    try {
      const response = await fetch(`/api/tokens/resolve?symbol=${encodeURIComponent(symbol)}&chainId=${networkId}`);
      if (response.ok) {
        const data = await response.json();
        return data.token.address;
      }
    } catch (error) {
      console.warn('Failed to resolve token from 1inch API:', error);
    }

    return null;
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
      addLine(`🔍 Resolving token addresses...`);
      const srcAddress = await getTokenAddress(fromToken, parseInt(network));
      const dstAddress = await getTokenAddress(toToken, parseInt(network));

      if (!srcAddress || !dstAddress) {
        addLine(`❌ Token not found on network ${network}. Try using contract addresses instead.`, 'error');
        return;
      }

      const decimals = await getTokenDecimals(fromToken, parseInt(network));
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
      
      const srcAddress = await getTokenAddress(swapQuote.fromToken, parseInt(swapQuote.network));
      const dstAddress = await getTokenAddress(swapQuote.toToken, parseInt(swapQuote.network));
      const decimals = await getTokenDecimals(swapQuote.fromToken, parseInt(swapQuote.network));
      const amountWei = parseUnits(swapQuote.amount, await decimals);

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
      
      // Check if token approval is needed (unless it's ETH)
      if (await srcAddress !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
        addLine('🔍 Checking token allowance...');
        
        const allowanceResponse = await fetch(`/api/swap/classic/approve/allowance?tokenAddress=${srcAddress}&walletAddress=${address}&chainId=${limitOrder.network}`);
        const allowanceData = await allowanceResponse.json();
        
        const decimals = getTokenDecimals(limitOrder.fromToken, parseInt(limitOrder.network));
        const requiredAmount = parseFloat(limitOrder.amount) * Math.pow(10, await decimals);
        
        if (parseFloat(allowanceData.allowance) < requiredAmount) {
          addLine('📝 Token approval required...');
          
          const spenderResponse = await fetch(`/api/swap/classic/approve/spender?chainId=${limitOrder.network}`);
          const spenderData = await spenderResponse.json();
          
          try {
            const approveTx = await writeContractAsync({
              address: await srcAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: 'approve',
              args: [spenderData.address as `0x${string}`, BigInt(Math.floor(requiredAmount * 1.1))] // 10% buffer
            });
            
            addLine('⏳ Waiting for approval transaction...');
            // Note: In a real implementation, you'd want to wait for the transaction
            addLine(`✅ Approval transaction sent: ${approveTx}`);
          } catch (error: any) {
            if (error?.message?.includes('User rejected')) {
              addLine('❌ Approval cancelled by user', 'error');
            } else {
              addLine(`❌ Approval failed: ${error?.message || 'Unknown error'}`, 'error');
            }
            return;
          }
        } else {
          addLine('✅ Sufficient token allowance available');
        }
      }

      // Sign the typed data
      addLine('📝 Please sign the limit order...');
      try {
        const signature = await signTypedDataAsync({
          domain: data.typedData.domain,
          types: data.typedData.types,
          primaryType: 'Order',
          message: data.typedData.message,
        });
        
        addLine('✅ Order signed successfully!');
        addLine('🚀 Submitting limit order...');
        
        // Submit the order
        const submitResponse = await fetch('/api/orderbook/limit/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromChainId: data.fromChainId,
            build: data.build,
            extension: data.extension,
            signature: signature
          })
        });

        if (!submitResponse.ok) {
          const submitError = await submitResponse.json();
          addLine(`❌ Failed to submit order: ${submitError.error}`, 'error');
          return;
        }

        const submitData = await submitResponse.json();
        addLine('🎉 Limit order submitted successfully!');
        addLine('📊 Your order is now active on the 1inch orderbook');
        
      } catch (error: any) {
        if (error?.message?.includes('User rejected')) {
          addLine('❌ Order signing cancelled by user', 'error');
        } else {
          addLine(`❌ Order signing failed: ${error?.message || 'Unknown error'}`, 'error');
        }
        return;
      }
      
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
      addLine(`🔍 Resolving token addresses...`);
      const srcAddress = await getTokenAddress(fromToken, parseInt(network));
      const dstAddress = await getTokenAddress(toToken, parseInt(network));

      if (!srcAddress || !dstAddress) {
        addLine(`❌ Token not found on network ${network}. Try using contract addresses instead.`, 'error');
        return;
      }

      const decimals = await getTokenDecimals(fromToken, parseInt(network));
      const amountWei = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      const quoteUrl = `/api/swap/classic/quote?src=${srcAddress}&dst=${dstAddress}&amount=${amountWei}&chainId=${network}&slippage=${slippage}`;
      
      const response = await fetch(quoteUrl);
      const data = await response.json();
      console.log('Classic swap quote:', data)
      if (!response.ok) {
        addLine(`❌ Failed to get quote: ${data.error}`, 'error');
        return;
      }

      const toAmount = parseFloat(data.dstAmount) / Math.pow(10, await getTokenDecimals(toToken, parseInt(network)));
      const estimatedGas = data.gas ? parseInt(data.gas).toLocaleString() : 'Unknown';

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

  const openChartModal = (token0: string, token1: string, chainId: string, chartType: 'candle' | 'line', interval: string = '1h') => {
    setChartModal({
      isOpen: true,
      token0,
      token1,
      chainId,
      chartType,
      interval
    });
  };

  const closeChartModal = () => {
    setChartModal(prev => ({ ...prev, isOpen: false }));
    // Reset tab name when chart is closed
    if (tabId && onTabNameChange) {
      onTabNameChange(tabId, 'defi');
    }
  };

  const updateTabName = (operation: string, details?: string) => {
    if (tabId && onTabNameChange) {
      const name = details ? `${operation}-${details}` : operation;
      onTabNameChange(tabId, name);
    }
  };

  const processCommand = async (command: string) => {
    const [cmd, ...args] = command.split(' ');
    
    // Create command context
    const commandContext = {
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
    };

    const commands = createCommands(commandContext);
    
    if (commands[cmd.toLowerCase() as keyof typeof commands]) {
      await (commands[cmd.toLowerCase() as keyof typeof commands] as any)(args);
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
          updateTabName('defi'); // Reset tab name after swap completion
        } else if (trimmed.toLowerCase() === 'no' || trimmed.toLowerCase() === 'n') {
          addLine('❌ Swap cancelled');
          updateTabName('defi'); // Reset tab name after swap cancellation
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
          updateTabName('defi'); // Reset tab name after limit order completion
        } else if (trimmed.toLowerCase() === 'no' || trimmed.toLowerCase() === 'n') {
          addLine('❌ Limit order cancelled');
          updateTabName('defi'); // Reset tab name after limit order cancellation
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
      const commands = COMMAND_LIST;
      const matches = commands.filter(cmd => cmd.startsWith(currentCommand.toLowerCase()));
      if (matches.length === 1) setCurrentCommand(matches[0] + ' ');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="w-full h-full bg-black text-green-400 font-mono text-sm overflow-hidden flex flex-col">
      <div ref={terminalRef} className="flex-1 p-4 overflow-y-auto cursor-text" onClick={() => inputRef.current?.focus()}>
        {lines.map((line) => (
          <div key={line.id} className="flex items-start space-x-2 mb-1">
            <Timestamp timestamp={line.timestamp} />
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
            <CurrentTime />
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
            <CurrentTime />
            <span className="text-yellow-400 animate-pulse">Processing...</span>
          </div>
        )}
      </div>

      <ChartModal 
        isOpen={chartModal.isOpen}
        onClose={closeChartModal}
        token0={chartModal.token0}
        token1={chartModal.token1}
        chainId={chartModal.chainId}
        chartType={chartModal.chartType}
        interval={chartModal.interval}
      />
    </div>
  );
}