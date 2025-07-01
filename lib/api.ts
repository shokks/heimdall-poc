import type { PortfolioPosition } from './storage';

/**
 * Parse portfolio text using OpenAI API
 */
export const parsePortfolioText = async (
  portfolioText: string
): Promise<PortfolioPosition[]> => {
  try {
    const response = await fetch('/api/parse-portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ portfolioText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.positions || [];
  } catch (_error) {
    throw new Error('Failed to parse portfolio. Please try again.');
  }
};

/**
 * Stock price data from APIs
 */
export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  error?: string;
  source?: 'alphavantage' | 'finnhub' | 'demo';
}

interface CachedStockPrice extends StockPrice {
  timestamp: number;
  expiresAt: number;
}

// Cache duration: 5 minutes for stock prices
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get cached stock price from localStorage
 */
function getCachedPrice(symbol: string): StockPrice | null {
  try {
    const cached = localStorage.getItem(`stock_price_${symbol}`);
    if (!cached) return null;
    
    const data: CachedStockPrice = JSON.parse(cached);
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(`stock_price_${symbol}`);
      return null;
    }
    
    return {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      source: data.source
    };
  } catch {
    return null;
  }
}

/**
 * Cache stock price in localStorage
 */
function setCachedPrice(stockPrice: StockPrice): void {
  try {
    const cached: CachedStockPrice = {
      ...stockPrice,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    };
    localStorage.setItem(`stock_price_${stockPrice.symbol}`, JSON.stringify(cached));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Clear all cached stock prices
 */
export function clearStockPriceCache(): void {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('stock_price_')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Fetch stock prices for multiple symbols with caching
 */
export const fetchStockPrices = async (
  symbols: string[],
  options: { skipCache?: boolean } = {}
): Promise<StockPrice[]> => {
  const { skipCache = false } = options;
  
  try {
    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const cachedPrices: StockPrice[] = [];
      const uncachedSymbols: string[] = [];
      
      for (const symbol of symbols) {
        const cached = getCachedPrice(symbol);
        if (cached) {
          console.log(`Using cached price for ${symbol}:`, cached);
          cachedPrices.push(cached);
        } else {
          uncachedSymbols.push(symbol);
        }
      }
      
      // If all symbols are cached, return cached data
      if (uncachedSymbols.length === 0) {
        console.log('All prices found in cache');
        return cachedPrices;
      }
      
      // If some are cached, fetch only uncached ones
      if (uncachedSymbols.length < symbols.length) {
        console.log(`Fetching ${uncachedSymbols.length} uncached symbols:`, uncachedSymbols);
        const freshPrices = await fetchStockPrices(uncachedSymbols, { skipCache: true });
        
        // Cache the fresh prices
        freshPrices.forEach(price => {
          if (!price.error) {
            setCachedPrice(price);
          }
        });
        
        // Return combined cached + fresh data in original order
        return symbols.map(symbol => {
          const cached = cachedPrices.find(p => p.symbol === symbol);
          if (cached) return cached;
          
          const fresh = freshPrices.find(p => p.symbol === symbol);
          return fresh || {
            symbol,
            price: 0,
            change: 0,
            changePercent: '0.00%',
            error: 'Failed to fetch price'
          };
        });
      }
      
      // All symbols need to be fetched
      symbols.splice(0, symbols.length, ...uncachedSymbols);
    }

    const response = await fetch('/api/stock-prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices || [];
    
    // Cache successful responses
    if (!skipCache) {
      prices.forEach((price: StockPrice) => {
        if (!price.error) {
          setCachedPrice(price);
        }
      });
    }
    
    return prices;
  } catch (_error) {
    throw new Error('Failed to fetch stock prices. Please try again.');
  }
};

/**
 * Enrich portfolio positions with current prices
 */
export const enrichPortfolioWithPrices = async (
  portfolio: PortfolioPosition[]
): Promise<PortfolioPosition[]> => {
  if (portfolio.length === 0) {
    return portfolio;
  }

  try {
    const symbols = portfolio.map((pos) => pos.symbol);
    const prices = await fetchStockPrices(symbols);

    return portfolio.map((position) => {
      const priceData = prices.find((p) => p.symbol === position.symbol);

      if (priceData && !priceData.error) {
        return {
          ...position,
          currentPrice: priceData.price,
          dailyChange: priceData.change,
          dailyChangePercent: priceData.changePercent,
          totalValue: priceData.price * position.shares,
        };
      }

      return position;
    });
  } catch (_error) {
    // Return original portfolio if price fetching fails
    return portfolio;
  }
};

/**
 * API response error handling utility
 */
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Retry utility for API calls
 */
export const retryApiCall = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
};
