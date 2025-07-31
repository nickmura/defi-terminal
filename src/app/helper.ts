// Token definitions
export const TOKENS = {
  1: { // Ethereum Mainnet
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', decimals: 18 },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8 },
    LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18 },
    UNI: { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18 },
    AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimals: 18 },
    MKR: { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'MKR', decimals: 18 },
    COMP: { address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', symbol: 'COMP', decimals: 18 },
    CRV: { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV', decimals: 18 },
    SNX: { address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', symbol: 'SNX', decimals: 18 },
    SUSHI: { address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', symbol: 'SUSHI', decimals: 18 },
    '1INCH': { address: '0x111111111117dC0aa78b770fA6A738034120C302', symbol: '1INCH', decimals: 18 },
    MATIC: { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', symbol: 'MATIC', decimals: 18 },
  },
  137: { // Polygon
    MATIC: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'MATIC', decimals: 18 },
    WMATIC: { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', decimals: 18 },
    USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6 },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
    DAI: { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', decimals: 18 },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18 },
    WBTC: { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', symbol: 'WBTC', decimals: 8 },
    LINK: { address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', symbol: 'LINK', decimals: 18 },
    UNI: { address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', symbol: 'UNI', decimals: 18 },
    AAVE: { address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', symbol: 'AAVE', decimals: 18 },
    CRV: { address: '0x172370d5Cd63279eFa6d502DAB29171933a610AF', symbol: 'CRV', decimals: 18 },
    SUSHI: { address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', symbol: 'SUSHI', decimals: 18 },
  },
  42161: { // Arbitrum
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', decimals: 18 },
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
    'USDC.E': { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC.E', decimals: 6 },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', decimals: 18 },
    WBTC: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', decimals: 8 },
    ARB: { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', decimals: 18 },
    LINK: { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', symbol: 'LINK', decimals: 18 },
    UNI: { address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', symbol: 'UNI', decimals: 18 },
    AAVE: { address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196', symbol: 'AAVE', decimals: 18 },
    CRV: { address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978', symbol: 'CRV', decimals: 18 },
    SUSHI: { address: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A', symbol: 'SUSHI', decimals: 18 },
    GMX: { address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', symbol: 'GMX', decimals: 18 },
    MAGIC: { address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', symbol: 'MAGIC', decimals: 18 },
  },
  10: { // Optimism
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', decimals: 18 },
    WETH: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
    'USDC.E': { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC.E', decimals: 6 },
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', decimals: 18 },
    WBTC: { address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', symbol: 'WBTC', decimals: 8 },
    OP: { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', decimals: 18 },
    LINK: { address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', symbol: 'LINK', decimals: 18 },
    UNI: { address: '0x6fd9d7AD17242c41f7131d257212c54A0e5834bd', symbol: 'UNI', decimals: 18 },
    AAVE: { address: '0x76FB31fb4af56892A25e32cFC43De717950c9278', symbol: 'AAVE', decimals: 18 },
    CRV: { address: '0xadDb6A0412DE1BA0F936DCaeb8Aaa24578dcF3B2', symbol: 'CRV', decimals: 18 },
    SUSHI: { address: '0x3eaEb77b03dBc0F6321AE1b72b2E9aDb0F60112B', symbol: 'SUSHI', decimals: 18 },
    SNX: { address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4', symbol: 'SNX', decimals: 18 },
    THALES: { address: '0x217D47011b23BB961eB6D93cA9945B7501a5BB11', symbol: 'THALES', decimals: 18 },
  },
  8453: { // Base
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', decimals: 18 },
    WETH: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
    USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', symbol: 'USDbC', decimals: 6 },
    DAI: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', decimals: 18 },
    WBTC: { address: '0x1C37E975C82Da8B3C8e4Be18D3C2fB5e0B32F5E5', symbol: 'WBTC', decimals: 8 },
    LINK: { address: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196', symbol: 'LINK', decimals: 18 },
    UNI: { address: '0x985e96C2de24d28873911b7B0799388dea8B4e3D', symbol: 'UNI', decimals: 18 },
  },
  56: { // BSC
    BNB: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'BNB', decimals: 18 },
    WBNB: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', decimals: 18 },
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18 },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
    BUSD: { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', decimals: 18 },
    ETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', decimals: 18 },
    BTCB: { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', decimals: 18 },
    CAKE: { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', decimals: 18 },
  },
  43114: { // Avalanche
    AVAX: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'AVAX', decimals: 18 },
    WAVAX: { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', decimals: 18 },
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6 },
    'USDC.E': { address: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', symbol: 'USDC.E', decimals: 6 },
    USDT: { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', decimals: 6 },
    'USDT.E': { address: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', symbol: 'USDT.E', decimals: 6 },
    DAI: { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', symbol: 'DAI', decimals: 18 },
    'DAI.E': { address: '0xbA7dEebBFC5fA1100Fb055a87773e1E99Cd3507a', symbol: 'DAI.E', decimals: 18 },
    WETH: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', symbol: 'WETH', decimals: 18 },
    'WETH.E': { address: '0x50b7545627a5162F82A992c33b87aDc75187B218', symbol: 'WETH.E', decimals: 18 },
    WBTC: { address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50', symbol: 'WBTC', decimals: 8 },
    'WBTC.E': { address: '0x408D4cD0ADb7ceBd1F1A1C33A0Ba2098E1295bAB', symbol: 'WBTC.E', decimals: 8 },
    LINK: { address: '0x5947BB275c521040051D82396192181b413227A3', symbol: 'LINK', decimals: 18 },
    'LINK.E': { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', symbol: 'LINK.E', decimals: 18 },
    JOE: { address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', symbol: 'JOE', decimals: 18 },
  },
};

// Enhanced token resolution with 1inch API fallback
export const resolveTokenAddress = async (symbol: string, chainId: number): Promise<string | null> => {
  // First check static token list
  const tokens = TOKENS[chainId as keyof typeof TOKENS];
  if (tokens) {
    const token = tokens[symbol.toUpperCase() as keyof typeof tokens];
    if (token) {
      return token.address;
    }
  }

  // Fallback to 1inch API
  try {
    const response = await fetch(`/api/tokens/resolve?symbol=${encodeURIComponent(symbol)}&chainId=${chainId}`);
    if (response.ok) {
      const data = await response.json();
      return data.token.address;
    }
  } catch (error) {
    console.warn('Failed to resolve token from 1inch API:', error);
  }

  return null;
};


  export const getTokenDecimals = async (symbol: string, networkId: number): Promise<number> => {
    // First check static tokens
    const tokens = TOKENS[networkId as keyof typeof TOKENS];
    if (tokens) {
      const token = tokens[symbol.toUpperCase() as keyof typeof tokens];
      if (token) return token.decimals;
    }

    // Fallback to 1inch API
    try {
      const response = await fetch(`/api/tokens/resolve?symbol=${encodeURIComponent(symbol)}&chainId=${networkId}`);
      if (response.ok) {
        const data = await response.json();
        return data.token.decimals;
      }
    } catch (error) {
      console.warn('Failed to resolve token from 1inch API:', error);
    }

    return 18; // Default decimals
  };
// Enhanced token info resolution with 1inch API fallback
export const resolveTokenInfo = async (symbol: string, chainId: number): Promise<{ address: string; decimals: number } | null> => {
  // First check static token list
  const tokens = TOKENS[chainId as keyof typeof TOKENS];
  if (tokens) {
    const token = tokens[symbol.toUpperCase() as keyof typeof tokens];
    if (token) {
      return { address: token.address, decimals: token.decimals };
    }
  }

  // Fallback to 1inch API
  try {
    const response = await fetch(`/api/tokens/resolve?symbol=${encodeURIComponent(symbol)}&chainId=${chainId}`);
    if (response.ok) {
      const data = await response.json();
      return { 
        address: data.token.address, 
        decimals: data.token.decimals 
      };
    }
  } catch (error) {
    console.warn('Failed to resolve token from 1inch API:', error);
  }

  return null;
};
