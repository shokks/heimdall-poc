/**
 * Enhanced Insight System for Phase II Portfolio Intelligence
 * Provides comprehensive AI-powered insights with categorization, personalization, and real-time analysis
 */

import type { PortfolioPosition } from './storage';
import type {
  EnhancedInsight,
  InsightGenerationContext,
  InsightGenerator,
  PortfolioCharacteristics,
  MarketContext,
  EnhancedNewsItem,
  PortfolioSnapshot,
  InsightCategory,
  InsightPriority,
  InsightImpact,
  TimePeriod,
  InsightData
} from '@/types/insights';

/**
 * Calculate comprehensive portfolio characteristics for personalization
 */
export const analyzePortfolioCharacteristics = (
  portfolio: PortfolioPosition[],
  historicalData?: PortfolioSnapshot[]
): PortfolioCharacteristics => {
  const totalValue = portfolio.reduce((sum, pos) => sum + (pos.totalValue || 0), 0);
  const positionCount = portfolio.length;
  
  // Portfolio size classification
  const size = totalValue < 10000 ? 'small' : totalValue < 100000 ? 'medium' : 'large';
  
  // Diversity analysis
  const largestAllocation = Math.max(...portfolio.map(pos => 
    (pos.totalValue || 0) / totalValue
  ));
  const diversity = largestAllocation > 0.5 ? 'concentrated' : 
    positionCount < 5 ? 'moderate' : 'diversified';
  
  // Risk tolerance estimation based on holdings
  const volatileSymbols = ['TSLA', 'NVDA', 'AMD', 'NFLX', 'SHOP', 'ROKU', 'ZM'];
  const conservativeSymbols = ['AAPL', 'MSFT', 'JNJ', 'PG', 'KO', 'WMT', 'VZ'];
  
  const volatileCount = portfolio.filter(pos => 
    volatileSymbols.includes(pos.symbol)
  ).length;
  const conservativeCount = portfolio.filter(pos => 
    conservativeSymbols.includes(pos.symbol)
  ).length;
  
  const riskTolerance = volatileCount > conservativeCount ? 'aggressive' :
    conservativeCount > volatileCount ? 'conservative' : 'moderate';
  
  // Investment style detection
  const growthSymbols = ['GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
  const valueSymbols = ['BRK.B', 'JPM', 'V', 'WMT', 'HD', 'PG'];
  const dividendSymbols = ['AAPL', 'MSFT', 'JNJ', 'PG', 'KO', 'T', 'VZ'];
  
  const growthCount = portfolio.filter(pos => growthSymbols.includes(pos.symbol)).length;
  const valueCount = portfolio.filter(pos => valueSymbols.includes(pos.symbol)).length;
  const dividendCount = portfolio.filter(pos => dividendSymbols.includes(pos.symbol)).length;
  
  const investmentStyle = 
    growthCount > valueCount && growthCount > dividendCount ? 'growth' :
    valueCount > dividendCount ? 'value' :
    dividendCount > 0 ? 'dividend' : 'mixed';
  
  // Holding period analysis
  const holdingPeriod = historicalData && historicalData.length > 7 ? 'established' : 'new';
  
  return {
    size,
    diversity,
    riskTolerance,
    investmentStyle,
    holdingPeriod
  };
};

/**
 * Get current market context for time-specific insights
 */
export const getMarketContext = (): MarketContext => {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = et.getHours();
  const minute = et.getMinutes();
  const dayOfWeek = et.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpenTime = 9.5; // 9:30 AM
  const marketCloseTime = 16; // 4:00 PM
  const currentTime = hour + minute / 60;
  
  const isMarketHours = !isWeekend && currentTime >= marketOpenTime && currentTime < marketCloseTime;
  
  let marketStatus: 'pre-market' | 'open' | 'after-hours' | 'closed';
  if (isWeekend) {
    marketStatus = 'closed';
  } else if (currentTime < marketOpenTime) {
    marketStatus = 'pre-market';
  } else if (currentTime >= marketOpenTime && currentTime < marketCloseTime) {
    marketStatus = 'open';
  } else {
    marketStatus = 'after-hours';
  }
  
  // Calculate time until market events
  const timeUntilOpen = !isWeekend && currentTime < marketOpenTime ? 
    (marketOpenTime - currentTime) * 60 : undefined;
  const timeUntilClose = isMarketHours ? 
    (marketCloseTime - currentTime) * 60 : undefined;
  
  // Check if it's earnings season (simplified logic)
  const month = et.getMonth();
  const isEarningsSeason = [0, 3, 6, 9].includes(month); // Jan, Apr, Jul, Oct
  
  // Check if it's a holiday week (simplified)
  const isHolidayWeek = false; // Could be enhanced with holiday API
  
  return {
    isMarketHours,
    marketStatus,
    timeUntilOpen,
    timeUntilClose,
    dayOfWeek,
    isEarningsSeason,
    isHolidayWeek
  };
};

/**
 * Calculate enhanced portfolio performance metrics
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

  // Calculate volatility metrics
  const dailyChanges = portfolio.map(pos => {
    const change = parseFloat(pos.dailyChangePercent?.replace('%', '') || '0');
    return Math.abs(change);
  });
  const averageVolatility = dailyChanges.length > 0 ? 
    dailyChanges.reduce((sum, change) => sum + change, 0) / dailyChanges.length : 0;
  
  // Calculate concentration risk
  const allocationPercentages = portfolio.map(pos => (pos.totalValue || 0) / totalValue);
  const concentrationRisk = Math.max(...allocationPercentages);
  
  return {
    totalValue,
    totalChange,
    changePercent,
    biggestMover,
    largestPosition,
    positionCount: portfolio.length,
    hasValidPrices: portfolio.some(pos => pos.currentPrice),
    averageVolatility,
    concentrationRisk
  };
};

/**
 * Performance Insight Generator
 */
class PerformanceInsightGenerator implements InsightGenerator {
  category: InsightCategory = 'performance';
  name = 'Portfolio Performance Analysis';
  priority = 100;
  minConfidence = 0.7;

  canGenerate(context: InsightGenerationContext): boolean {
    return context.portfolio.length > 0 && 
           context.portfolio.some(pos => pos.currentPrice);
  }

  async generate(context: InsightGenerationContext): Promise<EnhancedInsight[]> {
    const insights: EnhancedInsight[] = [];
    const metrics = calculatePortfolioMetrics(context.portfolio);
    
    // Daily performance insight
    if (metrics.hasValidPrices && metrics.totalValue > 0) {
      const isPositive = metrics.totalChange > 0;
      const absChange = Math.abs(metrics.totalChange);
      const absPercent = Math.abs(metrics.changePercent);
      const impact: InsightImpact = absPercent > 5 ? (isPositive ? 'positive' : 'negative') :
                                   absPercent > 2 ? (isPositive ? 'positive' : 'warning') : 'neutral';
      
      insights.push({
        id: 'daily-performance',
        category: 'performance',
        priority: absPercent > 3 ? 'high' : 'medium',
        title: isPositive ? 'Strong Portfolio Performance' : 'Portfolio Decline Today',
        description: `Your portfolio ${isPositive ? 'gained' : 'lost'} $${absChange.toFixed(2)} (${absPercent.toFixed(1)}%) today. ${this.getPerformanceContext(absPercent, isPositive, context.marketContext)}`,
        impact,
        timePeriod: 'daily',
        isActionable: absPercent > 5,
        relevanceScore: Math.min(100, absPercent * 10),
        confidenceLevel: 0.9,
        data: {
          value: metrics.totalChange,
          percentage: metrics.changePercent,
          timeframe: 'daily',
          trend: isPositive ? 'improving' : 'declining',
          actionRequired: absPercent > 5,
          actionType: absPercent > 5 ? 'review' : 'monitor'
        },
        generatedAt: new Date(),
        dataSource: 'realtime',
        version: '1.0'
      });
    }

    // Biggest mover insight
    if (metrics.biggestMover && metrics.biggestMover.dailyChangePercent) {
      const changePercent = parseFloat(metrics.biggestMover.dailyChangePercent.replace('%', ''));
      const isPositive = changePercent > 0;
      const impact: InsightImpact = Math.abs(changePercent) > 5 ? (isPositive ? 'positive' : 'negative') : 'neutral';
      
      insights.push({
        id: 'biggest-mover',
        category: 'performance',
        priority: Math.abs(changePercent) > 10 ? 'high' : 'medium',
        title: `${metrics.biggestMover.companyName} Leading ${isPositive ? 'Gains' : 'Declines'}`,
        description: `${metrics.biggestMover.companyName} (${metrics.biggestMover.symbol}) moved ${isPositive ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(1)}% today, ${this.getMoverImpactDescription(changePercent, metrics.biggestMover, metrics.totalValue)}`,
        impact,
        timePeriod: 'daily',
        isActionable: Math.abs(changePercent) > 10,
        relevanceScore: Math.min(100, Math.abs(changePercent) * 5),
        confidenceLevel: 0.85,
        data: {
          symbol: metrics.biggestMover.symbol,
          companyName: metrics.biggestMover.companyName,
          percentage: changePercent,
          value: (metrics.biggestMover.totalValue || 0) * (changePercent / 100),
          actionRequired: Math.abs(changePercent) > 10,
          actionType: Math.abs(changePercent) > 10 ? 'investigate' : 'monitor'
        },
        generatedAt: new Date(),
        dataSource: 'realtime',
        version: '1.0'
      });
    }

    return insights;
  }

  private getPerformanceContext(percent: number, isPositive: boolean, marketContext: MarketContext): string {
    if (percent > 5) {
      return isPositive ? 
        'This is a significant gain that may warrant review of your position sizes.' :
        'This decline warrants closer monitoring of your holdings.';
    }
    if (marketContext.isMarketHours) {
      return 'Market is currently open - consider monitoring for additional changes.';
    }
    return 'Performance reflects recent market activity.';
  }

  private getMoverImpactDescription(changePercent: number, position: any, totalValue: number): string {
    const allocation = ((position.totalValue || 0) / totalValue) * 100;
    const portfolioImpact = allocation * Math.abs(changePercent) / 100;
    
    if (portfolioImpact > 2) {
      return `significantly ${changePercent > 0 ? 'boosting' : 'impacting'} your portfolio (${portfolioImpact.toFixed(1)}% impact).`;
    }
    return `contributing ${portfolioImpact.toFixed(1)}% to portfolio movement.`;
  }
}

/**
 * News-Based Insight Generator
 */
class NewsInsightGenerator implements InsightGenerator {
  category: InsightCategory = 'news';
  name = 'News Impact Analysis';
  priority = 90;
  minConfidence = 0.6;

  canGenerate(context: InsightGenerationContext): boolean {
    return context.recentNews.length > 0;
  }

  async generate(context: InsightGenerationContext): Promise<EnhancedInsight[]> {
    const insights: EnhancedInsight[] = [];
    const news = context.recentNews;
    
    // Analyze news sentiment
    const positiveNews = news.filter(n => n.impact === 'positive');
    const negativeNews = news.filter(n => n.impact === 'negative');
    const totalNews = positiveNews.length + negativeNews.length;
    
    if (totalNews > 0) {
      const sentimentScore = (positiveNews.length - negativeNews.length) / totalNews;
      const dominantSentiment = sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'mixed';
      
      insights.push({
        id: 'news-sentiment',
        category: 'news',
        priority: Math.abs(sentimentScore) > 0.5 ? 'high' : 'medium',
        title: `${dominantSentiment === 'positive' ? 'Positive' : dominantSentiment === 'negative' ? 'Negative' : 'Mixed'} News Environment`,
        description: this.getNewsSentimentDescription(positiveNews.length, negativeNews.length, dominantSentiment),
        impact: dominantSentiment === 'positive' ? 'positive' : dominantSentiment === 'negative' ? 'negative' : 'neutral',
        timePeriod: 'daily',
        isActionable: Math.abs(sentimentScore) > 0.5,
        relevanceScore: Math.min(100, totalNews * 10),
        confidenceLevel: Math.min(1, totalNews / 10),
        data: {
          newsCount: totalNews,
          sentimentAverage: sentimentScore,
          relevanceScore: news.reduce((sum, n) => sum + (n.relevanceScore || 0), 0) / news.length,
          actionRequired: Math.abs(sentimentScore) > 0.5,
          actionType: 'monitor'
        },
        generatedAt: new Date(),
        dataSource: 'news',
        version: '1.0'
      });
    }

    // High-impact news insight
    const highImpactNews = news.filter(n => (n.relevanceScore || 0) > 80);
    if (highImpactNews.length > 0) {
      const topNews = highImpactNews[0];
      insights.push({
        id: 'high-impact-news',
        category: 'news',
        priority: 'high',
        title: 'Breaking News Alert',
        description: `${topNews.headline}. This news directly affects ${topNews.relatedSymbols.join(', ')} in your portfolio.`,
        impact: topNews.impact as InsightImpact,
        timePeriod: 'realtime',
        isActionable: true,
        relevanceScore: topNews.relevanceScore || 0,
        confidenceLevel: 0.8,
        data: {
          symbols: topNews.relatedSymbols,
          newsCount: 1,
          relevanceScore: topNews.relevanceScore,
          actionRequired: true,
          actionType: 'review',
          urgency: 'immediate'
        },
        generatedAt: new Date(),
        dataSource: 'news',
        version: '1.0'
      });
    }

    return insights;
  }

  private getNewsSentimentDescription(positive: number, negative: number, sentiment: string): string {
    if (sentiment === 'positive') {
      return `Recent news shows ${positive} positive stories affecting your holdings, with market sentiment favoring your positions.`;
    }
    if (sentiment === 'negative') {
      return `${negative} negative news stories are impacting your holdings. Consider monitoring developments closely.`;
    }
    return `Mixed news signals with ${positive} positive and ${negative} negative stories. Monitor individual positions for specific impacts.`;
  }
}

/**
 * Risk Analysis Insight Generator
 */
class RiskInsightGenerator implements InsightGenerator {
  category: InsightCategory = 'risk';
  name = 'Risk Assessment';
  priority = 80;
  minConfidence = 0.7;

  canGenerate(context: InsightGenerationContext): boolean {
    return context.portfolio.length > 0;
  }

  async generate(context: InsightGenerationContext): Promise<EnhancedInsight[]> {
    const insights: EnhancedInsight[] = [];
    const metrics = calculatePortfolioMetrics(context.portfolio);
    const characteristics = context.portfolioCharacteristics;
    
    // Concentration risk insight
    if (metrics.concentrationRisk > 0.4) {
      const largestPosition = metrics.largestPosition;
      const allocation = (metrics.concentrationRisk * 100);
      
      insights.push({
        id: 'concentration-risk',
        category: 'risk',
        priority: allocation > 60 ? 'critical' : 'high',
        title: 'Portfolio Concentration Warning',
        description: `${largestPosition.companyName} represents ${allocation.toFixed(1)}% of your portfolio. ${this.getConcentrationAdvice(allocation, characteristics.riskTolerance)}`,
        impact: 'warning',
        timePeriod: 'daily',
        isActionable: true,
        relevanceScore: Math.min(100, allocation),
        confidenceLevel: 0.9,
        data: {
          symbol: largestPosition.symbol,
          companyName: largestPosition.companyName,
          percentage: allocation,
          concentrationRisk: metrics.concentrationRisk,
          actionRequired: true,
          actionType: 'rebalance',
          urgency: allocation > 60 ? 'immediate' : 'this_month'
        },
        generatedAt: new Date(),
        dataSource: 'calculated',
        version: '1.0'
      });
    }

    // Volatility insight
    if (metrics.averageVolatility > 3) {
      insights.push({
        id: 'high-volatility',
        category: 'risk',
        priority: 'medium',
        title: 'High Portfolio Volatility',
        description: `Your portfolio shows above-average volatility (${metrics.averageVolatility.toFixed(1)}% daily average). ${this.getVolatilityAdvice(characteristics.riskTolerance)}`,
        impact: 'warning',
        timePeriod: 'daily',
        isActionable: characteristics.riskTolerance === 'conservative',
        relevanceScore: Math.min(100, metrics.averageVolatility * 10),
        confidenceLevel: 0.75,
        data: {
          volatility: metrics.averageVolatility,
          actionRequired: characteristics.riskTolerance === 'conservative',
          actionType: 'review',
          urgency: 'this_week'
        },
        generatedAt: new Date(),
        dataSource: 'calculated',
        version: '1.0'
      });
    }

    return insights;
  }

  private getConcentrationAdvice(allocation: number, riskTolerance: string): string {
    if (allocation > 60) {
      return 'Consider immediate diversification to reduce single-stock risk.';
    }
    if (riskTolerance === 'conservative') {
      return 'For conservative investors, consider reducing to under 25% allocation.';
    }
    return 'Monitor this concentration and consider gradual rebalancing.';
  }

  private getVolatilityAdvice(riskTolerance: string): string {
    if (riskTolerance === 'conservative') {
      return 'Consider adding more stable, dividend-paying stocks to reduce volatility.';
    }
    return 'Monitor position sizes during high volatility periods.';
  }
}

/**
 * Opportunity Insight Generator
 */
class OpportunityInsightGenerator implements InsightGenerator {
  category: InsightCategory = 'opportunity';
  name = 'Investment Opportunities';
  priority = 70;
  minConfidence = 0.6;

  canGenerate(context: InsightGenerationContext): boolean {
    return context.portfolio.length > 0;
  }

  async generate(context: InsightGenerationContext): Promise<EnhancedInsight[]> {
    const insights: EnhancedInsight[] = [];
    const characteristics = context.portfolioCharacteristics;
    const portfolio = context.portfolio;
    
    // Diversification opportunity
    if (characteristics.diversity !== 'diversified' && portfolio.length < 10) {
      insights.push({
        id: 'diversification-opportunity',
        category: 'opportunity',
        priority: 'medium',
        title: 'Diversification Opportunity',
        description: `With ${portfolio.length} holdings, consider diversifying across different sectors. ${this.getDiversificationAdvice(characteristics)}`,
        impact: 'positive',
        timePeriod: 'monthly',
        isActionable: true,
        relevanceScore: 60,
        confidenceLevel: 0.7,
        data: {
          value: portfolio.length,
          actionRequired: true,
          actionType: 'review',
          urgency: 'when_convenient'
        },
        generatedAt: new Date(),
        dataSource: 'calculated',
        version: '1.0'
      });
    }

    // Rebalancing opportunity based on historical data
    if (context.historicalData.length > 7) {
      const weekAgo = context.historicalData[context.historicalData.length - 7];
      const current = context.historicalData[context.historicalData.length - 1];
      const weeklyChange = ((current.totalValue - weekAgo.totalValue) / weekAgo.totalValue) * 100;
      
      if (Math.abs(weeklyChange) > 10) {
        insights.push({
          id: 'rebalancing-opportunity',
          category: 'opportunity',
          priority: 'medium',
          title: 'Rebalancing Review Suggested',
          description: `Your portfolio has ${weeklyChange > 0 ? 'gained' : 'declined'} ${Math.abs(weeklyChange).toFixed(1)}% this week. Consider reviewing your allocation targets.`,
          impact: 'neutral',
          timePeriod: 'weekly',
          isActionable: true,
          relevanceScore: Math.min(100, Math.abs(weeklyChange) * 5),
          confidenceLevel: 0.8,
          data: {
            percentage: weeklyChange,
            timeframe: 'weekly',
            actionRequired: true,
            actionType: 'rebalance',
            urgency: 'this_month'
          },
          generatedAt: new Date(),
          dataSource: 'historical',
          version: '1.0'
        });
      }
    }

    return insights;
  }

  private getDiversificationAdvice(characteristics: PortfolioCharacteristics): string {
    switch (characteristics.investmentStyle) {
      case 'growth':
        return 'Consider adding some value or dividend stocks for balance.';
      case 'value':
        return 'Consider adding some growth stocks for potential upside.';
      case 'dividend':
        return 'Consider adding some growth stocks to boost total returns.';
      default:
        return 'Consider spreading across different market sectors and company sizes.';
    }
  }
}

/**
 * Market Context Insight Generator
 */
class MarketInsightGenerator implements InsightGenerator {
  category: InsightCategory = 'market';
  name = 'Market Context Analysis';
  priority = 60;
  minConfidence = 0.5;

  canGenerate(context: InsightGenerationContext): boolean {
    return true; // Can always provide market context
  }

  async generate(context: InsightGenerationContext): Promise<EnhancedInsight[]> {
    const insights: EnhancedInsight[] = [];
    const marketContext = context.marketContext;
    
    // Market hours insight
    if (marketContext.timeUntilOpen && marketContext.timeUntilOpen < 60) {
      insights.push({
        id: 'market-opening',
        category: 'market',
        priority: 'medium',
        title: 'Market Opening Soon',
        description: `The market opens in ${Math.round(marketContext.timeUntilOpen)} minutes. Consider reviewing any overnight news that might affect your holdings.`,
        impact: 'neutral',
        timePeriod: 'realtime',
        isActionable: true,
        relevanceScore: 70,
        confidenceLevel: 1.0,
        data: {
          value: marketContext.timeUntilOpen,
          actionRequired: true,
          actionType: 'monitor',
          urgency: 'immediate'
        },
        generatedAt: new Date(),
        dataSource: 'realtime',
        version: '1.0'
      });
    }

    // Earnings season insight
    if (marketContext.isEarningsSeason) {
      insights.push({
        id: 'earnings-season',
        category: 'market',
        priority: 'medium',
        title: 'Earnings Season Active',
        description: 'It\'s earnings season. Monitor your holdings for earnings announcements which can cause significant price movements.',
        impact: 'neutral',
        timePeriod: 'monthly',
        isActionable: true,
        relevanceScore: 60,
        confidenceLevel: 1.0,
        data: {
          actionRequired: true,
          actionType: 'monitor',
          urgency: 'this_week'
        },
        generatedAt: new Date(),
        dataSource: 'calculated',
        version: '1.0'
      });
    }

    return insights;
  }
}

// Insight generators registry
const insightGenerators: InsightGenerator[] = [
  new PerformanceInsightGenerator(),
  new NewsInsightGenerator(),
  new RiskInsightGenerator(),
  new OpportunityInsightGenerator(),
  new MarketInsightGenerator()
];

/**
 * Generate enhanced portfolio insights using multiple generators
 */
export const generateEnhancedInsights = async (
  context: InsightGenerationContext
): Promise<EnhancedInsight[]> => {
  const allInsights: EnhancedInsight[] = [];
  
  // Run all insight generators
  for (const generator of insightGenerators) {
    try {
      if (generator.canGenerate(context)) {
        const insights = await generator.generate(context);
        allInsights.push(...insights);
      }
    } catch (error) {
      console.error(`Error generating ${generator.category} insights:`, error);
    }
  }
  
  // Sort by priority and relevance
  allInsights.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    return b.relevanceScore - a.relevanceScore;
  });
  
  // Limit insights based on user preferences
  const maxInsights = context.userPreferences?.maxInsights || 5;
  return allInsights.slice(0, maxInsights);
};

