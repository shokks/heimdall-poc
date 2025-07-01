'use client';

import React, { useState, useMemo } from 'react';
import { NewsItem, mockNewsData } from '@/data/mockNews';
import { 
  filterNewsForPortfolio, 
  convertPortfolioForNews,
  FilterOptions, 
  getNewsStats,
  groupNewsByImpact 
} from '@/lib/newsFilter';
import { PortfolioPosition } from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NewsDisplayProps {
  portfolio: PortfolioPosition[];
  className?: string;
}

export default function NewsDisplay({ portfolio, className = '' }: NewsDisplayProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    impact: 'all',
    timeframe: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });

  // Filter and sort news based on portfolio and options
  const filteredNews = useMemo(() => {
    const portfolioHoldings = convertPortfolioForNews(portfolio);
    return filterNewsForPortfolio(mockNewsData, portfolioHoldings, filterOptions);
  }, [portfolio, filterOptions]);

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

  if (filteredNews.length === 0) {
    return (
      <div className={`${className}`}>
        <Card className="bg-card border-border">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">No News Available</h3>
            <p className="text-muted-foreground">
              No recent news found for your portfolio holdings.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* News Statistics */}
      <Card className="bg-card border-border">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-3">Portfolio News Summary</h3>
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
        </div>
      </Card>

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