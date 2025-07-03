'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { NewsItem } from '@/data/mockNews';
import { ProcessedNewsItem } from '@/app/api/financial-news/route';
import { 
  FilterOptions, 
  getNewsStats,
  groupNewsByImpact 
} from '@/lib/newsFilter';
import { PortfolioPosition } from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle, Clock } from 'lucide-react';

interface NewsDisplayProps {
  portfolio: PortfolioPosition[];
  className?: string;
}

interface NewsState {
  news: ProcessedNewsItem[];
  loading: boolean;
  error: string | null;
  cached: boolean;
  lastUpdated: string | null;
}

export default function NewsDisplay({ portfolio, className = '' }: NewsDisplayProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    impact: 'all',
    timeframe: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  
  const [newsState, setNewsState] = useState<NewsState>({
    news: [],
    loading: false,
    error: null,
    cached: false,
    lastUpdated: null
  });
  
  const [useRealData, setUseRealData] = useState(true);
  const [forceAPIFetch, setForceAPIFetch] = useState(false);

  // Get portfolio symbols for Convex query
  const symbols = portfolio?.map(p => p.symbol) || [];
  
  // Query news from Convex database
  const convexNews = useQuery(
    api.news.getNewsForSymbols,
    symbols.length > 0 ? {
      symbols,
      minRelevanceScore: 0.3,
      limit: 50,
      hoursBack: 48 // Show last 48 hours of news
    } : "skip"
  );

  // Fetch real news data
  const fetchNews = async (showLoading = true) => {
    if (!portfolio || portfolio.length === 0) {
      setNewsState(prev => ({ ...prev, news: [], loading: false, error: null }));
      return;
    }

    if (showLoading) {
      setNewsState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const symbols = portfolio.map(p => p.symbol).join(',');
      const portfolioData = encodeURIComponent(JSON.stringify(portfolio));
      
      const response = await fetch(
        `/api/financial-news?symbols=${symbols}&portfolio=${portfolioData}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }
      
      const data = await response.json();
      
      setNewsState({
        news: data.news || [],
        loading: false,
        error: null,
        cached: data.cached || false,
        lastUpdated: data.timestamp
      });
    } catch (error) {
      console.error('Failed to fetch news:', error);
      setNewsState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch news'
      }));
    }
  };
  
  // Update news state based on Convex data or API fallback
  useEffect(() => {
    if (convexNews && convexNews.length > 0 && !forceAPIFetch) {
      // Use Convex data as primary source
      const processedNews: ProcessedNewsItem[] = convexNews.map(item => ({
        id: item.externalId,
        headline: item.title,
        summary: item.summary,
        timestamp: new Date(item.publishedAt).toISOString(),
        relatedSymbols: item.relatedSymbols,
        impact: getImpactFromRelevance(item),
        source: item.source,
        url: item.url,
        relevanceScore: Math.max(...item.relevanceScores)
      }));

      setNewsState({
        news: processedNews,
        loading: false,
        error: null,
        cached: true, // Convex data is persisted
        lastUpdated: new Date().toISOString()
      });
    } else if (useRealData && portfolio && portfolio.length > 0 && (!convexNews || forceAPIFetch)) {
      // Fallback to direct API if no Convex data or forced refresh
      fetchNews();
    } else if (!useRealData) {
      // Clear news when switching to demo mode (user choice)
      setNewsState({
        news: [],
        loading: false,
        error: null,
        cached: false,
        lastUpdated: null
      });
    }
  }, [portfolio, useRealData, convexNews, forceAPIFetch]);

  // Helper to determine impact from relevance and mention types
  const getImpactFromRelevance = (item: any): 'positive' | 'negative' | 'neutral' => {
    // Simple heuristic: primary mentions are more impactful
    const hasPrimary = item.mentionTypes?.includes('primary');
    const avgRelevance = item.relevanceScores.reduce((a: number, b: number) => a + b, 0) / item.relevanceScores.length;
    
    // You could enhance this with sentiment analysis
    if (hasPrimary && avgRelevance > 0.7) {
      return 'positive'; // High relevance primary mentions
    } else if (avgRelevance < 0.5) {
      return 'neutral'; // Low relevance
    }
    return 'neutral'; // Default to neutral without sentiment analysis
  };
  
  // Convert ProcessedNewsItem to NewsItem for compatibility with existing filter logic
  const convertToNewsItem = (item: ProcessedNewsItem): NewsItem => ({
    id: item.id,
    headline: item.headline,
    summary: item.summary,
    timestamp: item.timestamp,
    relatedSymbols: item.relatedSymbols,
    impact: item.impact,
    source: item.source,
    url: item.url
  });
  
  // Helper functions
  const getFilterDate = (now: Date, timeframe: string): Date => {
    const filterDate = new Date(now);
    switch (timeframe) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      default:
        return new Date(0);
    }
    return filterDate;
  };
  
  const getImpactScore = (impact: string): number => {
    switch (impact) {
      case 'positive': return 3;
      case 'negative': return 2;
      case 'neutral': return 1;
      default: return 0;
    }
  };
  
  // Filter and sort news based on portfolio and options
  const filteredNews = useMemo(() => {
    if (newsState.news.length > 0) {
      // Apply filtering and sorting to real news data
      let filtered = [...newsState.news];
      
      // Apply impact filter
      if (filterOptions.impact && filterOptions.impact !== 'all') {
        filtered = filtered.filter(item => item.impact === filterOptions.impact);
      }
      
      // Apply timeframe filter
      if (filterOptions.timeframe && filterOptions.timeframe !== 'all') {
        const now = new Date();
        const filterDate = getFilterDate(now, filterOptions.timeframe);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.timestamp);
          return itemDate >= filterDate;
        });
      }
      
      // Sort by selected option
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (filterOptions.sortBy) {
          case 'timestamp':
            comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            break;
          case 'relevance':
            comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
            break;
          case 'impact':
            comparison = getImpactScore(b.impact) - getImpactScore(a.impact);
            break;
          default:
            comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }
        return filterOptions.sortOrder === 'asc' ? comparison : -comparison;
      });
      
      return filtered.map(convertToNewsItem);
    } else {
      // No news available - return empty array
      return [];
    }
  }, [portfolio, filterOptions, newsState.news]);

  // Get news statistics
  const newsStats = useMemo(() => {
    return getNewsStats(filteredNews);
  }, [filteredNews]);

  // Group news by impact for better organization
  const groupedNews = useMemo(() => {
    return groupNewsByImpact(filteredNews);
  }, [filteredNews]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'status-success';
      case 'negative':
        return 'status-error';
      case 'neutral':
        return 'bg-muted text-muted-foreground hover:bg-muted/80 border-border';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80 border-border';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return '↗';
      case 'negative':
        return '↘';
      case 'neutral':
        return '→';
      default:
        return '→';
    }
  };

  if (!portfolio || portfolio.length === 0) {
    return (
      <div className={`${className}`}>
        <Card className="bg-card border-border">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">No Portfolio Found</h3>
            <p className="text-muted-foreground">
              Add stocks to your portfolio to see relevant financial news.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (filteredNews.length === 0 && !newsState.loading && !newsState.error) {
    return (
      <div className={`${className}`}>
        <Card className="bg-card border-border">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">No News Available</h3>
            <p className="text-muted-foreground">
              {newsState.news.length === 0 
                ? "News data is being fetched automatically. Check back in a few minutes."
                : "No news found matching your current filters. Try adjusting the timeframe or impact filters."}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Loading State */}
      {newsState.loading && (
        <Card className="bg-card border-border">
          <div className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-muted-foreground">Loading latest financial news...</p>
          </div>
        </Card>
      )}
      
      {/* Error State */}
      {newsState.error && (
        <Card className="bg-card border-destructive/50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive">Failed to Load News</h3>
            </div>
            <p className="text-muted-foreground mb-3">{newsState.error}</p>
            <button
              onClick={() => fetchNews()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </Card>
      )}
      
      {/* News Statistics */}
      {!newsState.loading && (
        <Card className="bg-card border-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">Portfolio News Summary</h3>
              <div className="flex items-center gap-2">
                {/* News source indicator */}
                {convexNews && !forceAPIFetch && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Database
                  </Badge>
                )}
                {newsState.cached && forceAPIFetch && (
                  <Badge variant="outline" className="text-xs">
                    API
                  </Badge>
                )}
                {/* Manual refresh button */}
                {useRealData && (
                  <button
                    onClick={() => {
                      setForceAPIFetch(true);
                      fetchNews(false);
                      // Reset force flag after fetch
                      setTimeout(() => setForceAPIFetch(false), 5000);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Fetch latest news from API"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <Badge variant="outline" className="text-xs">
                  Live Data
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{newsStats.total}</div>
                <div className="text-sm text-muted-foreground">Total News</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold price-positive">{newsStats.positive}</div>
                <div className="text-sm text-muted-foreground">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold price-negative">{newsStats.negative}</div>
                <div className="text-sm text-muted-foreground">Negative</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{newsStats.neutral}</div>
                <div className="text-sm text-muted-foreground">Neutral</div>
              </div>
            </div>
            {newsState.lastUpdated && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {new Date(newsState.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Filter Controls */}
      <Card className="bg-card border-border">
        <div className="p-4">
          <h4 className="text-md font-medium text-foreground mb-3">Filter Options</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Impact Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Impact</label>
              <select
                value={filterOptions.impact}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, impact: e.target.value as any }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Impact</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            {/* Timeframe Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Timeframe</label>
              <select
                value={filterOptions.timeframe}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, timeframe: e.target.value as any }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Sort By</label>
              <select
                value={filterOptions.sortBy}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="timestamp">Time</option>
                <option value="relevance">Relevance</option>
                <option value="impact">Impact</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Order</label>
              <select
                value={filterOptions.sortOrder}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* News Items */}
      <div className="space-y-4">
        {filteredNews.map((newsItem) => (
          <Card key={newsItem.id} className="bg-card border-border hover:shadow-md transition-shadow">
            <div className="p-4">
              {/* Header with impact and timestamp */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={getImpactColor(newsItem.impact)}>
                    <span className="mr-1">{getImpactIcon(newsItem.impact)}</span>
                    {newsItem.impact.charAt(0).toUpperCase() + newsItem.impact.slice(1)}
                  </Badge>
                  <div className="flex gap-1">
                    {newsItem.relatedSymbols.map((symbol) => (
                      <Badge key={symbol} variant="outline" className="text-xs border-border">
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTimestamp(newsItem.timestamp)}
                </div>
              </div>

              {/* Headline */}
              <h4 className="text-lg font-semibold text-foreground mb-2 leading-tight">
                {newsItem.headline}
              </h4>

              {/* Summary */}
              <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                {newsItem.summary}
              </p>

              {/* Footer with source */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Source: {newsItem.source}</span>
                <a
                  href={newsItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Read more →
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Load More or Pagination could go here in a real implementation */}
      {filteredNews.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredNews.length} news item{filteredNews.length !== 1 ? 's' : ''} for your portfolio
          </p>
        </div>
      )}
    </div>
  );
}