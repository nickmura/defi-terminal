'use client';

import { useState, useEffect } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from 'recharts';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  token0: string;
  token1: string;
  chainId: string;
  chartType: 'candle' | 'line';
}


export default function ChartModal({ isOpen, onClose, token0, token1, chainId, chartType }: ChartModalProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token0 && token1) {
      fetchChartData();
    }
  }, [isOpen, token0, token1, chainId, chartType]);

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = chartType === 'candle' ? '/api/charts/candle' : '/api/charts/line';
      const params = new URLSearchParams({
        token0,
        token1,
        chainId,
        ...(chartType === 'candle' ? { seconds: '300' } : { period: '1D' })
      });

      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      
      console.log('Chart API response:', data);
      console.log('Data type:', typeof data);
      console.log('Candles property:', data.candles);
      console.log('Candles type:', typeof data.candles);
      console.log('Is candles array?', Array.isArray(data.candles));
      
      if (chartType === 'candle') {
        // Transform candle data for recharts
        const candles = data.candles?.data || data.candles;
        if (Array.isArray(candles) && candles.length > 0) {
          console.log('First candle:', candles[0]);
          const transformedData = candles.map((candle: any) => ({
            timestamp: candle.time * 1000, // Convert to milliseconds (using 'time' not 'timestamp')
            time: new Date(candle.time * 1000).toLocaleTimeString(),
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
          }));
          console.log('Transformed data sample:', transformedData.slice(0, 2));
          setChartData(transformedData);
        } else {
          console.error('Candle data issue:', {
            candles,
            isArray: Array.isArray(candles),
            length: candles?.length,
            type: typeof candles
          });
          setError(`Invalid candle data: ${Array.isArray(candles) ? 'empty array' : 'not an array'}`);
        }
      } else {
        // Transform line data for recharts
        const lineData = data.lineData?.data || data.lineData;
        if (Array.isArray(lineData) && lineData.length > 0) {
          const transformedData = lineData.map((point: any) => ({
            timestamp: point.time * 1000, // Using 'time' property
            time: new Date(point.time * 1000).toLocaleTimeString(),
            price: parseFloat(point.price),
          }));
          setChartData(transformedData);
        } else {
          console.error('Line data issue:', {
            lineData,
            isArray: Array.isArray(lineData),
            length: lineData?.length,
            type: typeof lineData
          });
          setError(`Invalid line data: ${Array.isArray(lineData) ? 'empty array' : 'not an array'}`);
        }
      }
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
        <div className="flex-1 p-4 bg-black text-green-400 font-mono">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-green-400">Loading chart data...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400">Error: {error}</div>
            </div>
          )}

          {!loading && !error && chartData.length > 0 && (
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'candle' ? (
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      fontSize={12}
                      domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #4b5563',
                        borderRadius: '4px',
                        color: '#10b981'
                      }}
                      formatter={(value, name) => [value, String(name).toUpperCase()]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke="#10b981" 
                      strokeWidth={1}
                      dot={false}
                    />
                  </ComposedChart>
                ) : (
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #4b5563',
                        borderRadius: '4px',
                        color: '#10b981'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {!loading && !error && chartData.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">No chart data available</div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800 border-t border-gray-600 px-4 py-2 text-xs text-gray-400 rounded-b-lg">
          Network: {chainId === '1' ? 'Ethereum' : chainId === '10' ? 'Optimism' : 'Arbitrum'} | 
          Data points: {chartData.length} | 
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}