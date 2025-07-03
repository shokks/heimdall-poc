import type { PortfolioPosition } from './storage';

// Cache configuration
const INSIGHT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const insightCache = new Map<string, { data: any; timestamp: number }>();

/**
 * News item interface for filtering and insights
 */
export interface NewsItem {
  id: string;
  headline: string;
  ticker: string;
  impact: 'positive' | 'negative' | 'neutral';
  timestamp: string;
  description?: string;
}

/**
 * Portfolio insight interface
 */
export interface PortfolioInsight {
  id: string;
  type: 'performance' | 'movers' | 'news' | 'allocation';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  data?: {
    value?: number;
    percentage?: number;
    symbol?: string;
    companyName?: string;
  };
}

/**
 * Calculate portfolio performance metrics
 */
export const calculatePortfolioMetrics = (portfolio: PortfolioPosition[]) => {
  const totalValue = portfolio.reduce((sum, pos) => sum + (pos.totalValue || 0), 0);
  const totalChange = portfolio.reduce((sum, pos) => {
    if (pos.currentPrice && pos.dailyChange && pos.shares) {
      return sum + (pos.dailyChange * pos.shares);
    }
    return sum;
  }, 0);
  
  const changePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;
  
  // Find biggest mover (by percentage)
  const positionsWithChanges = portfolio.filter(pos => 
    pos.dailyChangePercent && pos.currentPrice && pos.totalValue
  );
  
  const biggestMover = positionsWithChanges.reduce((biggest, current) => {
    const currentPercent = Math.abs(parseFloat(current.dailyChangePercent?.replace('%', '') || '0'));
    const biggestPercent = Math.abs(parseFloat(biggest.dailyChangePercent?.replace('%', '') || '0'));
    return currentPercent > biggestPercent ? current : biggest;
  }, positionsWithChanges[0]);

  // Find largest position by value
  const largestPosition = portfolio.reduce((largest, current) => {
    const currentValue = current.totalValue || 0;
    const largestValue = largest.totalValue || 0;
    return currentValue > largestValue ? current : largest;
  }, portfolio[0]);

  return {
    totalValue,
    totalChange,
    changePercent,
    biggestMover,
    largestPosition,
    positionCount: portfolio.length,
    hasValidPrices: portfolio.some(pos => pos.currentPrice)
  };
};

/**
 * Generate insights based on portfolio performance and news
 */
