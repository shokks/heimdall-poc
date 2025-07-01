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
 * Stock price data from Alpha Vantage
 */
export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  error?: boolean;
}

/**
 * Fetch stock prices for multiple symbols
 */
export const fetchStockPrices = async (
  symbols: string[]
): Promise<StockPrice[]> => {
  try {
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
    return data.prices || [];
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
