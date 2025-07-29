export const getProperTokenAddress = (token: { address: string }, fromChainId: number): string => {
      if (token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
        const wethAddresses: Record<number, string> = {
          1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum
          10: '0x4200000000000000000000000000000000000006', // Optimism
          42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum
          137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // Polygon (WMATIC)
          56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // BSC (WBNB)
        };
        return wethAddresses[fromChainId] || wethAddresses[1];
        
      }
      return token.address;
    };