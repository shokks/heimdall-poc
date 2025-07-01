import type { PortfolioPosition } from './storage';

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

/**
 * Mock news data for POC
 */
export const mockNewsData: NewsItem[] = [
  {
    id: '1',
    headline: 'Apple Reports Record iPhone 15 Sales Despite Economic Headwinds',
    ticker: 'AAPL',
    impact: 'positive',
    timestamp: '2 hours ago',
    description: 'Apple Inc. exceeded analyst expectations with strong iPhone 15 sales numbers.'
  },
  {
    id: '2',
    headline: 'Microsoft Azure Growth Accelerates with AI Integration',
    ticker: 'MSFT',
    impact: 'positive',
    timestamp: '4 hours ago',
    description: 'Microsoft Corporation sees strong demand for AI-powered cloud services.'
  },
  {
    id: '3',
    headline: 'Tesla Faces Production Challenges at Berlin Gigafactory',
    ticker: 'TSLA',
    impact: 'negative',
    timestamp: '1 hour ago',
    description: 'Tesla Inc. reports temporary production slowdowns affecting delivery targets.'
  },
  {
    id: '4',
    headline: 'Amazon Prime Membership Hits New Record High',
    ticker: 'AMZN',
    impact: 'positive',
    timestamp: '6 hours ago',
    description: 'Amazon.com Inc. announces significant growth in Prime subscriber base.'
  },
  {
    id: '5',
    headline: 'Google Unveils Advanced AI Search Capabilities',
    ticker: 'GOOGL',
    impact: 'positive',
    timestamp: '3 hours ago',
    description: 'Alphabet Inc. demonstrates new AI-powered search features to boost market position.'
  },
  {
    id: '6',
    headline: 'Meta Platforms Invests Heavily in Metaverse Infrastructure',
    ticker: 'META',
    impact: 'neutral',
    timestamp: '5 hours ago',
    description: 'Meta Platforms Inc. continues significant investments in virtual reality technology.'
  },
  {
    id: '7',
    headline: 'Netflix Faces Increased Competition in Streaming Market',
    ticker: 'NFLX',
    impact: 'negative',
    timestamp: '7 hours ago',
    description: 'Netflix Inc. reports subscriber growth challenges amid intensifying competition.'
  },
  {
    id: '8',
    headline: 'NVIDIA Chips Drive AI Revolution Across Industries',
    ticker: 'NVDA',
    impact: 'positive',
    timestamp: '8 hours ago',
    description: 'NVIDIA Corporation benefits from explosive demand for AI processing capabilities.'
  },
  {
    id: '9',
    headline: 'Apple Supplier Concerns Impact Stock Price',
    ticker: 'AAPL',
    impact: 'negative',
    timestamp: '5 hours ago',
    description: 'Supply chain disruptions raise concerns about Apple Inc. production capabilities.'
  },
  {
    id: '10',
    headline: 'Microsoft Teams Integration Boosts Enterprise Sales',
    ticker: 'MSFT',
    impact: 'positive',
    timestamp: '9 hours ago',
    description: 'Microsoft Corporation sees strong adoption of integrated productivity solutions.'
  },
  {
    id: '11',
    headline: 'Tesla Autopilot Technology Receives Regulatory Approval',
    ticker: 'TSLA',
    impact: 'positive',
    timestamp: '10 hours ago',
    description: 'Tesla Inc. gains important regulatory milestone for autonomous driving technology.'
  },
  {
    id: '12',
    headline: 'Amazon Web Services Expands Global Data Center Network',
    ticker: 'AMZN',
    impact: 'positive',
    timestamp: '12 hours ago',
    description: 'Amazon.com Inc. strengthens cloud infrastructure with new regional facilities.'
  },
  {
    id: '13',
    headline: 'Google Cloud Revenue Growth Exceeds Analyst Projections',
    ticker: 'GOOGL',
    impact: 'positive',
    timestamp: '11 hours ago',
    description: 'Alphabet Inc. reports strong performance in competitive cloud services market.'
  },
  {
    id: '14',
    headline: 'Meta Reality Labs Division Reports Significant Losses',
    ticker: 'META',
    impact: 'negative',
    timestamp: '13 hours ago',
    description: 'Meta Platforms Inc. faces continued financial challenges in metaverse investments.'
  },
  {
    id: '15',
    headline: 'Netflix Original Content Strategy Shows Promise',
    ticker: 'NFLX',
    impact: 'positive',
    timestamp: '14 hours ago',
    description: 'Netflix Inc. demonstrates value of exclusive content with strong viewer engagement.'
  }
];