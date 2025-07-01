import { NextRequest, NextResponse } from 'next/server';

// Cache interface for storing news data
interface NewsCache {
  data: FinnhubNewsItem[];
  timestamp: number;
  portfolioSymbols: string;
}

// Finnhub news item interface
export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// Processed news item interface matching our existing structure
export interface ProcessedNewsItem {
  id: string;
  headline: string;
  summary: string;
  timestamp: string;
  relatedSymbols: string[];
  impact: 'positive' | 'negative' | 'neutral';
  source: string;
  url: string;
  image?: string;
  category?: string;
  relevanceScore?: number;
}

// In-memory cache with 5-minute expiration
const newsCache = new Map<string, NewsCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Keywords for impact analysis
const POSITIVE_KEYWORDS = [
  'beats', 'exceeds', 'surges', 'grows', 'increases', 'rises', 'gains', 'up',
  'strong', 'record', 'high', 'best', 'profit', 'revenue', 'partnership',
  'acquisition', 'launch', 'breakthrough', 'success', 'wins', 'approved'
];

const NEGATIVE_KEYWORDS = [
  'falls', 'drops', 'declines', 'loses', 'down', 'weak', 'low', 'worst',
  'loss', 'cuts', 'reduces', 'delays', 'cancels', 'lawsuit', 'investigation',
  'fine', 'penalty', 'cyber', 'hack', 'breach', 'recalls', 'bankruptcy'
];

const EARNINGS_KEYWORDS = [
  'earnings', 'quarterly', 'q1', 'q2', 'q3', 'q4', 'revenue', 'profit',
  'eps', 'guidance', 'forecast', 'outlook', 'results'
];

const PRODUCT_KEYWORDS = [
  'launch', 'announces', 'unveils', 'introduces', 'releases', 'product',
  'service', 'feature', 'update', 'version'
];

const MARKET_KEYWORDS = [
  'market', 'stock', 'shares', 'trading', 'price', 'valuation', 'ipo',
  'listing', 'merger', 'acquisition', 'buyback'
];

const REGULATORY_KEYWORDS = [
  'regulation', 'regulatory', 'sec', 'ftc', 'fda', 'antitrust', 'compliance',
  'investigation', 'lawsuit', 'court', 'legal', 'fine', 'penalty'
];

function analyzeImpact(headline: string, summary: string): 'positive' | 'negative' | 'neutral' {
  const text = (headline + ' ' + summary).toLowerCase();
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  POSITIVE_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) positiveScore++;
  });
  
  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) negativeScore++;
  });
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

function categorizeNews(headline: string, summary: string): string {
  const text = (headline + ' ' + summary).toLowerCase();
  
  if (EARNINGS_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'earnings';
  }
  if (PRODUCT_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'product';
  }
  if (REGULATORY_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'regulatory';
  }
  if (MARKET_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'market';
  }
  
  return 'general';
}

function calculateRelevanceScore(
  newsItem: FinnhubNewsItem,
  portfolioSymbols: string[],
  portfolioWeights: Map<string, number>
): number {
  let score = 0;
  
  // Base recency score (newer is better)
  const now = Date.now() / 1000;
  const ageInHours = (now - newsItem.datetime) / 3600;
  const recencyScore = Math.max(0, 24 - ageInHours) / 24; // Full score for news < 24hrs old
  score += recencyScore * 10;
  
  // Portfolio relevance score
  const relatedSymbols = newsItem.related.split(',').filter(s => s.trim());
  for (const symbol of relatedSymbols) {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (portfolioSymbols.includes(cleanSymbol)) {
      const weight = portfolioWeights.get(cleanSymbol) || 1;
      score += weight * 5; // Base relevance score multiplied by portfolio weight
    }
  }
  
  // Impact boost
  const impact = analyzeImpact(newsItem.headline, newsItem.summary);
  if (impact === 'positive' || impact === 'negative') {
    score += 3;
  }
  
  // Category boost for important news types
  const category = categorizeNews(newsItem.headline, newsItem.summary);
  if (category === 'earnings') {
    score += 5;
  } else if (category === 'regulatory') {
    score += 4;
  } else if (category === 'product') {
    score += 2;
  }
  
  return score;
}

async function fetchCompanyNews(symbol: string): Promise<FinnhubNewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    throw new Error('Finnhub API key not configured');
  }
  
  // Fetch news for the last 7 days
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  
  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = toDate.toISOString().split('T')[0];
  
  const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromStr}&to=${toStr}&token=${apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Finnhub API error: ${response.status}`);
  }
  
  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const portfolioParam = searchParams.get('portfolio');
    
    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Portfolio symbols are required' },
        { status: 400 }
      );
    }
    
    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
    
    // Parse portfolio weights if provided
    const portfolioWeights = new Map<string, number>();
    if (portfolioParam) {
      try {
        const portfolio = JSON.parse(portfolioParam);
        portfolio.forEach((position: any) => {
          const weight = Math.log(position.shares + 1); // Logarithmic weighting
          portfolioWeights.set(position.symbol.toUpperCase(), weight);
        });
      } catch (e) {
        console.warn('Failed to parse portfolio data:', e);
      }
    }
    
    // Check cache
    const cacheKey = symbols.sort().join(',');
    const cached = newsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // Return cached data, but still process it with current portfolio weights
      const processedNews = cached.data.map(item => processNewsItem(item, symbols, portfolioWeights));
      return NextResponse.json({
        news: processedNews.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)),
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch fresh news for each symbol
    const allNewsPromises = symbols.map(symbol => 
      fetchCompanyNews(symbol).catch(error => {
        console.error(`Failed to fetch news for ${symbol}:`, error);
        return [];
      })
    );
    
    const newsResults = await Promise.all(allNewsPromises);
    const allNews = newsResults.flat();
    
    // Remove duplicates based on news ID
    const uniqueNews = Array.from(
      new Map(allNews.map(item => [item.id, item])).values()
    );
    
    // Cache the raw data
    newsCache.set(cacheKey, {
      data: uniqueNews,
      timestamp: Date.now(),
      portfolioSymbols: cacheKey
    });
    
    // Process and score news items
    const processedNews = uniqueNews.map(item => 
      processNewsItem(item, symbols, portfolioWeights)
    );
    
    // Sort by relevance score
    const sortedNews = processedNews.sort((a, b) => 
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
    
    return NextResponse.json({
      news: sortedNews,
      cached: false,
      timestamp: new Date().toISOString(),
      count: sortedNews.length
    });
    
  } catch (error) {
    console.error('Financial news API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch financial news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function processNewsItem(
  item: FinnhubNewsItem,
  portfolioSymbols: string[],
  portfolioWeights: Map<string, number>
): ProcessedNewsItem {
  const relatedSymbols = item.related 
    ? item.related.split(',').map(s => s.trim()).filter(s => s)
    : [];
  
  const impact = analyzeImpact(item.headline, item.summary);
  const category = categorizeNews(item.headline, item.summary);
  const relevanceScore = calculateRelevanceScore(item, portfolioSymbols, portfolioWeights);
  
  return {
    id: item.id.toString(),
    headline: item.headline,
    summary: item.summary,
    timestamp: new Date(item.datetime * 1000).toISOString(),
    relatedSymbols,
    impact,
    source: item.source,
    url: item.url,
    image: item.image || undefined,
    category,
    relevanceScore
  };
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cache] of newsCache.entries()) {
    if (now - cache.timestamp > CACHE_DURATION * 2) {
      newsCache.delete(key);
    }
  }
}, CACHE_DURATION);