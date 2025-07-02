import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Portfolio position type for validation (user-specific data only)
const portfolioPositionValidator = v.object({
  symbol: v.string(),
  shares: v.number(),
  purchasePrice: v.optional(v.number()),
  purchaseDate: v.optional(v.number()),
  lastUpdated: v.number(),
});

// Get enriched portfolio by user's Clerk ID (joins with stocks and prices)
export const getPortfolioByUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // First get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Get their portfolio
    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!portfolio) {
      return null;
    }

    // Enrich positions with stock and price data
    const enrichedPositions = await Promise.all(
      portfolio.positions.map(async (position) => {
        // Get stock information
        const stock = await ctx.db
          .query("stocks")
          .withIndex("by_symbol", (q) => q.eq("symbol", position.symbol))
          .first();

        // Get latest price
        const latestPrice = await ctx.db
          .query("stockPrices")
          .withIndex("by_symbol_and_timestamp", (q) => 
            q.eq("symbol", position.symbol)
          )
          .order("desc")
          .first();

        if (!stock) {
          // Stock not in master table, return minimal data
          return {
            symbol: position.symbol,
            shares: position.shares,
            companyName: position.symbol,
            currentPrice: latestPrice?.price,
            dailyChange: latestPrice?.change,
            dailyChangePercent: latestPrice?.changePercent,
            totalValue: latestPrice ? latestPrice.price * position.shares : undefined,
            source: latestPrice?.source,
            lastUpdated: position.lastUpdated,
          };
        }

        return {
          symbol: position.symbol,
          shares: position.shares,
          companyName: stock.companyName,
          logo: stock.logo,
          sector: stock.sector,
          marketCap: stock.marketCap,
          exchange: stock.exchange,
          currentPrice: latestPrice?.price,
          dailyChange: latestPrice?.change,
          dailyChangePercent: latestPrice?.changePercent,
          totalValue: latestPrice ? latestPrice.price * position.shares : undefined,
          source: latestPrice?.source,
          purchasePrice: position.purchasePrice,
          purchaseDate: position.purchaseDate,
          lastUpdated: position.lastUpdated,
        };
      })
    );

    // Calculate portfolio totals
    const totalValue = enrichedPositions.reduce((sum, pos) => sum + (pos.totalValue || 0), 0);
    const totalChange = enrichedPositions.reduce((sum, pos) => {
      if (pos.currentPrice && pos.dailyChange && pos.shares) {
        return sum + (pos.dailyChange * pos.shares);
      }
      return sum;
    }, 0);
    const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

    return {
      _id: portfolio._id,
      userId: portfolio.userId,
      positions: enrichedPositions,
      totalValue,
      totalChange,
      totalChangePercent,
      updatedAt: portfolio.updatedAt,
    };
  },
});

// Save or update portfolio (accepts enriched positions but stores only user data)
export const savePortfolio = mutation({
  args: {
    clerkId: v.string(),
    positions: v.array(v.object({
      symbol: v.string(),
      shares: v.number(),
      companyName: v.optional(v.string()), // Will be used to create/update stock
      logo: v.optional(v.string()),
      purchasePrice: v.optional(v.number()),
      purchaseDate: v.optional(v.number()),
      // These fields are ignored but included for compatibility
      currentPrice: v.optional(v.number()),
      dailyChange: v.optional(v.number()),
      dailyChangePercent: v.optional(v.string()),
      totalValue: v.optional(v.number()),
      source: v.optional(v.string()),
      lastUpdated: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    // Get or create user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found. Please sign in again.");
    }

    // Process positions: create/update stocks and extract user-specific data
    const processedPositions = await Promise.all(
      args.positions.map(async (pos) => {
        // Create or update stock in master table if we have company info
        if (pos.companyName) {
          await ctx.db
            .query("stocks")
            .withIndex("by_symbol", (q) => q.eq("symbol", pos.symbol))
            .first()
            .then(async (existingStock) => {
              if (existingStock) {
                // Update existing stock
                await ctx.db.patch(existingStock._id, {
                  companyName: pos.companyName!,
                  logo: pos.logo,
                  lastUpdated: Date.now(),
                });
              } else {
                // Create new stock
                await ctx.db.insert("stocks", {
                  symbol: pos.symbol,
                  companyName: pos.companyName!,
                  logo: pos.logo,
                  lastUpdated: Date.now(),
                });
              }
            });
        }

        // Return user-specific position data
        return {
          symbol: pos.symbol,
          shares: pos.shares,
          purchasePrice: pos.purchasePrice,
          purchaseDate: pos.purchaseDate,
          lastUpdated: pos.lastUpdated || Date.now(),
        };
      })
    );

    // Check if portfolio already exists
    const existingPortfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingPortfolio) {
      // Update existing portfolio
      await ctx.db.patch(existingPortfolio._id, {
        positions: processedPositions,
        updatedAt: Date.now(),
      });
      return existingPortfolio._id;
    } else {
      // Create new portfolio
      const portfolioId = await ctx.db.insert("portfolios", {
        userId: user._id,
        positions: processedPositions,
        updatedAt: Date.now(),
      });
      return portfolioId;
    }
  },
});

// Get user's portfolio symbols (for news filtering)
export const getPortfolioSymbols = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return portfolio ? portfolio.positions.map(pos => pos.symbol) : [];
  },
});

// Delete portfolio
export const deletePortfolio = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return false;
    }

    // Get portfolio
    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (portfolio) {
      await ctx.db.delete(portfolio._id);
      return true;
    }

    return false;
  },
});

// Check if user has a portfolio
export const hasPortfolio = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return false;

    const userPortfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return userPortfolio ? userPortfolio.positions.length > 0 : false;
  },
});

// Get all unique symbols across all portfolios (for background data fetching)
export const getAllPortfolioSymbols = query({
  args: {},
  handler: async (ctx) => {
    const portfolios = await ctx.db.query("portfolios").collect();
    const allSymbols = new Set<string>();
    
    portfolios.forEach(portfolio => {
      portfolio.positions.forEach(position => {
        allSymbols.add(position.symbol);
      });
    });
    
    return Array.from(allSymbols);
  },
});