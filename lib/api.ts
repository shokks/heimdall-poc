/**
 * API utilities for portfolio intelligence
 * Simplified to use Convex as single source of truth
 */

import { type PortfolioPosition } from './storage';

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  source: 'alphavantage' | 'finnhub' | 'demo' | 'cache';
  error?: string;
}

export interface ValidationSummary {
  totalParsed: number;
  passedBasicValidation: number;
  passedMarketValidation: number;
  invalidTickers: string[];
  lowConfidenceTickers?: string[];
  extractedCompanies: string[];
  searchResults?: Array<{
    intent: string;
    found: string | null;
    confidence: number;
  }>;
  warnings: string[];
}

export interface ParsedPortfolioResult {
  positions: PortfolioPosition[];
  validationSummary: ValidationSummary;
  hasWarnings: boolean;
}

/**
 * Parse portfolio using OpenAI with validation
 * Now relies on Convex for all data persistence
 */
export const parsePortfolioWithValidation = async (
  portfolioText: string
): Promise<ParsedPortfolioResult> => {
  const response = await fetch('/api/parse-portfolio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ portfolioText }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to parse portfolio');
  }

  const data = await response.json();
  
  return {
    positions: data.positions || [],
    validationSummary: data.validationSummary || {
      totalParsed: 0,
      passedBasicValidation: 0,
      passedMarketValidation: 0,
      invalidTickers: [],
      extractedCompanies: [],
      warnings: []
    },
    hasWarnings: (data.validationSummary?.warnings?.length || 0) > 0 ||
      (data.validationSummary?.invalidTickers?.length || 0) > 0 ||
      (data.validationSummary?.lowConfidenceTickers?.length || 0) > 0
  };
};

/**
 * Fetch stock prices from external APIs (simplified - no localStorage caching)
 * This function now directly calls the API without caching logic
 * Caching is handled entirely by Convex background jobs
 */
export const fetchStockPrices = async (symbols: string[]): Promise<StockPrice[]> => {
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
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    throw new Error('Failed to fetch stock prices. Please try again.');
  }
};

/**
 * Enrich portfolio positions with current prices from Convex
 * This function is now simplified since Convex stocks table contains latest prices
 */
export const enrichPortfolioWithPrices = async (
  portfolio: PortfolioPosition[]
): Promise<PortfolioPosition[]> => {
  if (portfolio.length === 0) {
    return portfolio;
  }

  // Note: This function is now primarily used as a fallback
  // In the optimized architecture, portfolio enrichment happens in Convex
  // via the getPortfolioByUser query which joins with the stocks table
  
  try {
    const symbols = portfolio.map(pos => pos.symbol);
    const prices = await fetchStockPrices(symbols);

    return portfolio.map(position => {
      const priceData = prices.find(p => p.symbol === position.symbol);

      if (priceData && !priceData.error) {
        return {
          ...position,
          currentPrice: priceData.price,
          dailyChange: priceData.change,
          dailyChangePercent: priceData.changePercent,
          totalValue: priceData.price * position.shares,
          source: priceData.source,
        };
      }

      return position;
    });
  } catch (error) {
    console.error('Error enriching portfolio with prices:', error);
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
 * Retry utility for API calls with exponential backoff
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
        // Exponential backoff with jitter
        const backoffDelay = delay * Math.pow(2, i) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError;
};

/**
 * Simple text parsing for portfolio entries (fallback)
 */
export const parsePortfolioText = async (portfolioText: string): Promise<PortfolioPosition[]> => {
  const result = await parsePortfolioWithValidation(portfolioText);
  return result.positions;
};