import { v } from "convex/values";
import { query } from "./_generated/server";

// Helper function to format date for Finnhub API
function formatDateForFinnhub(date: Date): number {
  return Math.floor(date.getTime() / 1000); // Unix timestamp
}

// Helper function to get historical portfolio value with caching
async function fetchHistoricalPortfolioValue(
  ctx: any,
  symbols: string[], 
  shares: number[], 
  targetDate: string
): Promise<{ totalValue: number; totalChange: number; positions: any[] }> {
  const positions = [];
  let totalValue = 0;
  let totalChange = 0;

  // Batch check cache for all symbols and the target date
  const cachedPrices = await ctx.db
    .query("historicalPrices")
    .withIndex("by_date", (q: any) => q.eq("date", targetDate))
    .collect()
    .then((prices: any[]) => 
      prices.filter(price => symbols.includes(price.symbol))
    );

  // Create lookup map for cached data
  const cacheMap = new Map(cachedPrices.map((price: any) => [price.symbol, price]));
  const uncachedSymbols = symbols.filter(symbol => !cacheMap.has(symbol));

  // Fetch uncached data from API if needed
  if (uncachedSymbols.length > 0) {
    console.log(`📊 Fetching ${uncachedSymbols.length} uncached historical prices for ${targetDate}`);
    
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (!finnhubKey) {
      throw new Error("Finnhub API key not configured");
    }

    const date = new Date(targetDate);
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 1);
    
    const fromTimestamp = formatDateForFinnhub(date);
    const toTimestamp = formatDateForFinnhub(endDate);

    // Batch fetch historical data with limited concurrency
    const batchSize = 5;
    for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
      const batch = uncachedSymbols.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${finnhubKey}`
          );

          if (response.ok) {
            const data = await response.json();
            
            if (data.s === 'ok' && data.c && data.c.length > 0) {
              const historicalPrice = {
                symbol,
                date: targetDate,
                open: data.o[0],
                high: data.h[0],
                low: data.l[0],
                close: data.c[0],
                volume: data.v?.[0],
                source: 'finnhub' as const,
                fetchedAt: Date.now(),
              };

              // Cache the result
              await ctx.db.insert("historicalPrices", historicalPrice);
              cacheMap.set(symbol, historicalPrice);
            }
          }
        } catch (error) {
          console.error(`Error fetching historical data for ${symbol}:`, error);
        }
      }));

      // Rate limiting between batches
      if (i + batchSize < uncachedSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  // Process all symbols using cached data
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const symbolShares = shares[i];
    const priceData = cacheMap.get(symbol) as any;

    if (priceData) {
      const closePrice = priceData.close;
      const openPrice = priceData.open;
      const dailyChange = closePrice - openPrice;
      const dailyChangePercent = openPrice > 0 ? ((dailyChange / openPrice) * 100).toFixed(2) + '%' : '0.00%';
      
      const positionValue = closePrice * symbolShares;
      const positionChange = dailyChange * symbolShares;

      positions.push({
        symbol,
        shares: symbolShares,
        price: closePrice,
        value: positionValue,
        change: dailyChange,
        changePercent: dailyChangePercent,
      });

      totalValue += positionValue;
      totalChange += positionChange;
    } else {
      console.warn(`No historical data available for ${symbol} on ${targetDate}`);
    }
  }

  return { totalValue, totalChange, positions };
}

// Get historical portfolio data for specific date using Finnhub API
export const getHistoricalPortfolioValue = query({
  args: {
    clerkId: v.string(),
    date: v.string(), // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get current portfolio
    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!portfolio || portfolio.positions.length === 0) {
      return null;
    }

    const symbols = portfolio.positions.map(pos => pos.symbol);
    const shares = portfolio.positions.map(pos => pos.shares);

    try {
      const historicalData = await fetchHistoricalPortfolioValue(ctx, symbols, shares, args.date);
      const totalChangePercent = historicalData.totalValue > 0 ? 
        (historicalData.totalChange / (historicalData.totalValue - historicalData.totalChange)) * 100 : 0;

      return {
        date: args.date,
        totalValue: historicalData.totalValue,
        totalChange: historicalData.totalChange,
        totalChangePercent,
        positions: historicalData.positions,
      };
    } catch (error) {
      console.error('Error fetching historical portfolio data:', error);
      return null;
    }
  },
});

// Get portfolio performance comparison (current vs historical)
export const getPortfolioTimeComparison = query({
  args: {
    clerkId: v.string(),
    period: v.union(v.literal("week"), v.literal("month"), v.literal("3months"), v.literal("year")),
  },
  handler: async (ctx, args) => {
    // Get user and current portfolio
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!portfolio || portfolio.positions.length === 0) {
      return null;
    }

    // Calculate historical date based on period
    const today = new Date();
    const historicalDate = new Date();
    
    switch (args.period) {
      case "week":
        historicalDate.setDate(today.getDate() - 7);
        break;
      case "month":
        historicalDate.setMonth(today.getMonth() - 1);
        break;
      case "3months":
        historicalDate.setMonth(today.getMonth() - 3);
        break;
      case "year":
        historicalDate.setFullYear(today.getFullYear() - 1);
        break;
    }

    const historicalDateString = historicalDate.toISOString().split('T')[0];

    // Get current portfolio value (from enriched stocks data)
    const enrichedPositions = await Promise.all(
      portfolio.positions.map(async (position) => {
        const stock = await ctx.db
          .query("stocks")
          .withIndex("by_symbol", (q) => q.eq("symbol", position.symbol))
          .first();
        
        return {
          symbol: position.symbol,
          shares: position.shares,
          currentPrice: stock?.currentPrice || 0,
          dailyChange: stock?.dailyChange || 0,
        };
      })
    );

    const currentTotalValue = enrichedPositions.reduce(
      (sum, pos) => sum + (pos.currentPrice * pos.shares), 0
    );
    const currentTotalChange = enrichedPositions.reduce(
      (sum, pos) => sum + (pos.dailyChange * pos.shares), 0
    );
    const currentTotalChangePercent = currentTotalValue > 0 ? 
      (currentTotalChange / (currentTotalValue - currentTotalChange)) * 100 : 0;

    // Get historical portfolio value
    const symbols = portfolio.positions.map(pos => pos.symbol);
    const shares = portfolio.positions.map(pos => pos.shares);

    try {
      const historicalData = await fetchHistoricalPortfolioValue(ctx, symbols, shares, historicalDateString);

      const periodChange = currentTotalValue - historicalData.totalValue;
      const periodChangePercent = historicalData.totalValue > 0 ? 
        (periodChange / historicalData.totalValue) * 100 : 0;

      return {
        current: {
          totalValue: currentTotalValue,
          totalChange: currentTotalChange,
          totalChangePercent: currentTotalChangePercent,
          date: today.toISOString().split('T')[0],
        },
        historical: {
          totalValue: historicalData.totalValue,
          totalChange: historicalData.totalChange,
          totalChangePercent: historicalData.totalChange > 0 ? 
            (historicalData.totalChange / (historicalData.totalValue - historicalData.totalChange)) * 100 : 0,
          date: historicalDateString,
        },
        periodChange,
        periodChangePercent,
        period: args.period,
      };
    } catch (error) {
      console.error('Error fetching historical comparison data:', error);
      return {
        current: {
          totalValue: currentTotalValue,
          totalChange: currentTotalChange,
          totalChangePercent: currentTotalChangePercent,
          date: today.toISOString().split('T')[0],
        },
        historical: null,
        periodChange: 0,
        periodChangePercent: 0,
        period: args.period,
      };
    }
  },
});

// Get portfolio historical trend data for charting
export const getPortfolioTrendData = query({
  args: {
    clerkId: v.string(),
    days: v.number(), // Number of days back to fetch
  },
  handler: async (ctx, args) => {
    // Get user and portfolio
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!portfolio || portfolio.positions.length === 0) {
      return [];
    }

    const symbols = portfolio.positions.map(pos => pos.symbol);
    const shares = portfolio.positions.map(pos => pos.shares);

    // Generate array of dates to fetch
    const dates = [];
    for (let i = 0; i < args.days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      // Skip weekends (basic market day filtering)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }

    const trendData = [];

    // Fetch historical data for each date (with rate limiting)
    for (const date of dates.reverse()) { // Start from oldest date
      try {
        const historicalData = await fetchHistoricalPortfolioValue(ctx, symbols, shares, date);
        trendData.push({
          date,
          totalValue: historicalData.totalValue,
          totalChange: historicalData.totalChange,
        });

        // Rate limiting between date requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error fetching trend data for ${date}:`, error);
      }
    }

    return trendData;
  },
});