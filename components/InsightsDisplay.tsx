'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, BarChart3, Newspaper, PieChart } from 'lucide-react';
import type { PortfolioPosition } from '@/lib/storage';
import { generatePortfolioInsights, filterRelevantNews, mockNewsData, type PortfolioInsight, type NewsItem } from '@/lib/insights';

interface InsightsDisplayProps {
  portfolio: PortfolioPosition[];
  className?: string;
}

const getInsightIcon = (type: PortfolioInsight['type']) => {
  switch (type) {
    case 'performance':
      return BarChart3;
    case 'movers':
      return TrendingUp;
    case 'news':
      return Newspaper;
    case 'allocation':
      return PieChart;
    default:
      return AlertCircle;
  }
};

const getImpactIcon = (impact: PortfolioInsight['impact']) => {
  switch (impact) {
    case 'positive':
      return TrendingUp;
    case 'negative':
      return TrendingDown;
    default:
      return AlertCircle;
  }
};

const getImpactColor = (impact: PortfolioInsight['impact']) => {
  switch (impact) {
    case 'positive':
      return 'text-chart-2'; // Green from theme
    case 'negative':
      return 'text-chart-4'; // Red from theme
    default:
      return 'text-muted-foreground';
  }
};

const getBadgeVariant = (impact: PortfolioInsight['impact']) => {
  switch (impact) {
    case 'positive':
      return 'default' as const;
    case 'negative':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
};

const InsightCard = ({ insight }: { insight: PortfolioInsight }) => {
  const IconComponent = getInsightIcon(insight.type);
  const ImpactIcon = getImpactIcon(insight.impact);
  const impactColor = getImpactColor(insight.impact);
  const badgeVariant = getBadgeVariant(insight.impact);

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <IconComponent className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-medium line-clamp-2">
                {insight.title}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ImpactIcon className={`h-3 w-3 ${impactColor}`} />
            <Badge variant={badgeVariant} className="text-xs px-2 py-0">
              {insight.impact}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm leading-relaxed">
          {insight.description}
        </CardDescription>
        
        {insight.data && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {insight.data.symbol && (
              <span className="px-2 py-1 bg-muted rounded-md font-mono">
                {insight.data.symbol}
              </span>
            )}
            {insight.data.value !== undefined && (
              <span className="px-2 py-1 bg-muted rounded-md">
                {insight.data.value > 0 ? '+' : ''}
                {insight.data.value.toFixed(2)}
              </span>
            )}
            {insight.data.percentage !== undefined && (
              <span className={`px-2 py-1 bg-muted rounded-md font-medium ${getImpactColor(insight.data.percentage > 0 ? 'positive' : insight.data.percentage < 0 ? 'negative' : 'neutral')}`}>
                {insight.data.percentage > 0 ? '+' : ''}
                {insight.data.percentage.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const NewsCard = ({ newsItem }: { newsItem: NewsItem }) => {
  const impactColor = getImpactColor(newsItem.impact);
  const ImpactIcon = getImpactIcon(newsItem.impact);

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">
              {newsItem.headline}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <ImpactIcon className={`h-3 w-3 ${impactColor}`} />
              <Badge variant="outline" className="text-xs px-2 py-0">
                {newsItem.ticker}
              </Badge>
            </div>
          </div>
          
          {newsItem.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {newsItem.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{newsItem.timestamp}</span>
            <Badge 
              variant={getBadgeVariant(newsItem.impact)} 
              className="text-xs px-2 py-0"
            >
              {newsItem.impact}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function InsightsDisplay({ portfolio, className = '' }: InsightsDisplayProps) {
  const { insights, relevantNews } = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return { insights: [], relevantNews: [] };
    }

    const relevantNews = filterRelevantNews(mockNewsData, portfolio);
    const insights = generatePortfolioInsights(portfolio, relevantNews);
    
    return { insights, relevantNews };
  }, [portfolio]);

  if (!portfolio || portfolio.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add stocks to your portfolio to see personalized insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Insights Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent-foreground" />
          <h2 className="text-lg font-semibold">AI Portfolio Insights</h2>
          <Badge variant="secondary" className="text-xs">
            {insights.length}
          </Badge>
        </div>
        
        {insights.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Waiting for stock price data to generate insights
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Relevant News Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-accent-foreground" />
          <h2 className="text-lg font-semibold">News for Your Stocks</h2>
          <Badge variant="secondary" className="text-xs">
            {relevantNews.length}
          </Badge>
        </div>
        
        {relevantNews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {relevantNews.slice(0, 6).map((newsItem) => (
              <NewsCard key={newsItem.id} newsItem={newsItem} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Newspaper className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  No recent news found for your current holdings
                </p>
                <p className="text-xs mt-1">
                  Try adding more stocks to see relevant news updates
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Portfolio Summary */}
      {portfolio.length > 0 && (
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Portfolio Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Holdings:</span>
                <Badge variant="outline" className="text-xs">
                  {portfolio.length} stock{portfolio.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Symbols:</span>
                <span className="font-mono text-accent-foreground">
                  {portfolio.map(p => p.symbol).join(', ')}
                </span>
              </div>
              {portfolio.some(p => p.totalValue) && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium text-accent-foreground">
                    ${portfolio.reduce((sum, p) => sum + (p.totalValue || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}