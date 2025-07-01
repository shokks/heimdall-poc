import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores Clerk user data
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    createdAt: v.number(),
    lastActive: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Portfolios table - current user portfolios
  portfolios: defineTable({
    userId: v.id("users"),
    positions: v.array(
      v.object({
        symbol: v.string(),
        shares: v.number(),
        companyName: v.string(),
        currentPrice: v.optional(v.number()),
        dailyChange: v.optional(v.number()),
        dailyChangePercent: v.optional(v.string()),
        totalValue: v.optional(v.number()),
        source: v.optional(v.union(v.literal("alphavantage"), v.literal("finnhub"), v.literal("demo"), v.literal("cache"))),
      })
    ),
    totalValue: v.number(),
    totalChange: v.number(),
    totalChangePercent: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Portfolio snapshots table - simple daily snapshots for historical data
  portfolioSnapshots: defineTable({
    userId: v.id("users"),
    portfolioId: v.id("portfolios"),
    totalValue: v.number(),
    totalChange: v.number(),
    totalChangePercent: v.number(),
    positions: v.array(
      v.object({
        symbol: v.string(),
        shares: v.number(),
        price: v.number(),
        value: v.number(),
        change: v.number(),
        changePercent: v.string(),
      })
    ),
    snapshotDate: v.string(), // YYYY-MM-DD format
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "snapshotDate"])
    .index("by_portfolio", ["portfolioId"]),
});