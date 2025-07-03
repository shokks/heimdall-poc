import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create stock with company information
export const getOrCreateStock = mutation({
  args: {
    symbol: v.string(),
    companyName: v.string(),
    logo: v.optional(v.string()),
    sector: v.optional(v.string()),
    marketCap: v.optional(v.number()),
    exchange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if stock already exists
    const existingStock = await ctx.db
      .query("stocks")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existingStock) {
      // Update existing stock with new information
      await ctx.db.patch(existingStock._id, {
        companyName: args.companyName,
        logo: args.logo,
        sector: args.sector,
        marketCap: args.marketCap,
        exchange: args.exchange,
        lastUpdated: Date.now(),
      });
      return existingStock._id;
    } else {
      // Create new stock
      return await ctx.db.insert("stocks", {
        symbol: args.symbol,
        companyName: args.companyName,
        logo: args.logo,
        sector: args.sector,
        marketCap: args.marketCap,
        exchange: args.exchange,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Update stock with latest price data (much simpler now!)
export const updateStockPrice = mutation({
  args: {
    symbol: v.string(),
    currentPrice: v.number(),
    dailyChange: v.number(),
    dailyChangePercent: v.string(),
    volume: v.optional(v.number()),
    source: v.union(v.literal("alphavantage"), v.literal("finnhub"), v.literal("demo"), v.literal("cache")),
  },
  handler: async (ctx, args) => {
    // Check if stock exists
    const stock = await ctx.db
      .query("stocks")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (stock) {
      // Update existing stock with price data
      await ctx.db.patch(stock._id, {
        currentPrice: args.currentPrice,
        dailyChange: args.dailyChange,
        dailyChangePercent: args.dailyChangePercent,
        volume: args.volume,
        source: args.source,
        lastUpdated: Date.now(),
      });
      return stock._id;
    } else {
      // Create new stock with price data (minimal info)
      return await ctx.db.insert("stocks", {
        symbol: args.symbol,
        companyName: args.symbol, // Fallback to symbol if no company name
        currentPrice: args.currentPrice,
        dailyChange: args.dailyChange,
        dailyChangePercent: args.dailyChangePercent,
        volume: args.volume,
        source: args.source,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Batch update multiple stock prices
export const batchUpdateStockPrices = mutation({
  args: {
    updates: v.array(v.object({
      symbol: v.string(),
      currentPrice: v.number(),
      dailyChange: v.number(),
      dailyChangePercent: v.string(),
      volume: v.optional(v.number()),
      source: v.union(v.literal("alphavantage"), v.literal("finnhub"), v.literal("demo"), v.literal("cache")),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const update of args.updates) {
      const stock = await ctx.db
        .query("stocks")
        .withIndex("by_symbol", (q) => q.eq("symbol", update.symbol))
        .first();

      if (stock) {
        await ctx.db.patch(stock._id, {
          currentPrice: update.currentPrice,
          dailyChange: update.dailyChange,
          dailyChangePercent: update.dailyChangePercent,
          volume: update.volume,
          source: update.source,
          lastUpdated: Date.now(),
        });
        results.push(stock._id);
      } else {
        // Create new stock if it doesn't exist
        const newStockId = await ctx.db.insert("stocks", {
          symbol: update.symbol,
          companyName: update.symbol,
          currentPrice: update.currentPrice,
          dailyChange: update.dailyChange,
          dailyChangePercent: update.dailyChangePercent,
          volume: update.volume,
          source: update.source,
          lastUpdated: Date.now(),
        });
        results.push(newStockId);
      }
    }

    return results;
  },
});

// Get stock by symbol
export const getStock = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stocks")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();
  },
});

// Get multiple stocks by symbols
export const getStocks = query({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, args) => {
    const stocks = await Promise.all(
      args.symbols.map(symbol =>
        ctx.db
          .query("stocks")
          .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
          .first()
      )
    );
    return stocks.filter(Boolean);
  },
});

// Get all tracked stocks (for background price updates)
export const getAllTrackedStocks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stocks").collect();
  },
});

// Get stocks that need price updates (no recent price data)
export const getStocksNeedingPriceUpdates = query({
  args: { maxAgeMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeMinutes || 5; // Default 5 minutes
    const cutoffTime = Date.now() - (maxAge * 60 * 1000);
    
    const allStocks = await ctx.db.query("stocks").collect();
    
    // Filter stocks that either have no price data or stale price data
    return allStocks.filter(stock => 
      !stock.currentPrice || 
      !stock.lastUpdated || 
      stock.lastUpdated < cutoffTime
    );
  },
});

// Get stocks with recent price updates (for caching/performance)
export const getStocksWithRecentPrices = query({
  args: { maxAgeMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeMinutes || 5; // Default 5 minutes
    const cutoffTime = Date.now() - (maxAge * 60 * 1000);
    
    const allStocks = await ctx.db.query("stocks").collect();
    
    // Return stocks with recent price data
    return allStocks.filter(stock => 
      stock.currentPrice && 
      stock.lastUpdated && 
      stock.lastUpdated >= cutoffTime
    );
  },
});

// Get top performing stocks (by daily change)
export const getTopPerformingStocks = query({
  args: { 
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("change"), v.literal("changePercent")))
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const sortBy = args.sortBy || "changePercent";
    
    const allStocks = await ctx.db.query("stocks").collect();
    
    // Filter stocks with price data and sort by performance
    const stocksWithPrices = allStocks.filter(stock => 
      stock.currentPrice && stock.dailyChange !== undefined
    );
    
    stocksWithPrices.sort((a, b) => {
      if (sortBy === "change") {
        return (b.dailyChange || 0) - (a.dailyChange || 0);
      } else {
        // Sort by change percent (parse the percentage string)
        const aPercent = parseFloat((a.dailyChangePercent || '0%').replace('%', ''));
        const bPercent = parseFloat((b.dailyChangePercent || '0%').replace('%', ''));
        return bPercent - aPercent;
      }
    });
    
    return stocksWithPrices.slice(0, limit);
  },
});

// Clean up old/unused stocks (optional maintenance function)
export const cleanupUnusedStocks = mutation({
  args: { daysOld: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysOld = args.daysOld || 30;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    // Get all portfolios to find which stocks are currently in use
    const portfolios = await ctx.db.query("portfolios").collect();
    const usedSymbols = new Set<string>();
    
    portfolios.forEach(portfolio => {
      portfolio.positions.forEach(position => {
        usedSymbols.add(position.symbol);
      });
    });
    
    // Find old stocks that are no longer in any portfolio
    const allStocks = await ctx.db.query("stocks").collect();
    const stocksToDelete = allStocks.filter(stock => 
      !usedSymbols.has(stock.symbol) && 
      stock.lastUpdated < cutoffTime
    );
    
    // Delete unused stocks
    for (const stock of stocksToDelete) {
      await ctx.db.delete(stock._id);
    }
    
    return stocksToDelete.length;
  },
});