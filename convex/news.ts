import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update news article
export const createOrUpdateNews = mutation({
  args: {
    externalId: v.string(),
    title: v.string(),
    summary: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if news already exists
    const existingNews = await ctx.db
      .query("news")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    if (existingNews) {
      // Update existing news
      await ctx.db.patch(existingNews._id, {
        title: args.title,
        summary: args.summary,
        url: args.url,
        source: args.source,
        publishedAt: args.publishedAt,
        imageUrl: args.imageUrl,
        category: args.category,
        fetchedAt: Date.now(),
      });
      return existingNews._id;
    } else {
      // Create new news
      return await ctx.db.insert("news", {
        externalId: args.externalId,
        title: args.title,
        summary: args.summary,
        url: args.url,
        source: args.source,
        publishedAt: args.publishedAt,
        imageUrl: args.imageUrl,
        category: args.category,
        fetchedAt: Date.now(),
      });
    }
  },
});

// Associate news with stock symbols
export const associateNewsWithStock = mutation({
  args: {
    newsId: v.id("news"),
    symbol: v.string(),
    relevanceScore: v.number(),
    mentionType: v.union(v.literal("primary"), v.literal("secondary"), v.literal("mentioned")),
  },
  handler: async (ctx, args) => {
    // Check if association already exists
    const existingAssociation = await ctx.db
      .query("newsStockAssociations")
      .filter((q) => 
        q.and(
          q.eq(q.field("newsId"), args.newsId),
          q.eq(q.field("symbol"), args.symbol)
        )
      )
      .first();

    if (existingAssociation) {
      // Update existing association
      await ctx.db.patch(existingAssociation._id, {
        relevanceScore: args.relevanceScore,
        mentionType: args.mentionType,
      });
      return existingAssociation._id;
    } else {
      // Create new association
      return await ctx.db.insert("newsStockAssociations", {
        newsId: args.newsId,
        symbol: args.symbol,
        relevanceScore: args.relevanceScore,
        mentionType: args.mentionType,
      });
    }
  },
});

// Get news for specific symbols with relevance filtering
export const getNewsForSymbols = query({
  args: {
    symbols: v.array(v.string()),
    minRelevanceScore: v.optional(v.number()),
    limit: v.optional(v.number()),
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minRelevance = args.minRelevanceScore || 0.3;
    const limit = args.limit || 50;
    const hoursBack = args.hoursBack || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    // Get associations for the symbols
    const associations = await ctx.db
      .query("newsStockAssociations")
      .filter((q) => 
        q.and(
          q.gte(q.field("relevanceScore"), minRelevance),
          // Note: Convex doesn't support IN queries, so we'll filter client-side
        )
      )
      .collect();

    // Filter associations by symbols
    const relevantAssociations = associations.filter(assoc => 
      args.symbols.includes(assoc.symbol)
    );

    // Get news articles for these associations
    const newsIds = [...new Set(relevantAssociations.map(assoc => assoc.newsId))];
    const newsArticles = await Promise.all(
      newsIds.map(async newsId => {
        const news = await ctx.db.get(newsId);
        if (news && news.publishedAt >= cutoffTime) {
          // Get all associations for this news to include related symbols
          const newsAssociations = associations.filter(assoc => assoc.newsId === newsId);
          return {
            ...news,
            relatedSymbols: newsAssociations.map(assoc => ({
              symbol: assoc.symbol,
              relevanceScore: assoc.relevanceScore,
              mentionType: assoc.mentionType,
            })),
          };
        }
        return null;
      })
    );

    return newsArticles
      .filter(Boolean)
      .sort((a, b) => b!.publishedAt - a!.publishedAt)
      .slice(0, limit);
  },
});

// Get recent news (all articles)
export const getRecentNews = query({
  args: {
    limit: v.optional(v.number()),
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const hoursBack = args.hoursBack || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    return await ctx.db
      .query("news")
      .withIndex("by_published_at", (q) => 
        q.gte("publishedAt", cutoffTime)
      )
      .order("desc")
      .take(limit);
  },
});

// Get news by external ID
export const getNewsByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("news")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

// Clean up old news (keep last 7 days)
export const cleanupOldNews = mutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const oldNews = await ctx.db
      .query("news")
      .withIndex("by_published_at", (q) => 
        q.lt("publishedAt", sevenDaysAgo)
      )
      .collect();

    let deletedCount = 0;

    // Delete old news and their associations
    for (const news of oldNews) {
      // Delete associations first
      const associations = await ctx.db
        .query("newsStockAssociations")
        .withIndex("by_news", (q) => q.eq("newsId", news._id))
        .collect();
      
      for (const assoc of associations) {
        await ctx.db.delete(assoc._id);
      }
      
      // Delete news article
      await ctx.db.delete(news._id);
      deletedCount++;
    }

    return deletedCount;
  },
});

// Batch create news with associations
export const batchCreateNewsWithAssociations = mutation({
  args: {
    newsItems: v.array(
      v.object({
        externalId: v.string(),
        title: v.string(),
        summary: v.string(),
        url: v.string(),
        source: v.string(),
        publishedAt: v.number(),
        imageUrl: v.optional(v.string()),
        category: v.optional(v.string()),
        stockAssociations: v.array(
          v.object({
            symbol: v.string(),
            relevanceScore: v.number(),
            mentionType: v.union(v.literal("primary"), v.literal("secondary"), v.literal("mentioned")),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const item of args.newsItems) {
      // Create or update news
      const newsId = await ctx.db.insert("news", {
        externalId: item.externalId,
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        imageUrl: item.imageUrl,
        category: item.category,
        fetchedAt: Date.now(),
      });

      // Create associations
      const associationIds = [];
      for (const assoc of item.stockAssociations) {
        const assocId = await ctx.db.insert("newsStockAssociations", {
          newsId,
          symbol: assoc.symbol,
          relevanceScore: assoc.relevanceScore,
          mentionType: assoc.mentionType,
        });
        associationIds.push(assocId);
      }

      results.push({
        newsId,
        associationIds,
      });
    }

    return results;
  },
});

// Get trending symbols based on news volume
export const getTrendingSymbols = query({
  args: {
    hoursBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hoursBack || 24;
    const limit = args.limit || 10;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    // Get recent news
    const recentNews = await ctx.db
      .query("news")
      .withIndex("by_published_at", (q) => 
        q.gte("publishedAt", cutoffTime)
      )
      .collect();

    const recentNewsIds = recentNews.map(news => news._id);

    // Get associations for recent news
    const associations = await ctx.db
      .query("newsStockAssociations")
      .collect();

    const recentAssociations = associations.filter(assoc => 
      recentNewsIds.includes(assoc.newsId)
    );

    // Count mentions by symbol
    const symbolCounts: Record<string, number> = {};
    recentAssociations.forEach(assoc => {
      symbolCounts[assoc.symbol] = (symbolCounts[assoc.symbol] || 0) + 1;
    });

    // Sort and return top symbols
    return Object.entries(symbolCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([symbol, count]) => ({ symbol, newsCount: count }));
  },
});