'use client';

import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  token0: string;
  token1: string;
  chainId: string;
  chartType: 'candle' | 'line';
}


export default function ChartModal({ isOpen, onClose, token0, token1, chainId, chartType }: ChartModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // Initialize chart when modal opens
  useEffect(() => {
    if (isOpen && chartContainerRef.current) {
      // Clean up existing chart if it exists
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#000000' },
          textColor: '#d1d5db',
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: '#4b5563',
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: '#4b5563',
          timeVisible: true,
          secondsVisible: false,
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });

      chartRef.current = chart;
    }
  }, [isOpen]);

  // Fetch and update chart data
  useEffect(() => {
    if (isOpen && token0 && token1 && chartRef.current) {
      fetchChartData();
    }
  }, [isOpen, token0, token1, chainId, chartType]);

  // Cleanup chart when modal closes or component unmounts
  useEffect(() => {
    if (!isOpen && chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
  }, [isOpen]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const fetchChartData = async () => {
    if (!chartRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = chartType === 'candle' ? '/api/charts/candle' : '/api/charts/line';
      const params = new URLSearchParams({
        token0,
        token1,
        chainId,
        ...(chartType === 'candle' ? { seconds: '3600' } : { period: '24H' })
      });

      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      console.log('Chart data received:', data); // Debug log
      
      if (chartType === 'candle') {
        // Process candle data for Lightweight Charts
        const candles = data.candles?.data || data.candles;
        if (Array.isArray(candles) && candles.length > 0) {
          const candlestickSeries = chartRef.current.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
          });
          
          // Transform data for Lightweight Charts with outlier filtering
          const rawData = candles.map((candle: any) => ({
            time: candle.time,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
          }));

          // Filter out extreme outliers that distort the chart
          const allPrices = rawData.flatMap(candle => [candle.open, candle.high, candle.low, candle.close]);
          allPrices.sort((a, b) => a - b);
          
          // Calculate quartiles
          const q1Index = Math.floor(allPrices.length * 0.25);
          const q3Index = Math.floor(allPrices.length * 0.75);
          const q1 = allPrices[q1Index];
          const q3 = allPrices[q3Index];
          const iqr = q3 - q1;
          
          // Define outlier thresholds (more aggressive filtering)
          const lowerBound = q1 - 3 * iqr;
          const upperBound = q3 + 3 * iqr;
          
          // Filter and cap extreme values
          const chartData = rawData.map(candle => ({
            time: candle.time,
            open: Math.min(Math.max(candle.open, lowerBound), upperBound),
            high: Math.min(Math.max(candle.high, lowerBound), upperBound),
            low: Math.min(Math.max(candle.low, lowerBound), upperBound),
            close: Math.min(Math.max(candle.close, lowerBound), upperBound),
          }));

          console.log(`Filtered candles: ${rawData.length} -> ${chartData.length}, bounds: ${lowerBound.toFixed(6)} - ${upperBound.toFixed(6)}`);
          
          candlestickSeries.setData(chartData);
        } else {
          setError('No candle data available');
        }
      } else {
        // Process line data for Lightweight Charts
        console.log('Processing line chart data:', data); // Debug log
        
        if (!chartRef.current) {
          setError('Chart instance not available');
          return;
        }
        
        // Try multiple possible data structures from 1inch API
        let lineData = null;
        if (data.lineData?.data) {
          lineData = data.lineData.data;
        } else if (data.lineData) {
          lineData = data.lineData;
        } else if (data.data) {
          lineData = data.data;
        } else if (Array.isArray(data)) {
          lineData = data;
        }
        
        console.log('Line data found:', lineData); // Debug log
        
        if (Array.isArray(lineData) && lineData.length > 0) {
          const lineSeries = chartRef.current.addLineSeries({
            color: '#10b981',
            lineWidth: 2,
          });
          
          // Try different possible field names for price and time
          const chartData = lineData.map((point: any) => {
            const time = point.time || point.timestamp || point.t;
            const price = point.price || point.value || point.close || point.p;
            
            return {
              time: time,
              value: parseFloat(price),
            };
          });
          
          console.log('Line chart data processed:', chartData.slice(0, 5)); // Debug log (first 5 items)
          lineSeries.setData(chartData);
        } else {
          console.log('No line data available or invalid format'); // Debug log
          setError('No line data available');
        }
      }
      
      // Fit content and auto-scale the chart
      chartRef.current.timeScale().fitContent();
      chartRef.current.priceScale('right').applyOptions({
        autoScale: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-600 rounded-lg shadow-2xl max-w-4xl w-full mx-4 h-3/4 flex flex-col">
        {/* Unix-style Header */}
        <div className="bg-gray-800 border-b border-gray-600 px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center space-x-2">
            <div className="text-green-400 font-mono text-sm">
              📈 {token0.toUpperCase()}/{token1.toUpperCase()} - {chartType === 'candle' ? 'Candlestick' : 'Line'} Chart
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 font-bold text-lg w-6 h-6 flex items-center justify-center border border-gray-600 hover:border-red-400 transition-colors"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Chart Content */}
        <div className="flex-1 p-4 bg-black text-green-400 font-mono relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-green-400">Loading chart data...</div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-red-400">Error: {error}</div>
            </div>
          )}

          {/* Chart Container */}
          <div 
            ref={chartContainerRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800 border-t border-gray-600 px-4 py-2 text-xs text-gray-400 rounded-b-lg">
          Network: {chainId === '1' ? 'Ethereum' : chainId === '10' ? 'Optimism' : 'Arbitrum'} | 
          Chart Type: {chartType === 'candle' ? 'Candlestick' : 'Line'} | 
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}