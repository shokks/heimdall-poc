import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update news article with embedded stock associations
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
    // Embedded stock associations (much simpler!)
    relatedSymbols: v.array(v.string()),
    relevanceScores: v.array(v.number()),
    mentionTypes: v.array(v.union(v.literal("primary"), v.literal("secondary"), v.literal("mentioned"))),
  },
  handler: async (ctx, args) => {
    // Check if news already exists
    const existingNews = await ctx.db
      .query("news")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    const newsData = {
      externalId: args.externalId,
      title: args.title,
      summary: args.summary,
      url: args.url,
      source: args.source,
      publishedAt: args.publishedAt,
      imageUrl: args.imageUrl,
      category: args.category,
      relatedSymbols: args.relatedSymbols,
      relevanceScores: args.relevanceScores,
      mentionTypes: args.mentionTypes,
      fetchedAt: Date.now(),
    };

    if (existingNews) {
      // Update existing news
      await ctx.db.patch(existingNews._id, newsData);
      return existingNews._id;
    } else {
      // Create new news
      return await ctx.db.insert("news", newsData);
    }
  },
});

// Batch create multiple news articles with embedded associations
export const batchCreateNews = mutation({
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
        relatedSymbols: v.array(v.string()),
        relevanceScores: v.array(v.number()),
        mentionTypes: v.array(v.union(v.literal("primary"), v.literal("secondary"), v.literal("mentioned"))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const item of args.newsItems) {
      // Check if news already exists
      const existingNews = await ctx.db
        .query("news")
        .withIndex("by_external_id", (q) => q.eq("externalId", item.externalId))
        .first();

      if (!existingNews) {
        // Only create if it doesn't exist
        const newsId = await ctx.db.insert("news", {
          ...item,
          fetchedAt: Date.now(),
        });
        results.push(newsId);
      }
    }

    return results;
  },
});

// Get news for specific symbols with relevance filtering (much simpler!)
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

    // Get recent news
    const recentNews = await ctx.db
      .query("news")
      .withIndex("by_published_at", (q) => 
        q.gte("publishedAt", cutoffTime)
      )
      .order("desc")
      .collect();

    // Filter news by symbols and relevance (much simpler logic!)
    const relevantNews = recentNews
      .filter(news => {
        // Check if any of the user's symbols are in the related symbols
        for (let i = 0; i < news.relatedSymbols.length; i++) {
          const symbol = news.relatedSymbols[i];
          const relevance = news.relevanceScores[i] || 0;
          
          if (args.symbols.includes(symbol) && relevance >= minRelevance) {
            return true;
          }
        }
        return false;
      })
      .map(news => {
        // Add only the relevant symbols for this user
        const userRelevantSymbols = [];
        const userRelevanceScores = [];
        const userMentionTypes = [];

        for (let i = 0; i < news.relatedSymbols.length; i++) {
          const symbol = news.relatedSymbols[i];
          const relevance = news.relevanceScores[i] || 0;
          const mentionType = news.mentionTypes[i];

          if (args.symbols.includes(symbol) && relevance >= minRelevance) {
            userRelevantSymbols.push(symbol);
            userRelevanceScores.push(relevance);
            userMentionTypes.push(mentionType);
          }
        }

        return {
          ...news,
          // Override with only user-relevant symbols
          relatedSymbols: userRelevantSymbols,
          relevanceScores: userRelevanceScores,
          mentionTypes: userMentionTypes,
        };
      })
      .slice(0, limit);

    return relevantNews;
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

// Get trending symbols based on news volume (simplified)
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

    // Count mentions by symbol (much simpler with embedded data!)
    const symbolCounts: Record<string, { count: number; totalRelevance: number }> = {};
    
    recentNews.forEach(news => {
      news.relatedSymbols.forEach((symbol, index) => {
        const relevance = news.relevanceScores[index] || 0;
        
        if (!symbolCounts[symbol]) {
          symbolCounts[symbol] = { count: 0, totalRelevance: 0 };
        }
        
        symbolCounts[symbol].count += 1;
        symbolCounts[symbol].totalRelevance += relevance;
      });
    });

    // Sort by news count and average relevance
    return Object.entries(symbolCounts)
      .map(([symbol, data]) => ({
        symbol,
        newsCount: data.count,
        averageRelevance: data.totalRelevance / data.count,
        totalRelevance: data.totalRelevance,
      }))
      .sort((a, b) => {
        // Sort by total relevance first, then by count
        if (b.totalRelevance !== a.totalRelevance) {
          return b.totalRelevance - a.totalRelevance;
        }
        return b.newsCount - a.newsCount;
      })
      .slice(0, limit);
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

    // Delete old news (much simpler - no associations to clean up!)
    for (const news of oldNews) {
      await ctx.db.delete(news._id);
    }

    return oldNews.length;
  },
});

// Get news statistics
export const getNewsStatistics = query({
  args: {
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hoursBack || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    const recentNews = await ctx.db
      .query("news")
      .withIndex("by_published_at", (q) => 
        q.gte("publishedAt", cutoffTime)
      )
      .collect();

    // Calculate statistics
    const totalArticles = recentNews.length;
    const uniqueSymbols = new Set<string>();
    const sourceCount: Record<string, number> = {};
    
    recentNews.forEach(news => {
      // Count unique symbols
      news.relatedSymbols.forEach(symbol => uniqueSymbols.add(symbol));
      
      // Count by source
      sourceCount[news.source] = (sourceCount[news.source] || 0) + 1;
    });

    return {
      totalArticles,
      uniqueSymbolsCount: uniqueSymbols.size,
      sourceBreakdown: Object.entries(sourceCount).map(([source, count]) => ({
        source,
        count,
      })),
      timeframe: `${hoursBack} hours`,
    };
  },
});