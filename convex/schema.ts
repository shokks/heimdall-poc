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

  // Stocks table - master stock/company information
  stocks: defineTable({
    symbol: v.string(),
    companyName: v.string(),
    logo: v.optional(v.string()),
    sector: v.optional(v.string()),
    marketCap: v.optional(v.number()),
    exchange: v.optional(v.string()),
    lastUpdated: v.number(),
  }).index("by_symbol", ["symbol"]),

  // Stock prices table - centralized price data with history
  stockPrices: defineTable({
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.string(),
    volume: v.optional(v.number()),
    timestamp: v.number(),
    source: v.union(v.literal("alphavantage"), v.literal("finnhub"), v.literal("demo"), v.literal("cache")),
  })
    .index("by_symbol", ["symbol"])
    .index("by_symbol_and_timestamp", ["symbol", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // News table - centralized news articles
  news: defineTable({
    externalId: v.string(), // Original news ID from source
    title: v.string(),
    summary: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    fetchedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_published_at", ["publishedAt"])
    .index("by_source", ["source"]),

  // News-Stock associations table - many-to-many relationship
  newsStockAssociations: defineTable({
    newsId: v.id("news"),
    symbol: v.string(),
    relevanceScore: v.number(), // 0-1 score
    mentionType: v.union(v.literal("primary"), v.literal("secondary"), v.literal("mentioned")),
  })
    .index("by_news", ["newsId"])
    .index("by_symbol", ["symbol"])
    .index("by_symbol_and_relevance", ["symbol", "relevanceScore"]),

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

  // Portfolio snapshots table - references centralized price data
  portfolioSnapshots: defineTable({
    userId: v.id("users"),
    portfolioId: v.id("portfolios"),
    totalValue: v.number(),
    totalChange: v.number(),
    totalChangePercent: v.number(),
    positions: v.array(
      v.object({
        symbol: v.string(), // References stocks table
        shares: v.number(),
        stockPriceId: v.id("stockPrices"), // References price at snapshot time
      })
    ),
    snapshotDate: v.string(), // YYYY-MM-DD format
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "snapshotDate"])
    .index("by_portfolio", ["portfolioId"]),
});