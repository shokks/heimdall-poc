import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Portfolio position type for validation
const portfolioPositionValidator = v.object({
  symbol: v.string(),
  shares: v.number(),
  companyName: v.string(),
  currentPrice: v.optional(v.number()),
  dailyChange: v.optional(v.number()),
  dailyChangePercent: v.optional(v.string()),
  totalValue: v.optional(v.number()),
  source: v.optional(v.union(v.literal("alphavantage"), v.literal("finnhub"), v.literal("demo"), v.literal("cache"))),
});

// Get portfolio by user's Clerk ID
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

    // Then get their portfolio
    return await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

// Save or update portfolio
export const savePortfolio = mutation({
  args: {
    clerkId: v.string(),
    positions: v.array(portfolioPositionValidator),
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

    // Calculate portfolio totals
    const totalValue = args.positions.reduce((sum, pos) => sum + (pos.totalValue || 0), 0);
    const totalChange = args.positions.reduce((sum, pos) => {
      if (pos.currentPrice && pos.dailyChange && pos.shares) {
        return sum + (pos.dailyChange * pos.shares);
      }
      return sum;
    }, 0);
    const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

    // Check if portfolio already exists
    const existingPortfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingPortfolio) {
      // Update existing portfolio
      await ctx.db.patch(existingPortfolio._id, {
        positions: args.positions,
        totalValue,
        totalChange,
        totalChangePercent,
        updatedAt: Date.now(),
      });
      return existingPortfolio._id;
    } else {
      // Create new portfolio
      const portfolioId = await ctx.db.insert("portfolios", {
        userId: user._id,
        positions: args.positions,
        totalValue,
        totalChange,
        totalChangePercent,
        updatedAt: Date.now(),
      });
      return portfolioId;
    }
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
    const portfolio = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!portfolio) return false;

    const userPortfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", portfolio._id))
      .first();

    return userPortfolio ? userPortfolio.positions.length > 0 : false;
  },
});