import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create stock by symbol
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

// Update stock price
export const updateStockPrice = mutation({
  args: {
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.string(),
    volume: v.optional(v.number()),
    source: v.union(v.literal("alphavantage"), v.literal("finnhub"), v.literal("demo"), v.literal("cache")),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    
    return await ctx.db.insert("stockPrices", {
      symbol: args.symbol,
      price: args.price,
      change: args.change,
      changePercent: args.changePercent,
      volume: args.volume,
      timestamp,
      source: args.source,
    });
  },
});

// Get latest stock price
export const getLatestStockPrice = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stockPrices")
      .withIndex("by_symbol_and_timestamp", (q) => 
        q.eq("symbol", args.symbol)
      )
      .order("desc")
      .first();
  },
});

// Get latest stock prices for multiple symbols
export const getLatestStockPrices = query({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, args) => {
    const prices = await Promise.all(
      args.symbols.map(async symbol => {
        const price = await ctx.db
          .query("stockPrices")
          .withIndex("by_symbol_and_timestamp", (q) => 
            q.eq("symbol", symbol)
          )
          .order("desc")
          .first();
        return price;
      })
    );
    return prices.filter(Boolean);
  },
});

// Get historical prices for a symbol within date range
export const getHistoricalPrices = query({
  args: {
    symbol: v.string(),
    startTimestamp: v.number(),
    endTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stockPrices")
      .withIndex("by_symbol_and_timestamp", (q) => 
        q.eq("symbol", args.symbol)
      )
      .filter((q) => 
        q.and(
          q.gte(q.field("timestamp"), args.startTimestamp),
          q.lte(q.field("timestamp"), args.endTimestamp)
        )
      )
      .order("desc")
      .collect();
  },
});

// Clean up old price data (keep last 30 days)
export const cleanupOldPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const oldPrices = await ctx.db
      .query("stockPrices")
      .withIndex("by_timestamp", (q) => 
        q.lt("timestamp", thirtyDaysAgo)
      )
      .collect();

    // Delete old prices in batches
    for (const price of oldPrices) {
      await ctx.db.delete(price._id);
    }

    return oldPrices.length;
  },
});

// Get stocks that need price updates (no recent price data)
export const getStocksNeedingPriceUpdates = query({
  args: { maxAgeMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeMinutes || 5; // Default 5 minutes
    const cutoffTime = Date.now() - (maxAge * 60 * 1000);
    
    const allStocks = await ctx.db.query("stocks").collect();
    const stocksNeedingUpdate = [];
    
    for (const stock of allStocks) {
      const latestPrice = await ctx.db
        .query("stockPrices")
        .withIndex("by_symbol_and_timestamp", (q) => 
          q.eq("symbol", stock.symbol)
        )
        .order("desc")
        .first();
      
      if (!latestPrice || latestPrice.timestamp < cutoffTime) {
        stocksNeedingUpdate.push(stock);
      }
    }
    
    return stocksNeedingUpdate;
  },
});