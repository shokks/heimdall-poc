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

    // Convert portfolio positions to snapshot format
    const snapshotPositions = portfolio.positions.map(pos => ({
      symbol: pos.symbol,
      shares: pos.shares,
      price: pos.currentPrice || 0,
      value: pos.totalValue || 0,
      change: pos.dailyChange || 0,
      changePercent: pos.dailyChangePercent || "0.00%",
    }));

    const snapshotData = {
      userId: user._id,
      portfolioId: portfolio._id,
      totalValue: portfolio.totalValue,
      totalChange: portfolio.totalChange,
      totalChangePercent: portfolio.totalChangePercent,
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

    return snapshots.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
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

    return await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", user._id).eq("snapshotDate", args.date)
      )
      .first();
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

    // Get current portfolio (today's data)
    const currentPortfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Get historical snapshot
    const historicalSnapshot = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", user._id).eq("snapshotDate", compareDateString)
      )
      .first();

    if (!currentPortfolio) {
      return null;
    }

    return {
      current: {
        totalValue: currentPortfolio.totalValue,
        totalChange: currentPortfolio.totalChange,
        totalChangePercent: currentPortfolio.totalChangePercent,
        date: today,
      },
      historical: historicalSnapshot ? {
        totalValue: historicalSnapshot.totalValue,
        totalChange: historicalSnapshot.totalChange,
        totalChangePercent: historicalSnapshot.totalChangePercent,
        date: historicalSnapshot.snapshotDate,
      } : null,
      periodChange: historicalSnapshot ? 
        currentPortfolio.totalValue - historicalSnapshot.totalValue : 0,
      periodChangePercent: historicalSnapshot && historicalSnapshot.totalValue > 0 ? 
        ((currentPortfolio.totalValue - historicalSnapshot.totalValue) / historicalSnapshot.totalValue) * 100 : 0,
    };
  },
});