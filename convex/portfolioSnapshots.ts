import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update daily portfolio snapshot
export const createSnapshot = mutation({
  args: {
    clerkId: v.string(),
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

    if (!portfolio) {
      return null; // No portfolio to snapshot
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if snapshot already exists for today
    const existingSnapshot = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", user._id).eq("snapshotDate", today)
      )
      .first();

    // Convert portfolio positions to snapshot format with stockPriceId references
    const snapshotPositions = await Promise.all(
      portfolio.positions.map(async (pos) => {
        // Get the latest price entry for this symbol
        const latestPrice = await ctx.db
          .query("stockPrices")
          .withIndex("by_symbol_and_timestamp", (q) => 
            q.eq("symbol", pos.symbol)
          )
          .order("desc")
          .first();

        if (!latestPrice) {
          // Create a placeholder price entry if none exists
          const placeholderPriceId = await ctx.db.insert("stockPrices", {
            symbol: pos.symbol,
            price: 0,
            change: 0,
            changePercent: "0.00%",
            timestamp: Date.now(),
            source: "cache",
          });

          return {
            symbol: pos.symbol,
            shares: pos.shares,
            stockPriceId: placeholderPriceId,
          };
        }

        return {
          symbol: pos.symbol,
          shares: pos.shares,
          stockPriceId: latestPrice._id,
        };
      })
    );

    // Calculate totals from the current price data
    let totalValue = 0;
    let totalChange = 0;

    for (const position of snapshotPositions) {
      const priceData = await ctx.db.get(position.stockPriceId);
      if (priceData) {
        const positionValue = priceData.price * position.shares;
        const positionChange = priceData.change * position.shares;
        totalValue += positionValue;
        totalChange += positionChange;
      }
    }

    const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

    const snapshotData = {
      userId: user._id,
      portfolioId: portfolio._id,
      totalValue,
      totalChange,
      totalChangePercent,
      positions: snapshotPositions,
      snapshotDate: today,
      timestamp: Date.now(),
    };

    if (existingSnapshot) {
      // Update existing snapshot
      await ctx.db.patch(existingSnapshot._id, snapshotData);
      return existingSnapshot._id;
    } else {
      // Create new snapshot
      return await ctx.db.insert("portfolioSnapshots", snapshotData);
    }
  },
});

// Get historical snapshots for time period comparisons
export const getHistoricalData = query({
  args: { 
    clerkId: v.string(),
    days: v.optional(v.number()), // Number of days back (default: 30)
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Get snapshots from the last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];

    const snapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("snapshotDate"), cutoffDateString))
      .collect();

    // Enrich snapshots with actual price data
    const enrichedSnapshots = await Promise.all(
      snapshots.map(async (snapshot) => {
        const enrichedPositions = await Promise.all(
          snapshot.positions.map(async (position) => {
            const priceData = await ctx.db.get(position.stockPriceId);
            return {
              symbol: position.symbol,
              shares: position.shares,
              price: priceData?.price || 0,
              value: priceData ? priceData.price * position.shares : 0,
              change: priceData?.change || 0,
              changePercent: priceData?.changePercent || "0.00%",
            };
          })
        );

        return {
          ...snapshot,
          positions: enrichedPositions,
        };
      })
    );

    return enrichedSnapshots.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  },
});

// Get specific snapshot by date
export const getSnapshotByDate = query({
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
      return null;
    }

    const snapshot = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", user._id).eq("snapshotDate", args.date)
      )
      .first();

    if (!snapshot) {
      return null;
    }

    // Enrich snapshot with actual price data
    const enrichedPositions = await Promise.all(
      snapshot.positions.map(async (position) => {
        const priceData = await ctx.db.get(position.stockPriceId);
        return {
          symbol: position.symbol,
          shares: position.shares,
          price: priceData?.price || 0,
          value: priceData ? priceData.price * position.shares : 0,
          change: priceData?.change || 0,
          changePercent: priceData?.changePercent || "0.00%",
        };
      })
    );

    return {
      ...snapshot,
      positions: enrichedPositions,
    };
  },
});

// Get comparison data for time periods (today vs week ago, etc.)
export const getTimeComparison = query({
  args: {
    clerkId: v.string(),
    period: v.union(v.literal("week"), v.literal("month")),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Calculate comparison date
    const compareDate = new Date();
    if (args.period === "week") {
      compareDate.setDate(compareDate.getDate() - 7);
    } else {
      compareDate.setDate(compareDate.getDate() - 30);
    }
    const compareDateString = compareDate.toISOString().split('T')[0];

    // Get current portfolio (today's data) - use the enriched version
    const currentPortfolioRaw = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!currentPortfolioRaw) {
      return null;
    }

    // Calculate current totals
    let currentTotalValue = 0;
    let currentTotalChange = 0;

    for (const position of currentPortfolioRaw.positions) {
      const latestPrice = await ctx.db
        .query("stockPrices")
        .withIndex("by_symbol_and_timestamp", (q) => 
          q.eq("symbol", position.symbol)
        )
        .order("desc")
        .first();

      if (latestPrice) {
        currentTotalValue += latestPrice.price * position.shares;
        currentTotalChange += latestPrice.change * position.shares;
      }
    }

    const currentTotalChangePercent = currentTotalValue > 0 ? 
      (currentTotalChange / (currentTotalValue - currentTotalChange)) * 100 : 0;

    // Get historical snapshot
    const historicalSnapshot = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", user._id).eq("snapshotDate", compareDateString)
      )
      .first();

    return {
      current: {
        totalValue: currentTotalValue,
        totalChange: currentTotalChange,
        totalChangePercent: currentTotalChangePercent,
        date: today,
      },
      historical: historicalSnapshot ? {
        totalValue: historicalSnapshot.totalValue,
        totalChange: historicalSnapshot.totalChange,
        totalChangePercent: historicalSnapshot.totalChangePercent,
        date: historicalSnapshot.snapshotDate,
      } : null,
      periodChange: historicalSnapshot ? 
        currentTotalValue - historicalSnapshot.totalValue : 0,
      periodChangePercent: historicalSnapshot && historicalSnapshot.totalValue > 0 ? 
        ((currentTotalValue - historicalSnapshot.totalValue) / historicalSnapshot.totalValue) * 100 : 0,
    };
  },
});