// News filtering logic for Portfolio Intelligence
// Filters news based on user's portfolio holdings

import { NewsItem } from '@/data/mockNews';
import { ProcessedNewsItem } from '@/app/api/financial-news/route';  
import { PortfolioPosition } from '@/lib/storage';

export interface PortfolioHolding {
  symbol: string;
  shares: number;
  averagePrice?: number;
}

/**
 * Converts PortfolioPosition to PortfolioHolding for news filtering
 */
export function convertPortfolioForNews(portfolio: PortfolioPosition[]): PortfolioHolding[] {
  return portfolio.map(position => ({
    symbol: position.symbol,
    shares: position.shares,
    averagePrice: position.currentPrice
  }));
}

export interface FilterOptions {
  impact?: 'positive' | 'negative' | 'neutral' | 'all';
  timeframe?: 'today' | 'week' | 'month' | 'all';
  sortBy?: 'timestamp' | 'relevance' | 'impact';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filters news items based on user's portfolio holdings
 * @param newsItems - Array of all news items
 * @param portfolio - User's portfolio holdings
 * @param options - Optional filtering and sorting options
 * @returns Filtered and sorted news items relevant to the portfolio
 */
export function filterNewsForPortfolio(
  newsItems: NewsItem[],
  portfolio: PortfolioHolding[],
  options: FilterOptions = {}
): NewsItem[] {
  if (!portfolio || portfolio.length === 0) {
    return [];
  }

  // Extract symbols from portfolio
  const portfolioSymbols = new Set(portfolio.map(holding => holding.symbol.toUpperCase()));

  // Filter news items that contain at least one portfolio symbol
  let filteredNews = newsItems.filter(item => 
    item.relatedSymbols.some(symbol => portfolioSymbols.has(symbol.toUpperCase()))
  );

  // Apply impact filter
  if (options.impact && options.impact !== 'all') {
    filteredNews = filteredNews.filter(item => item.impact === options.impact);
  }

  // Apply timeframe filter
  if (options.timeframe && options.timeframe !== 'all') {
    const now = new Date();
    const filterDate = getFilterDate(now, options.timeframe);
    
    filteredNews = filteredNews.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= filterDate;
    });
  }

  // Sort the results
  filteredNews = sortNews(filteredNews, portfolio, options);

  return filteredNews;
}

/**
 * Gets the cutoff date for timeframe filtering
 */
function getFilterDate(now: Date, timeframe: string): Date {
  const filterDate = new Date(now);
  
  switch (timeframe) {
    case 'today':
      filterDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      filterDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      filterDate.setMonth(now.getMonth() - 1);
      break;
    default:
      return new Date(0); // Return epoch for 'all'
  }
  
  return filterDate;
}

/**
 * Sorts news items based on the specified criteria
 */