/**
 * Safely convert Unix timestamp to ISO string with proper error handling
 */
const safeTimestampConversion = (datetime: any): string => {
  try {
    // Check if datetime exists and is a valid number
    if (!datetime || typeof datetime !== 'number' || isNaN(datetime)) {
      console.warn('Invalid datetime value:', datetime, 'using current time as fallback');
      return new Date().toISOString();
    }
    
    // Validate that it's a reasonable timestamp (not too far in past/future)
    const date = new Date(datetime * 1000);
    
    // Check if the resulting date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date conversion for datetime:', datetime, 'using current time as fallback');
      return new Date().toISOString();
    }
    
    // Check if date is reasonable (between 2000 and 2030)
    const year = date.getFullYear();
    if (year < 2000 || year > 2030) {
      console.warn('Unreasonable date year:', year, 'for datetime:', datetime, 'using current time as fallback');
      return new Date().toISOString();
    }
    
    return date.toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', datetime, error);
    return new Date().toISOString();
  }
};

/**
 * Convert Finnhub news to enhanced news format
 */
export const convertToEnhancedNews = (
  finnhubNews: any[],
  portfolio: PortfolioPosition[]
): EnhancedNewsItem[] => {
  const portfolioSymbols = portfolio.map(pos => pos.symbol);
  
  return finnhubNews.map(item => ({
    id: item.id?.toString() || Math.random().toString(),
    headline: item.headline || '',
    summary: item.summary || '',
    timestamp: safeTimestampConversion(item.datetime),
    relatedSymbols: item.related ? item.related.split(',').map((s: string) => s.trim()) : [],
    impact: item.impact || 'neutral',
    source: item.source || '',
    url: item.url || '',
    image: item.image,
    category: item.category,
    relevanceScore: item.relevanceScore,
    sentimentScore: item.sentimentScore || 0,
    confidenceLevel: item.confidenceLevel || 0.5
  })).filter(item => 
    item.relatedSymbols.some((symbol: string) => portfolioSymbols.includes(symbol))
  );
};

