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

  // Stocks table - master stock information + latest prices (combined)
  stocks: defineTable({
    symbol: v.string(),
    companyName: v.string(),
    logo: v.optional(v.string()),
    sector: v.optional(v.string()),
    marketCap: v.optional(v.number()),
    exchange: v.optional(v.string()),
    // Latest price data (updated every 5 minutes)
    currentPrice: v.optional(v.number()),
    dailyChange: v.optional(v.number()),
    dailyChangePercent: v.optional(v.string()),
    volume: v.optional(v.number()),
    source: v.optional(v.union(v.literal("alphavantage"), v.literal("finnhub"), v.literal("demo"), v.literal("cache"))),
    lastUpdated: v.number(),
  }).index("by_symbol", ["symbol"]),

  // Portfolios table - user-specific position data only
  portfolios: defineTable({
    userId: v.id("users"),
    positions: v.array(
      v.object({
        symbol: v.string(), // References stocks table
        shares: v.number(),
        purchasePrice: v.optional(v.number()),
        purchaseDate: v.optional(v.number()),
        lastUpdated: v.number(),
      })
    ),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // News table - centralized news with embedded stock associations
  news: defineTable({
    externalId: v.string(), // Original news ID from source
    title: v.string(),
    summary: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    // Embedded stock associations (denormalized for simplicity)
    relatedSymbols: v.array(v.string()), // Array of stock symbols
    relevanceScores: v.array(v.number()), // Parallel array for relevance scores (0-1)
    mentionTypes: v.array(v.union(v.literal("primary"), v.literal("secondary"), v.literal("mentioned"))),
    fetchedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_published_at", ["publishedAt"])
    .index("by_source", ["source"]),

  // Historical price cache - for faster historical data retrieval
  historicalPrices: defineTable({
    symbol: v.string(),
    date: v.string(), // YYYY-MM-DD format
    open: v.number(),
    high: v.number(),
    low: v.number(),
    close: v.number(),
    volume: v.optional(v.number()),
    source: v.union(v.literal("finnhub"), v.literal("alphavantage")),
    fetchedAt: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_symbol_and_date", ["symbol", "date"])
    .index("by_date", ["date"]),
});