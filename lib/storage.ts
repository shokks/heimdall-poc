export interface PortfolioPosition {
  symbol: string;
  shares: number;
  companyName: string;
  currentPrice?: number;
  dailyChange?: number;
  dailyChangePercent?: string;
  totalValue?: number;
  source?: 'alphavantage' | 'finnhub' | 'demo' | 'cache';
}

// Legacy localStorage functions for migration and fallback
/**
 * Save portfolio positions to localStorage (legacy)
 */
export const savePortfolioToLocalStorage = (positions: PortfolioPosition[]): void => {
  try {
    localStorage.setItem('portfolio', JSON.stringify(positions));
  } catch (_error) {
    // Silently fail for localStorage errors
  }
};

/**
 * Load portfolio positions from localStorage (legacy)
 */
export const loadPortfolioFromLocalStorage = (): PortfolioPosition[] => {
  try {
    const saved = localStorage.getItem('portfolio');
    return saved ? JSON.parse(saved) : [];
  } catch (_error) {
    // Return empty array for localStorage errors
    return [];
  }
};

/**
 * Clear portfolio from localStorage (legacy)
 */
export const clearPortfolioFromLocalStorage = (): void => {
  try {
    localStorage.removeItem('portfolio');
  } catch (_error) {
    // Silently fail for localStorage errors
  }
};

/**
 * Check if portfolio exists in localStorage (legacy)
 */
export const hasPortfolioInLocalStorage = (): boolean => {
  try {
    const saved = localStorage.getItem('portfolio');
    return saved !== null && JSON.parse(saved).length > 0;
  } catch (_error) {
    // Return false for localStorage errors
    return false;
  }
};

// Note: The main portfolio functions (savePortfolio, loadPortfolio, etc.) 
// are now handled by Convex hooks in components. These legacy functions 
// are kept for migration purposes.

/**
 * Get portfolio symbols as array
 */
export const getPortfolioSymbols = (
  portfolio: PortfolioPosition[]
): string[] => {
  return portfolio.map((position) => position.symbol);
};

/**
 * Calculate total portfolio value
 */
export const calculatePortfolioValue = (
  portfolio: PortfolioPosition[]
): number => {
  return portfolio.reduce((total, position) => {
    return total + (position.totalValue || 0);
  }, 0);
};

/**
 * Calculate portfolio daily change
 */
export const calculatePortfolioDailyChange = (
  portfolio: PortfolioPosition[]
): {
  totalChange: number;
  totalChangePercent: number;
} => {
  const totalValue = calculatePortfolioValue(portfolio);
  const totalChange = portfolio.reduce((total, position) => {
    if (position.currentPrice && position.dailyChange && position.shares) {
      return total + position.dailyChange * position.shares;
    }
    return total;
  }, 0);

  const totalChangePercent =
    totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  return {
    totalChange,
    totalChangePercent,
  };
};