/**
 * Create insight generation context from available data
 */
export const createInsightContext = (
  portfolio: PortfolioPosition[],
  recentNews: EnhancedNewsItem[] = [],
  historicalData: PortfolioSnapshot[] = [],
  previousInsights?: EnhancedInsight[]
): InsightGenerationContext => {
  return {
    portfolio,
    portfolioCharacteristics: analyzePortfolioCharacteristics(portfolio, historicalData),
    marketContext: getMarketContext(),
    recentNews,
    historicalData,
    previousInsights
  };
};

/**
 * Get insights with caching support
 */
const insightCache = new Map<string, { insights: EnhancedInsight[], timestamp: number }>();
const INSIGHT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedInsights = async (
  context: InsightGenerationContext
): Promise<EnhancedInsight[]> => {
  const cacheKey = JSON.stringify({
    portfolioSymbols: context.portfolio.map(p => p.symbol).sort(),
    totalValue: context.portfolio.reduce((sum, p) => sum + (p.totalValue || 0), 0),
    marketHour: Math.floor(Date.now() / (60 * 60 * 1000)) // Cache by hour
  });
  
  const cached = insightCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_DURATION) {
    return cached.insights;
  }
  
  const insights = await generateEnhancedInsights(context);
  insightCache.set(cacheKey, { insights, timestamp: Date.now() });
  
  return insights;
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