function sortNews(
  newsItems: NewsItem[],
  portfolio: PortfolioHolding[],
  options: FilterOptions
): NewsItem[] {
  const { sortBy = 'timestamp', sortOrder = 'desc' } = options;

  return newsItems.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'relevance':
        comparison = calculateRelevanceScore(b, portfolio) - calculateRelevanceScore(a, portfolio);
        break;
      case 'impact':
        comparison = getImpactScore(b.impact) - getImpactScore(a.impact);
        break;
      default:
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Calculates relevance score based on portfolio holdings
 */
function calculateRelevanceScore(newsItem: NewsItem, portfolio: PortfolioHolding[]): number {
  let score = 0;
  const portfolioMap = new Map(portfolio.map(h => [h.symbol.toUpperCase(), h]));

  // Add points for each matching symbol
  for (const symbol of newsItem.relatedSymbols) {
    const holding = portfolioMap.get(symbol.toUpperCase());
    if (holding) {
      // Weight by number of shares (more shares = more relevant)
      score += Math.log(holding.shares + 1);
      
      // Bonus for multiple symbol matches
      score += 1;
    }
  }

  // Boost score for high-impact news
  if (newsItem.impact === 'positive' || newsItem.impact === 'negative') {
    score += 2;
  }

  return score;
}

/**
 * Converts impact to numeric score for sorting
 */
function getImpactScore(impact: string): number {
  switch (impact) {
    case 'positive':
      return 3;
    case 'negative':
      return 2;
    case 'neutral':
      return 1;
    default:
      return 0;
  }
}

/**
 * Groups news items by their impact type
 */
export function groupNewsByImpact(newsItems: NewsItem[]): Record<string, NewsItem[]> {
  return newsItems.reduce((groups, item) => {
    const impact = item.impact;
    if (!groups[impact]) {
      groups[impact] = [];
    }
    groups[impact].push(item);
    return groups;
  }, {} as Record<string, NewsItem[]>);
}

/**
 * Gets news statistics for a portfolio
 */
export function getNewsStats(newsItems: NewsItem[]): {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
  negativePercentage: number;
} {
  const stats = {
    total: newsItems.length,
    positive: 0,
    negative: 0,
    neutral: 0,
    positivePercentage: 0,
    negativePercentage: 0
  };

  newsItems.forEach(item => {
    switch (item.impact) {
      case 'positive':
        stats.positive++;
        break;
      case 'negative':
        stats.negative++;
        break;
      case 'neutral':
        stats.neutral++;
        break;
    }
  });

  if (stats.total > 0) {
    stats.positivePercentage = Math.round((stats.positive / stats.total) * 100);
    stats.negativePercentage = Math.round((stats.negative / stats.total) * 100);
  }

  return stats;
}

/**
 * Finds the most mentioned symbols in news items
 */
export function getMostMentionedSymbols(newsItems: NewsItem[]): Array<{ symbol: string; count: number }> {
  const symbolCounts = new Map<string, number>();

  newsItems.forEach(item => {
    item.relatedSymbols.forEach(symbol => {
      symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
    });
  });

  return Array.from(symbolCounts.entries())
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Enhanced filtering for ProcessedNewsItem with additional fields
 */
export function filterProcessedNews(
  newsItems: ProcessedNewsItem[],
  portfolio: PortfolioHolding[],
  options: FilterOptions & { 
    category?: string;
    minRelevanceScore?: number;
  } = {}
): ProcessedNewsItem[] {
  if (!portfolio || portfolio.length === 0) {
    return [];
  }

  // Extract symbols from portfolio
  const portfolioSymbols = new Set(portfolio.map(holding => holding.symbol.toUpperCase()));

  // Filter news items that contain at least one portfolio symbol
  let filteredNews = newsItems.filter(item => 
    item.relatedSymbols.some(symbol => portfolioSymbols.has(symbol.toUpperCase()))
  );

  // Apply impact filter
  if (options.impact && options.impact !== 'all') {
    filteredNews = filteredNews.filter(item => item.impact === options.impact);
  }

  // Apply category filter
  if (options.category && options.category !== 'all') {
    filteredNews = filteredNews.filter(item => item.category === options.category);
  }

  // Apply relevance score filter
  if (options.minRelevanceScore !== undefined) {
    filteredNews = filteredNews.filter(item => 
      (item.relevanceScore || 0) >= options.minRelevanceScore!
    );
  }

  // Apply timeframe filter
  if (options.timeframe && options.timeframe !== 'all') {
    const now = new Date();
    const filterDate = getFilterDate(now, options.timeframe);
    
    filteredNews = filteredNews.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= filterDate;
    });
  }

  // Sort the results
  filteredNews = sortProcessedNews(filteredNews, portfolio, options);

  return filteredNews;
}

/**
 * Sorts ProcessedNewsItem based on enhanced criteria
 */
function sortProcessedNews(
  newsItems: ProcessedNewsItem[],
  portfolio: PortfolioHolding[],
  options: FilterOptions
): ProcessedNewsItem[] {
  const { sortBy = 'relevance', sortOrder = 'desc' } = options;

  return newsItems.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'relevance':
        comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        break;
      case 'impact':
        comparison = getImpactScore(b.impact) - getImpactScore(a.impact);
        break;
      default:
        comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Groups ProcessedNewsItem by category
 */
export function groupNewsByCategory(newsItems: ProcessedNewsItem[]): Record<string, ProcessedNewsItem[]> {
  return newsItems.reduce((groups, item) => {
    const category = item.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, ProcessedNewsItem[]>);
}

/**
 * Gets top news items by relevance score
 */
export function getTopNewsByRelevance(
  newsItems: ProcessedNewsItem[], 
  limit = 10
): ProcessedNewsItem[] {
  return newsItems
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, limit);
}

/**
 * Filters news by category
 */
export function filterNewsByCategory(
  newsItems: ProcessedNewsItem[],
  category: string
): ProcessedNewsItem[] {
  if (category === 'all') return newsItems;
  return newsItems.filter(item => item.category === category);
}

/**
 * Gets category distribution for portfolio news
 */
export function getCategoryStats(newsItems: ProcessedNewsItem[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  newsItems.forEach(item => {
    const category = item.category || 'general';
    stats[category] = (stats[category] || 0) + 1;
  });
  
  return stats;
}

/**
 * Gets high-impact news items for a portfolio
 */
export function getHighImpactNews(
  newsItems: ProcessedNewsItem[],
  minRelevanceScore = 5
): ProcessedNewsItem[] {
  return newsItems.filter(item => 
    (item.relevanceScore || 0) >= minRelevanceScore &&
    (item.impact === 'positive' || item.impact === 'negative')
  );
}