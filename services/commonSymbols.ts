import { MarketType } from '../types';

export interface SuggestionTicker {
  symbol: string;
  name: string;
  type: MarketType;
  region: 'US' | 'INDIA' | 'GLOBAL';
}

export const COMMON_SYMBOLS: SuggestionTicker[] = [
  // --- US Stocks (US) ---
  { symbol: 'AAPL', name: 'Apple Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', type: MarketType.STOCK, region: 'US' },
  { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', type: MarketType.STOCK, region: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'INTC', name: 'Intel Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'DIS', name: 'The Walt Disney Company', type: MarketType.STOCK, region: 'US' },
  { symbol: 'PYPL', name: 'PayPal Holdings, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'KO', name: 'The Coca-Cola Company', type: MarketType.STOCK, region: 'US' },
  { symbol: 'PEP', name: 'PepsiCo, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'WMT', name: 'Walmart Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'NKE', name: 'NIKE, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'BAC', name: 'Bank of America Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'GS', name: 'The Goldman Sachs Group, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'V', name: 'Visa Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'MA', name: 'Mastercard Incorporated', type: MarketType.STOCK, region: 'US' },
  { symbol: 'LLY', name: 'Eli Lilly and Company', type: MarketType.STOCK, region: 'US' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'QCOM', name: 'QUALCOMM Incorporated', type: MarketType.STOCK, region: 'US' },
  { symbol: 'TXN', name: 'Texas Instruments Incorporated', type: MarketType.STOCK, region: 'US' },
  { symbol: 'MU', name: 'Micron Technology, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'ORCL', name: 'Oracle Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'CSCO', name: 'Cisco Systems, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'ACN', name: 'Accenture plc', type: MarketType.STOCK, region: 'US' },
  { symbol: 'IBM', name: 'International Business Machines Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'UBER', name: 'Uber Technologies, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'COIN', name: 'Coinbase Global, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'SMCI', name: 'Super Micro Computer, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'SHOP', name: 'Shopify Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'SPOT', name: 'Spotify Technology S.A.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'ARM', name: 'ARM Holdings plc', type: MarketType.STOCK, region: 'US' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'CVX', name: 'Chevron Corporation', type: MarketType.STOCK, region: 'US' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: MarketType.STOCK, region: 'US' },
  { symbol: 'PG', name: 'The Procter & Gamble Company', type: MarketType.STOCK, region: 'US' },
  { symbol: 'HD', name: 'The Home Depot, Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'PFE', name: 'Pfizer Inc.', type: MarketType.STOCK, region: 'US' },
  { symbol: 'BA', name: 'The Boeing Company', type: MarketType.STOCK, region: 'US' },
  { symbol: 'GE', name: 'General Electric Company', type: MarketType.STOCK, region: 'US' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', type: MarketType.STOCK, region: 'US' },

  // --- Indian Stocks (INDIA) ---
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'INFY.NS', name: 'Infosys Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'LICI.NS', name: 'Life Insurance Corporation of India', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ITC.NS', name: 'ITC Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports and Special Economic Zone Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'NTPC.NS', name: 'NTPC Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'TITAN.NS', name: 'Titan Company Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'COALINDIA.NS', name: 'Coal India Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'WIPRO.NS', name: 'Wipro Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ONGC.NS', name: 'Oil and Natural Gas Corporation Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'BPCL.NS', name: 'Bharat Petroleum Corporation Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'IOC.NS', name: 'Indian Oil Corporation Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco Industries Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'GRASIM.NS', name: 'Grasim Industries Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'CIPLA.NS', name: 'Cipla Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals Enterprise Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'DIVISLAB.NS', name: 'Divi\'s Laboratories Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance Company Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance Company Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ADANIGREEN.NS', name: 'Adani Green Energy Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ADANIPOWER.NS', name: 'Adani Power Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'HAL.NS', name: 'Hindustan Aeronautics Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'TRENT.NS', name: 'Trent Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'ZOMATO.NS', name: 'Zomato Limited', type: MarketType.STOCK, region: 'INDIA' },
  { symbol: 'JIOFIN.NS', name: 'Jio Financial Services Limited', type: MarketType.STOCK, region: 'INDIA' },

  // --- Cryptocurrencies (GLOBAL) ---
  { symbol: 'BTC', name: 'Bitcoin (BTC)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'ETH', name: 'Ethereum (ETH)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'SOL', name: 'Solana (SOL)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'BNB', name: 'Binance Coin (BNB)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'XRP', name: 'Ripple (XRP)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'ADA', name: 'Cardano (ADA)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'DOGE', name: 'Dogecoin (DOGE)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'SHIB', name: 'Shiba Inu (SHIB)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'AVAX', name: 'Avalanche (AVAX)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'DOT', name: 'Polkadot (DOT)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'LINK', name: 'Chainlink (LINK)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'POL', name: 'Polygon (POL/MATIC)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'MATIC', name: 'Polygon (MATIC)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'LTC', name: 'Litecoin (LTC)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'UNI', name: 'Uniswap (UNI)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'NEAR', name: 'Near Protocol (NEAR)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'FET', name: 'Fetch.ai / Artificial Superintelligence Alliance', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'RNDR', name: 'Render Token (RNDR)', type: MarketType.CRYPTO, region: 'GLOBAL' },
  { symbol: 'PEPE', name: 'Pepe Coin (PEPE)', type: MarketType.CRYPTO, region: 'GLOBAL' },

  // --- Commodities (GLOBAL) ---
  { symbol: 'GC=F', name: 'Gold Futures', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { symbol: 'CL=F', name: 'Crude Oil WTI Futures', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { symbol: 'SI=F', name: 'Silver Futures', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { symbol: 'NG=F', name: 'Natural Gas Futures', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { symbol: 'HG=F', name: 'Copper Futures', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { symbol: 'BZ=F', name: 'Brent Crude Oil Futures', type: MarketType.COMMODITY, region: 'GLOBAL' },
  { symbol: 'PL=F', name: 'Platinum Futures', type: MarketType.COMMODITY, region: 'GLOBAL' },

  // --- Indices (GLOBAL) ---
  { symbol: '^GSPC', name: 'S&P 500 Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^IXIC', name: 'Nasdaq Composite Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^RUT', name: 'Russell 2000 Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^NSEI', name: 'Nifty 50 Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^BSESN', name: 'BSE Sensex Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^FTSE', name: 'FTSE 100 Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^GDAXI', name: 'DAX Performance Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^N225', name: 'Nikkei 225 Index', type: MarketType.INDEX, region: 'GLOBAL' },
  { symbol: '^HSI', name: 'Hang Seng Index', type: MarketType.INDEX, region: 'GLOBAL' }
];

export function searchLocalSymbols(
  query: string,
  region: 'US' | 'INDIA' | 'GLOBAL'
): SuggestionTicker[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toUpperCase();

  return COMMON_SYMBOLS.filter(item => {
    // Region check logic:
    // If modal is configured for US region: US assets, CRYPTO, COMMODITIES, INDICES (which are GLOBAL) are eligible.
    // If modal is configured for INDIA region: INDIA assets, CRYPTO, COMMODITIES, INDICES are eligible.
    // Otherwise, matched normally.
    if (region === 'US') {
      if (item.region !== 'US' && item.region !== 'GLOBAL') return false;
    } else if (region === 'INDIA') {
      if (item.region !== 'INDIA' && item.region !== 'GLOBAL') return false;
    }

    const symbolMatch = item.symbol.toUpperCase().includes(q);
    const nameMatch = item.name.toUpperCase().includes(q);

    // Give high score if symbol starts with query, or name starts with query
    return symbolMatch || nameMatch;
  })
  // Let's sort to put exact matches & prefix matches on top
  .sort((a, b) => {
    const aSym = a.symbol.toUpperCase();
    const bSym = b.symbol.toUpperCase();
    const aName = a.name.toUpperCase();
    const bName = b.name.toUpperCase();

    // Exact symbol match
    if (aSym === q && bSym !== q) return -1;
    if (bSym === q && aSym !== q) return 1;

    // Symbol starts with query
    const aSymStarts = aSym.startsWith(q);
    const bSymStarts = bSym.startsWith(q);
    if (aSymStarts && !bSymStarts) return -1;
    if (bSymStarts && !aSymStarts) return 1;

    // Name starts with query
    const aNameStarts = aName.startsWith(q);
    const bNameStarts = bName.startsWith(q);
    if (aNameStarts && !bNameStarts) return -1;
    if (bNameStarts && !aNameStarts) return 1;

    return 0;
  })
  .slice(0, 8);
}
