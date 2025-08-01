'use client';

import { RainbowKitProvider, Theme, getDefaultConfig, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import merge from 'lodash.merge'


const config = getDefaultConfig({
  appName: 'DeFi Terminal',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon, optimism, arbitrum, base, ],
  ssr: true,
});


const monoTheme = merge(lightTheme(), {
  fonts: {
    body: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
} as Theme);


const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={monoTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}