export const generatePortfolioInsights = (
  portfolio: PortfolioPosition[],
  relevantNews: NewsItem[] = []
): PortfolioInsight[] => {
  const insights: PortfolioInsight[] = [];
  
  if (portfolio.length === 0) {
    return insights;
  }

  const metrics = calculatePortfolioMetrics(portfolio);
  
  // Performance insight
  if (metrics.hasValidPrices && metrics.totalValue > 0) {
    const isPositive = metrics.totalChange > 0;
    const absChange = Math.abs(metrics.totalChange);
    const absPercent = Math.abs(metrics.changePercent);
    
    insights.push({
      id: 'portfolio-performance',
      type: 'performance',
      title: isPositive ? 'Portfolio Gains Today' : 'Portfolio Changes Today',
      description: `Your portfolio is ${isPositive ? 'up' : 'down'} $${absChange.toFixed(2)} (${absPercent.toFixed(1)}%) today, with a total value of $${metrics.totalValue.toFixed(2)}.`,
      impact: isPositive ? 'positive' : metrics.totalChange < 0 ? 'negative' : 'neutral',
      data: {
        value: metrics.totalChange,
        percentage: metrics.changePercent
      }
    });
  }

  // Biggest mover insight
  if (metrics.biggestMover && metrics.biggestMover.dailyChangePercent) {
    const changePercent = parseFloat(metrics.biggestMover.dailyChangePercent.replace('%', ''));
    const isPositive = changePercent > 0;
    const impact = Math.abs(changePercent) > 2 ? (isPositive ? 'positive' : 'negative') : 'neutral';
    
    insights.push({
      id: 'biggest-mover',
      type: 'movers',
      title: `${metrics.biggestMover.companyName} Leading ${isPositive ? 'Gains' : 'Declines'}`,
      description: `${metrics.biggestMover.companyName} (${metrics.biggestMover.symbol}) is ${isPositive ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(1)}% today, ${Math.abs(changePercent) > 3 ? 'significantly' : ''} ${isPositive ? 'boosting' : 'impacting'} your portfolio.`,
      impact,
      data: {
        symbol: metrics.biggestMover.symbol,
        companyName: metrics.biggestMover.companyName,
        percentage: changePercent
      }
    });
  }

  // Portfolio allocation insight
  if (metrics.largestPosition && metrics.totalValue > 0) {
    const allocation = ((metrics.largestPosition.totalValue || 0) / metrics.totalValue) * 100;
    
    if (allocation > 30) {
      insights.push({
        id: 'allocation-concentration',
        type: 'allocation',
        title: 'Portfolio Concentration',
        description: `${metrics.largestPosition.companyName} represents ${allocation.toFixed(1)}% of your portfolio. Consider diversifying if this exceeds your risk tolerance.`,
        impact: allocation > 50 ? 'negative' : 'neutral',
        data: {
          symbol: metrics.largestPosition.symbol,
          companyName: metrics.largestPosition.companyName,
          percentage: allocation
        }
      });
    }
  }

  // News-based insights
  if (relevantNews.length > 0) {
    const positivNews = relevantNews.filter(news => news.impact === 'positive').length;
    const negativeNews = relevantNews.filter(news => news.impact === 'negative').length;
    
    if (positivNews > 0 || negativeNews > 0) {
      const newsBalance = positivNews > negativeNews ? 'positive' : negativeNews > positivNews ? 'negative' : 'neutral';
      const dominantType = positivNews > negativeNews ? 'positive' : negativeNews > positivNews ? 'negative' : 'mixed';
      
      insights.push({
        id: 'news-sentiment',
        type: 'news',
        title: `${dominantType === 'positive' ? 'Positive' : dominantType === 'negative' ? 'Negative' : 'Mixed'} News Environment`,
        description: `Today's news shows ${positivNews} positive and ${negativeNews} negative stories affecting your holdings. ${dominantType === 'positive' ? 'Market sentiment appears favorable for your stocks.' : dominantType === 'negative' ? 'Consider monitoring developments closely.' : 'Mixed signals suggest careful monitoring of individual positions.'}`,
        impact: newsBalance,
        data: {
          value: relevantNews.length
        }
      });
    }
  }

  // Market opportunity insight for diversification
  if (portfolio.length < 5 && metrics.totalValue > 1000) {
    insights.push({
      id: 'diversification-opportunity',
      type: 'allocation',
      title: 'Diversification Opportunity',
      description: `With ${portfolio.length} position${portfolio.length === 1 ? '' : 's'} in your portfolio, consider adding holdings in different sectors to reduce concentration risk and improve long-term stability.`,
      impact: 'neutral',
      data: {
        value: portfolio.length
      }
    });
  }

  return insights.slice(0, 4); // Limit to 4 insights for POC
};

/**
 * Filter news items based on portfolio holdings
 */
export const filterRelevantNews = (
  news: NewsItem[],
  portfolio: PortfolioPosition[]
): NewsItem[] => {
  const portfolioSymbols = portfolio.map(pos => pos.symbol);
  return news.filter(item => portfolioSymbols.includes(item.ticker));
};

// Additional utility functions for compatibility
export const createInsightContext = (
  portfolio: PortfolioPosition[], 
  enhancedNews?: NewsItem[], 
  historicalData?: any
) => {
  return {
    portfolio,
    symbols: portfolio.map(p => p.symbol),
    totalValue: portfolio.reduce((sum, pos) => sum + (pos.totalValue || 0), 0),
    enhancedNews: enhancedNews || [],
    historicalData: historicalData || null
  };
};

export const getCachedInsights = (cacheKey: string): PortfolioInsight[] | null => {
  const cached = insightCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

export const setCachedInsights = (cacheKey: string, insights: PortfolioInsight[]): void => {
  insightCache.set(cacheKey, {
    data: insights,
    timestamp: Date.now()
  });
};

export const convertToEnhancedNews = (news: any[]): NewsItem[] => {
  return news.map(item => ({
    id: item.id || Math.random().toString(),
    headline: item.headline || item.title || '',
    ticker: item.ticker || item.symbol || '',
    impact: item.impact || 'neutral',
    timestamp: item.timestamp || 'Unknown',
    description: item.description || item.summary || ''
  }));
};

// Clean up old insight cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cache] of insightCache.entries()) {
    if (now - cache.timestamp > INSIGHT_CACHE_DURATION * 2) {
      insightCache.delete(key);
    }
  }
}, INSIGHT_CACHE_DURATION);