import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_API_BASE = 'https://api.1inch.dev/web3';

// RPC methods that support historical block queries
const HISTORICAL_METHODS = [
  'eth_getBalance',
  'eth_getCode', 
  'eth_getStorageAt',
  'eth_call'
];

interface RPCRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number | string;
}

async function getLatestBlockNumber(chainId: string): Promise<number> {
  try {
    // Use the correct 1inch RPC endpoint format
    const url = `${ONEINCH_API_BASE}/${chainId}/full`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });

    if (response.ok) {
      const data = await response.json();
      const blockNumber = parseInt(data.result, 16);
      console.log(`Latest block on chain ${chainId}: ${blockNumber}`);
      return blockNumber;
    }
  } catch (error) {
    console.error('Failed to get latest block number:', error);
  }
  // Return a high number as fallback to use full node by default
  return 999999999;
}

function determineNodeType(method: string, params: any[], latestBlock: number): string {
  // Only use archive for historical methods
  if (!HISTORICAL_METHODS.includes(method)) {
    return 'full';
  }

  // Different methods have block parameter at different positions
  let blockParam: string | undefined;
  
  switch (method) {
    case 'eth_getBalance':
    case 'eth_getCode':
      // Block parameter is at index 1
      blockParam = params[1];
      break;
    case 'eth_getStorageAt':
      // Block parameter is at index 2
      blockParam = params[2];
      break;
    case 'eth_call':
      // Block parameter is at index 1 (or could be in the transaction object)
      blockParam = params[1];
      // Also check if block is specified in the transaction object
      if (typeof params[0] === 'object' && params[0].blockNumber) {
        blockParam = params[0].blockNumber;
      }
      break;
  }

  // If no block parameter or it's a tag, determine based on tag
  if (!blockParam || typeof blockParam !== 'string') {
    return 'full'; // Default to full if no block specified
  }

  // Handle block tags
  if (blockParam === 'latest' || blockParam === 'pending' || blockParam === 'earliest') {
    return 'full';
  }

  // Handle hex block numbers
  if (blockParam.startsWith('0x')) {
    try {
      const requestedBlock = parseInt(blockParam, 16);
      const blocksAgo = latestBlock - requestedBlock;
      
      console.log(`Block comparison: latest=${latestBlock}, requested=${requestedBlock}, blocksAgo=${blocksAgo}`);
      
      // Use archive if more than 128 blocks old
      return blocksAgo > 128 ? 'archive' : 'full';
    } catch (error) {
      console.error('Failed to parse block number:', blockParam, error);
      return 'full';
    }
  }

  // Handle decimal block numbers (shouldn't happen in standard RPC, but just in case)
  if (/^\d+$/.test(blockParam)) {
    const requestedBlock = parseInt(blockParam, 10);
    const blocksAgo = latestBlock - requestedBlock;
    return blocksAgo > 128 ? 'archive' : 'full';
  }

  // Default to full for any other cases
  return 'full';
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '1inch API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    
    const body = await request.json() as RPCRequest;
    
    if (!body.jsonrpc || !body.method || !body.params) {
      return NextResponse.json(
        { error: 'Invalid RPC request format' },
        { status: 400 }
      );
    }

    console.log(`RPC Request: ${body.method} on chain ${chainId}`);

    // ALWAYS get latest block number first (except if we're calling eth_blockNumber itself)
    let latestBlock: number;
    if (body.method === 'eth_blockNumber') {
      // Don't recursively call eth_blockNumber
      latestBlock = 999999999; // Use a high number to default to full node
    } else {
      latestBlock = await getLatestBlockNumber(chainId);
    }
    
    // Determine node type based on method and parameters
    const nodeType = determineNodeType(body.method, body.params, latestBlock);
    
    console.log(`Using ${nodeType} node for ${body.method} (latest block: ${latestBlock})`);


    // Make the RPC call to 1inch with nodeType as path parameter
    // Based on the 1inch docs: https://api.1inch.dev/{chainId}/{nodeType}
    const url = `${ONEINCH_API_BASE}/${chainId}/${nodeType}`;
    
    console.log(`Calling 1inch RPC endpoint: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch RPC error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          jsonrpc: '2.0',
          error: {
            code: response.status,
            message: `RPC call failed: ${response.status}`,
            data: errorText
          },
          id: body.id
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Convert hex results to decimal for certain methods
    if (data.result && typeof data.result === 'string' && data.result.startsWith('0x')) {
      const methodsToConvert = ['eth_blockNumber', 'eth_getBalance', 'eth_getTransactionCount'];
      
      if (methodsToConvert.includes(body.method)) {
        const hexValue = data.result;
        const decimalValue = parseInt(hexValue, 16);
        
        // For eth_blockNumber, just return the decimal
        if (body.method === 'eth_blockNumber') {
          data.result = decimalValue;
          data.resultHex = hexValue;
        } 
        // For eth_getBalance, convert from wei to ether
        else if (body.method === 'eth_getBalance') {
          data.result = {
            wei: decimalValue.toString(),
            ether: (decimalValue / 1e18).toFixed(18).replace(/\.?0+$/, ''),
            hex: hexValue
          };
        }
        // For other methods, just return decimal
        else {
          data.result = decimalValue;
          data.resultHex = hexValue;
        }
      }
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('RPC endpoint error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        },
        id: null
      },
      { status: 500 }
    );
  }
}