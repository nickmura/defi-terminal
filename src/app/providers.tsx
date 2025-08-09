'use client';

import { RainbowKitProvider, Theme, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
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


const monoTheme = merge(darkTheme(), {
  fonts: {
    body: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  colors: {
    accentColor: '#4B5563', // gray-600
    accentColorForeground: '#F3F4F6', // gray-100
    actionButtonBorder: '#374151', // gray-700
    actionButtonBorderMobile: '#374151',
    actionButtonSecondaryBackground: '#111827', // gray-900
    closeButton: '#6B7280', // gray-500
    closeButtonBackground: '#1F2937', // gray-800
    connectButtonBackground: '#111827', // gray-900
    connectButtonBackgroundError: '#374151',
    connectButtonInnerBackground: '#000000',
    connectButtonText: '#9CA3AF', // gray-400
    connectButtonTextError: '#EF4444',
    error: '#6B7280', // gray-500
    generalBorder: '#374151', // gray-700
    generalBorderDim: '#1F2937', // gray-800
    menuItemBackground: '#111827', // gray-900
    modalBackdrop: 'rgba(0, 0, 0, 0.8)',
    modalBackground: '#000000',
    modalBorder: '#374151', // gray-700
    modalText: '#9CA3AF', // gray-400
    modalTextDim: '#6B7280', // gray-500
    modalTextSecondary: '#6B7280',
    profileAction: '#111827', // gray-900
    profileActionHover: '#1F2937', // gray-800
    profileForeground: '#000000',
    selectedOptionBorder: '#4B5563', // gray-600
    standby: '#374151' // gray-700
  }
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