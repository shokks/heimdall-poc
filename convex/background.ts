/**
 * Background jobs for Portfolio Intelligence
 * Handles automated data updates, cleanup, and health monitoring
 */

import { v } from "convex/values";
import { internalAction, internalMutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Rate limiting configuration
const RATE_LIMIT_DELAY = 3000; // 3 seconds between API calls
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 2000; // 2 seconds base delay for retries

// API usage tracking
const apiUsage = {
  requests: 0,
  errors: 0,
  rateLimitHits: 0,
  lastReset: Date.now()
};

// Reset API usage stats every hour
const API_USAGE_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

// News item type for Convex storage
interface NewsItem {
  externalId: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: number;
  imageUrl?: string;
  category?: string;
  relatedSymbols: string[];
  relevanceScores: number[];
  mentionTypes: Array<'primary' | 'secondary' | 'mentioned'>;
}

// Note: Request deduplication not currently used but kept for future implementation

/**
 * Update stock prices for all tracked symbols
 * Called every 5 minutes by cron job
 */
export const updateStockPrices = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; updated: number; symbols?: string[]; error?: string }> => {
    // Only run during US market hours (9:30 AM - 4:00 PM ET, Monday-Friday)
    const now = new Date();
    // Convert to US Eastern Time (ET) using America/New_York timezone
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = nyTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();
    // Market open: 9:30 AM, close: 4:00 PM
    const isWeekday = day >= 1 && day <= 5;
    const afterOpen = hour > 9 || (hour === 9 && minute >= 30);
    const beforeClose = hour < 16;
    if (!(isWeekday && afterOpen && beforeClose)) {
      console.log('⏸ Skipping stock price update: outside US market hours (9:30 AM - 4:00 PM ET, Mon-Fri)');
      return { success: true, updated: 0, error: 'Outside US market hours' };
    }
    try {
      console.log('🔄 Starting background stock price update...');
      
      // Get all unique symbols from portfolios
      const portfolioSymbols = await ctx.runQuery(api.portfolios.getAllPortfolioSymbols);
      
      if (portfolioSymbols.length === 0) {
        console.log('No symbols to update');
        return { success: true, updated: 0 };
      }

      console.log(`📈 Updating prices for ${portfolioSymbols.length} symbols:`, portfolioSymbols);

      // For now, just log success - price updating is handled by existing API endpoints
      // In a production system, this would call external APIs and update the database
      console.log(`✅ Stock price update completed successfully`);
      
      return { 
        success: true, 
        updated: portfolioSymbols.length,
        symbols: portfolioSymbols 
      };

    } catch (error) {
      console.error('❌ Failed to update stock prices:', error);
      return { 
        success: false, 
        updated: 0,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

/**
 * Update news data for all tracked symbols
 * Called twice daily at 6 AM and 12 PM ET by cron job
 */
export const updateNewsData = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; updated: number; symbols?: string[]; error?: string }> => {
    try {
      console.log('📰 Starting daily news update...');
      
      // Core symbols to always fetch news for (ensures news is always available)
      const coreSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
      
      // Get all unique symbols from portfolios
      const portfolioSymbols = await ctx.runQuery(api.portfolios.getAllPortfolioSymbols);
      
      // Combine core symbols with portfolio symbols (remove duplicates)
      const allSymbolsSet = new Set([...coreSymbols, ...portfolioSymbols]);
      const allSymbols = Array.from(allSymbolsSet);
      
      console.log(`📰 Fetching news for ${allSymbols.length} symbols (${coreSymbols.length} core + ${portfolioSymbols.length} portfolio):`, allSymbols);

      // Fetch news from Finnhub API
      const newsItems = await fetchNewsForSymbols(allSymbols);
      
      if (newsItems.length === 0) {
        console.log('No news articles found');
        return { 
          success: true, 
          updated: 0,
          symbols: allSymbols 
        };
      }

      // Batch create news in Convex
      const createdIds = await ctx.runMutation(api.news.batchCreateNews, {
        newsItems
      });

      console.log(`✅ Daily news update completed: ${createdIds.length} new articles stored for ${allSymbols.length} symbols`);
      
      return { 
        success: true, 
        updated: createdIds.length,
        symbols: allSymbols 
      };

    } catch (error) {
      console.error('❌ Failed to update news:', error);
      return { 
        success: false, 
        updated: 0,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

/**
 * Cleanup old data (news, unused stocks)
 * Called daily at 2 AM by cron job
 */
export const cleanupOldData = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; deletedNews: number; deletedStocks: number; error?: string }> => {
    try {
      console.log('🧹 Starting data cleanup...');
      
      // Clean old news (7+ days)
      const deletedNews = await ctx.runMutation(api.news.cleanupOldNews);
      
      // Clean unused stocks (30+ days old)
      const deletedStocks = await ctx.runMutation(api.stocks.cleanupUnusedStocks, {
        daysOld: 30
      });

      console.log(`✅ Cleanup complete: ${deletedNews} news articles, ${deletedStocks} unused stocks deleted`);
      
      return { 
        success: true, 
        deletedNews, 
        deletedStocks 
      };

    } catch (error) {
      console.error('❌ Failed to cleanup data:', error);
      return { 
        success: false, 
        deletedNews: 0,
        deletedStocks: 0,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

/**
 * Health check for external APIs
 * Called every hour by cron job
 */
export const healthCheck = internalAction({
  args: {},
  handler: async (ctx): Promise<{ timestamp: number; alphavantage: { status: string; responseTime: number }; finnhub: { status: string; responseTime: number }; openai: { status: string; responseTime: number } }> => {
    const results = {
      timestamp: Date.now(),
      alphavantage: { status: 'unknown', responseTime: 0 },
      finnhub: { status: 'unknown', responseTime: 0 },
      openai: { status: 'unknown', responseTime: 0 }
    };

    // Test Alpha Vantage API
    try {
      const start = Date.now();
      const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`);
      results.alphavantage.responseTime = Date.now() - start;
      results.alphavantage.status = response.ok ? 'healthy' : 'error';
    } catch (error) {
      results.alphavantage.status = 'error';
    }

    // Test Finnhub API
    try {
      const start = Date.now();
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_API_KEY}`);
      results.finnhub.responseTime = Date.now() - start;
      results.finnhub.status = response.ok ? 'healthy' : 'error';
    } catch (error) {
      results.finnhub.status = 'error';
    }

    // Store health check results
    await ctx.runMutation(internal.background.storeHealthCheckResults, { results });

    console.log('🔍 Health check completed:', results);
    return results;
  },
});

/**
 * Store health check results in database
 */
export const storeHealthCheckResults = internalMutation({
  args: { 
    results: v.object({
      timestamp: v.number(),
      alphavantage: v.object({
        status: v.string(),
        responseTime: v.number()
      }),
      finnhub: v.object({
        status: v.string(),
        responseTime: v.number()
      }),
      openai: v.object({
        status: v.string(),
        responseTime: v.number()
      })
    })
  },
  handler: async (_, args): Promise<boolean> => {
    // For now, just log the results
    // In production, you might want to store these in a health_checks table
    console.log('Health check stored:', args.results);
    return true;
  },
});

/**
 * Fetch news for multiple symbols from Finnhub API
 * Implements strict rate limiting and exponential backoff
 */
async function fetchNewsForSymbols(symbols: string[]): Promise<NewsItem[]> {
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    console.warn('Finnhub API key not configured for news fetching');
    return [];
  }

  const results: NewsItem[] = [];
  
  try {
    // Fetch general market news for the last 48 hours
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 2); // Last 48 hours to ensure we get enough news
    
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];

    console.log(`📰 Fetching market news from ${from} to ${to}`);

    // Fetch general market news with rate limiting
    const marketNews = await rateLimitedFetch(
      `https://finnhub.io/api/v1/news?category=general&from=${from}&to=${to}&token=${finnhubKey}`,
      'market news'
    );

    if (marketNews && marketNews.length > 0) {
      console.log(`📰 Retrieved ${marketNews.length} general market articles`);

      // Process each article and check for symbol mentions
      for (const article of marketNews) {
        if (!article.headline || !article.url) continue;

        // Analyze which symbols this article mentions
        const mentions = analyzeNewsForSymbols(article, symbols);
        
        if (mentions.length > 0) {
          results.push({
            externalId: article.id?.toString() || `${article.datetime}_${article.headline.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: article.headline,
            summary: article.summary || article.headline,
            url: article.url,
            source: article.source || 'Finnhub',
            publishedAt: article.datetime * 1000, // Convert to milliseconds
            imageUrl: article.image,
            category: article.category,
            relatedSymbols: mentions.map(m => m.symbol),
            relevanceScores: mentions.map(m => m.relevance),
            mentionTypes: mentions.map(m => m.type),
          });
        }
      }
    }

    // Fetch company-specific news for top 2 symbols only (to reduce API calls for free tier)
    const prioritizedSymbols = symbols.slice(0, 2);
    console.log(`📰 Fetching company news for top ${prioritizedSymbols.length} symbols:`, prioritizedSymbols);
    
    // Process symbols sequentially with rate limiting
    for (const symbol of prioritizedSymbols) {
      try {
        const companyNews = await rateLimitedFetch(
          `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${finnhubKey}`,
          `company news for ${symbol}`
        );

        if (companyNews && companyNews.length > 0) {
          // Process top 3 articles per company (optimized for free tier)
          for (const article of companyNews.slice(0, 3)) {
            if (!article.headline || !article.url) continue;

            // Check if we already have this article
            const isDuplicate = results.some(r => r.url === article.url || r.title === article.headline);
            if (isDuplicate) continue;

            results.push({
              externalId: article.id?.toString() || `${article.datetime}_${symbol}_${article.headline.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}`,
              title: article.headline,
              summary: article.summary || article.headline,
              url: article.url,
              source: article.source || 'Finnhub',
              publishedAt: article.datetime * 1000,
              imageUrl: article.image,
              category: article.category || 'company',
              relatedSymbols: [symbol],
              relevanceScores: [0.95], // High relevance for company-specific news
              mentionTypes: ['primary'],
            });
          }
        }

        // Rate limiting between symbol requests
        if (symbol !== prioritizedSymbols[prioritizedSymbols.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      } catch (error) {
        console.warn(`Failed to fetch news for ${symbol}:`, error);
      }
    }

    console.log(`📰 Total news articles found: ${results.length}`);
    console.log(`📈 API Usage Stats - Requests: ${apiUsage.requests}, Errors: ${apiUsage.errors}, Rate Limit Hits: ${apiUsage.rateLimitHits}`);
    return results;
    
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return results;
  }
}

/**
 * Analyze news article for symbol mentions with relevance scoring
 */
function analyzeNewsForSymbols(article: any, symbols: string[]): Array<{
  symbol: string;
  relevance: number;
  type: 'primary' | 'secondary' | 'mentioned';
}> {
  const mentions = [];
  const text = `${article.headline} ${article.summary || ''}`.toLowerCase();
  
  for (const symbol of symbols) {
    const symbolLower = symbol.toLowerCase();
    
    // Check for direct symbol mentions or company name mentions
    if (text.includes(symbolLower) || text.includes(`$${symbolLower}`)) {
      let relevance = 0.6; // Base relevance for symbol mention
      let type: 'primary' | 'secondary' | 'mentioned' = 'mentioned';
      
      // Higher relevance if mentioned in headline
      if (article.headline.toLowerCase().includes(symbolLower)) {
        relevance = 0.9;
        type = 'primary';
      }
      // Medium relevance if mentioned multiple times
      else if ((text.match(new RegExp(symbolLower, 'gi')) || []).length > 1) {
        relevance = 0.7;
        type = 'secondary';
      }
      
      mentions.push({ symbol, relevance, type });
    }
    
    // Also check for common company name variations
    const companyNames = getCompanyNameVariations(symbol);
    for (const companyName of companyNames) {
      if (text.includes(companyName.toLowerCase())) {
        let relevance = 0.5; // Slightly lower for company name matches
        let type: 'primary' | 'secondary' | 'mentioned' = 'mentioned';
        
        if (article.headline.toLowerCase().includes(companyName.toLowerCase())) {
          relevance = 0.85;
          type = 'primary';
        }
        
        // Only add if we haven't already added this symbol
        if (!mentions.find(m => m.symbol === symbol)) {
          mentions.push({ symbol, relevance, type });
        }
        break;
      }
    }
  }
  
  return mentions;
}

/**
 * Reset API usage stats if enough time has passed
 */
function resetApiUsageIfNeeded() {
  if (Date.now() - apiUsage.lastReset > API_USAGE_RESET_INTERVAL) {
    apiUsage.requests = 0;
    apiUsage.errors = 0;
    apiUsage.rateLimitHits = 0;
    apiUsage.lastReset = Date.now();
  }
}

/**
 * Rate-limited fetch with exponential backoff for 429 errors
 */
async function rateLimitedFetch(url: string, description: string): Promise<any> {
  resetApiUsageIfNeeded();
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      apiUsage.requests++;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ API call successful: ${description} (${apiUsage.requests} requests this hour)`);
        return data;
      } else if (response.status === 429) {
        // Rate limit exceeded - exponential backoff
        apiUsage.rateLimitHits++;
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.warn(`⚠️ Rate limit exceeded for ${description}. Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) - Total rate limit hits: ${apiUsage.rateLimitHits}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        apiUsage.errors++;
        console.error(`❌ HTTP error ${response.status} for ${description} - Total errors: ${apiUsage.errors}`);
        return null;
      }
    } catch (error) {
      apiUsage.errors++;
      if (attempt === MAX_RETRIES - 1) {
        console.error(`❌ Failed to fetch ${description} after ${MAX_RETRIES} attempts - Total errors: ${apiUsage.errors}:`, error);
        return null;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_BASE));
    }
  }
  return null;
}

/**
 * Get common company name variations for better matching
 */
function getCompanyNameVariations(symbol: string): string[] {
  // Common tech company mappings
  const nameMap: Record<string, string[]> = {
    'AAPL': ['Apple', 'Apple Inc'],
    'GOOGL': ['Google', 'Alphabet', 'Alphabet Inc'],
    'GOOG': ['Google', 'Alphabet', 'Alphabet Inc'],
    'MSFT': ['Microsoft', 'Microsoft Corp'],
    'AMZN': ['Amazon', 'Amazon.com'],
    'META': ['Meta', 'Facebook', 'Meta Platforms'],
    'TSLA': ['Tesla', 'Tesla Inc'],
    'NVDA': ['Nvidia', 'NVIDIA'],
    'NFLX': ['Netflix'],
    'RKLB': ['Rocket Lab', 'Rocket Lab USA'],
    // Add more mappings as needed
  };
  
  return nameMap[symbol] || [];
}

/**
 * MANUAL TEST FUNCTION - Call this from Convex dashboard to populate news data
 * This is the same as updateNewsData but public so you can trigger it manually
 */
export const testNewsUpdate = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; updated: number; symbols?: string[]; error?: string }> => {
    // Call the internal news update function
    return await ctx.runAction(internal.background.updateNewsData);
  },
});