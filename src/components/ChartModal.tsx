'use client';

import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import Window from './Window';

interface ChartWindowProps {
  id: string;
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  chainId: string;
  chartType: 'candle' | 'line';
  interval?: string;
  onClose: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isActive?: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}


export default function ChartWindow({ 
  id, 
  token0, 
  token1, 
  token0Symbol,
  token1Symbol,
  chainId, 
  chartType, 
  interval = '1h', 
  onClose, 
  onFocus, 
  zIndex = 1000, 
  isActive = true,
  position = { x: 100, y: 100 },
  size = { width: 800, height: 600 }
}: ChartWindowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // Initialize chart when component mounts
  useEffect(() => {
    if (chartContainerRef.current) {
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
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
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
      
      // Initial data fetch
      if (token0 && token1) {
        fetchChartData();
      }
    }
  }, []);

  // Handle chart resizing when window size changes
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartRef.current) return;
      
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({
        width: Math.floor(width),
        height: Math.floor(height)
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Fetch and update chart data when parameters change
  useEffect(() => {
    if (token0 && token1 && chartRef.current) {
      fetchChartData();
    }
  }, [token0, token1, chainId, chartType, interval]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Convert interval to seconds for candle charts
  const intervalToSeconds = (interval: string): string => {
    const intervalMap: { [key: string]: string } = {
      '5m': '900',    // 5 minutes aliased to 15m due to 1inch API issue
      '15m': '900',   // 15 minutes  
      '1h': '3600',   // 1 hour
      '4h': '14400',  // 4 hours
      '1d': '86400',  // 1 day
      '1w': '604800'  // 1 week
    };
    return intervalMap[interval] || '3600'; // Default to 1 hour
  };

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
        ...(chartType === 'candle' ? { seconds: intervalToSeconds(interval) } : { period: 'AllTime' })
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
          
          // Define outlier thresholds (less aggressive filtering)
          const lowerBound = q1 - 5 * iqr; // Increased from 3 to 5
          const upperBound = q3 + 5 * iqr; // Increased from 3 to 5
          
          // Filter out only extreme outliers, keep most data
          const chartData = rawData.filter(candle => {
            const prices = [candle.open, candle.high, candle.low, candle.close];
            const hasExtreme = prices.some(price => price < lowerBound || price > upperBound);
            return !hasExtreme; // Only remove candles with extreme outlier prices
          }).map(candle => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));

          console.log(`Filtered candles: ${rawData.length} -> ${chartData.length}, bounds: ${lowerBound.toFixed(6)} - ${upperBound.toFixed(6)}`);
          
          // Determine appropriate precision based on price range
          const maxPrice = Math.max(...chartData.map(c => Math.max(c.open, c.high, c.low, c.close)));
          const minPrice = Math.min(...chartData.map(c => Math.min(c.open, c.high, c.low, c.close)));
          
          let precision = 2;
          let minMove = 0.01;
          
          if (maxPrice < 0.001) {
            precision = 10;
            minMove = 0.0000000001;
          } else if (maxPrice < 0.01) {
            precision = 8;
            minMove = 0.00000001;
          } else if (maxPrice < 0.1) {
            precision = 6;
            minMove = 0.000001;
          } else if (maxPrice < 1) {
            precision = 4;
            minMove = 0.0001;
          }
          
          console.log(`Price range: ${minPrice.toFixed(10)} - ${maxPrice.toFixed(10)}, using precision: ${precision}`);
          
          // Create candlestick series with proper price formatting
          const candlestickSeries = chartRef.current.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
            priceFormat: {
              type: 'price',
              precision: precision,
              minMove: minMove,
            },
          });
          
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
          
          // Determine appropriate precision for line chart based on price range
          const prices = chartData.map(point => point.value).filter(v => !isNaN(v) && v > 0);
          let precision = 2;
          let minMove = 0.01;
          
          if (prices.length > 0) {
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            
            if (maxPrice < 0.001) {
              precision = 10;
              minMove = 0.0000000001;
            } else if (maxPrice < 0.01) {
              precision = 8;
              minMove = 0.00000001;
            } else if (maxPrice < 0.1) {
              precision = 6;
              minMove = 0.000001;
            } else if (maxPrice < 1) {
              precision = 4;
              minMove = 0.0001;
            }
            
            console.log(`Line price range: ${minPrice.toFixed(10)} - ${maxPrice.toFixed(10)}, using precision: ${precision}`);
          }
          
          // Create line series with proper price formatting
          const lineSeries = chartRef.current.addLineSeries({
            color: '#6b7280',
            lineWidth: 2,
            priceFormat: {
              type: 'price',
              precision: precision,
              minMove: minMove,
            },
          });
          
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


  // Use symbols if available, otherwise fall back to addresses
  const displayToken0 = token0Symbol || token0;
  const displayToken1 = token1Symbol || token1;
  const windowTitle = `📈 ${displayToken0.toUpperCase()}/${displayToken1.toUpperCase()} - ${chartType === 'candle' ? 'Candlestick' : 'Line'} Chart`;

  return (
    <Window
      id={id}
      title={windowTitle}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      isActive={isActive}
      initialPosition={position}
      initialSize={size}
      minSize={{ width: 600, height: 400 }}
    >
      {/* Chart Content */}
      <div className="flex-1 bg-black text-gray-200 font-mono relative h-full flex flex-col">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-gray-400">Loading chart data...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-gray-500">Error: {error}</div>
          </div>
        )}

        {/* Chart Container */}
        <div className="flex-1 p-4 pb-0">
          <div 
            ref={chartContainerRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />
        </div>
        
        {/* Status Bar */}
        <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 text-xs text-gray-400 flex-shrink-0">
          Network: {chainId === '1' ? 'Ethereum' : chainId === '10' ? 'Optimism' : 'Arbitrum'} | 
          Chart Type: {chartType === 'candle' ? 'Candlestick' : 'Line'} | 
          Last updated: {new Date().toLocaleTimeString()} | 
          Chart visuals powered by{' '}
          <a 
            href="https://www.tradingview.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-gray-100 underline"
          >
            TradingView
          </a>
        </div>
      </div>
    </Window>
  );
}