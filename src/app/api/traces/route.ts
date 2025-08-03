import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_API_BASE = 'https://api.1inch.dev/traces';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ONEINCH_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: '1inch API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || '1';
    const blockNumber = searchParams.get('blockNumber');
    const txHash = searchParams.get('txHash');
    
    if (!blockNumber) {
      return NextResponse.json(
        { error: 'Block number is required' },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    // Validate block number format (hex or decimal)
    if (!/^(0x[a-fA-F0-9]+|\d+)$/.test(blockNumber)) {
      return NextResponse.json(
        { error: 'Invalid block number format' },
        { status: 400 }
      );
    }

    console.log(`Getting trace for tx ${txHash} in block ${blockNumber} on chain ${chain}`);

    // Call 1inch traces API
    const url = `${ONEINCH_API_BASE}/v1.0/chain/${chain}/block-trace/${blockNumber}/tx-hash/${txHash}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('1inch traces API error:', response.status, errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Transaction trace not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Trace lookup failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Add some processed information for easier consumption
    const trace = data.transactionTrace;
    const processedData = {
      ...data,
      summary: {
        txHash: trace?.txHash,
        from: trace?.from,
        to: trace?.to,
        gasUsed: trace?.gasUsed ? (typeof trace.gasUsed === 'string' ? parseInt(trace.gasUsed, 16) : trace.gasUsed) : null,
        gasLimit: trace?.gasLimit ? (typeof trace.gasLimit === 'string' ? parseInt(trace.gasLimit, 16) : trace.gasLimit) : null,
        gasPrice: trace?.gasPrice ? parseInt(trace.gasPrice, 16) : null,
        status: trace?.status || 'confirmed',
        value: trace?.value ? parseInt(trace.value, 16) : 0,
        type: trace?.type,
        logCount: trace?.logs?.length || 0,
        callCount: trace?.calls?.length || 0
      }
    };

    return NextResponse.json(processedData);

  } catch (error) {
    console.error('Transaction trace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}