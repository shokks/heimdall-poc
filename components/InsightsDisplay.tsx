'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  BarChart3, 
  Newspaper, 
  PieChart,
  Target,
  Shield,
  Clock,
  X,
  Bookmark,
  Share,
  Info,
  ArrowRight,
  Zap
} from 'lucide-react';
import type { PortfolioPosition } from '@/lib/storage';
import {
  generatePortfolioInsights,
  getCachedInsights,
  setCachedInsights,
  type PortfolioInsight,
  type NewsItem
} from '@/lib/insights';
import {
  createInsightContext,
  convertToEnhancedNews,
  generateEnhancedInsights
} from '@/lib/enhanced-insights';
import type {
  EnhancedInsight,
  InsightCategory,
  InsightPriority,
  InsightImpact,
  EnhancedNewsItem,
  TimePeriod
} from '@/types/insights';

interface InsightsDisplayProps {
  portfolio: PortfolioPosition[];
  className?: string;
  recentNews?: any[]; // Finnhub news data
  historicalData?: any[]; // Portfolio snapshots
  useEnhancedInsights?: boolean; // Toggle for enhanced vs legacy insights
}

const getInsightIcon = (category: InsightCategory) => {
  switch (category) {
    case 'performance':
      return BarChart3;
    case 'news':
      return Newspaper;
    case 'market':
      return TrendingUp;
    case 'risk':
      return Shield;
    case 'opportunity':
      return Target;
    default:
      return AlertCircle;
  }
};

const getLegacyInsightIcon = (type: PortfolioInsight['type']) => {
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

const getImpactIcon = (impact: InsightImpact) => {
  switch (impact) {
    case 'positive':
      return TrendingUp;
    case 'negative':
      return TrendingDown;
    case 'warning':
      return AlertCircle;
    default:
      return Info;
  }
};

const getImpactColor = (impact: InsightImpact) => {
  switch (impact) {
    case 'positive':
      return 'text-green-600 dark:text-green-400';
    case 'negative':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-muted-foreground';
  }
};

const getBadgeVariant = (impact: InsightImpact) => {
  switch (impact) {
    case 'positive':
      return 'default' as const;
    case 'negative':
      return 'destructive' as const;
    case 'warning':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
};

const getPriorityColor = (priority: InsightPriority) => {
  switch (priority) {
    case 'critical':
      return 'text-red-600 dark:text-red-400';
    case 'high':
      return 'text-orange-600 dark:text-orange-400';
    case 'medium':
      return 'text-blue-600 dark:text-blue-400';
    case 'low':
      return 'text-gray-600 dark:text-gray-400';
    default:
      return 'text-muted-foreground';
  }
};

const getCategoryColor = (category: InsightCategory) => {
  switch (category) {
    case 'performance':
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
    case 'news':
      return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300';
    case 'market':
      return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
    case 'risk':
      return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
    case 'opportunity':
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
    default:
      return 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
  }
};

const EnhancedInsightCard = ({ 
  insight, 
  onDismiss, 
  onBookmark, 
  onShare 
}: { 
  insight: EnhancedInsight;
  onDismiss?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onShare?: (id: string) => void;
}) => {
  const IconComponent = getInsightIcon(insight.category);
  const ImpactIcon = getImpactIcon(insight.impact);
  const impactColor = getImpactColor(insight.impact);
  const badgeVariant = getBadgeVariant(insight.impact);
  const priorityColor = getPriorityColor(insight.priority);
  const categoryColor = getCategoryColor(insight.category);

  const formatTimePeriod = (period: string) => {
    switch (period) {
      case 'realtime': return 'Live';
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'seasonal': return 'Seasonal';
      default: return period;
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      insight.priority === 'critical' ? 'ring-2 ring-red-200 dark:ring-red-800' :
      insight.priority === 'high' ? 'ring-1 ring-orange-200 dark:ring-orange-800' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-accent/10 flex-shrink-0">
              <IconComponent className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
                  {insight.title}
                </CardTitle>
                {insight.priority === 'critical' && (
                  <Zap className="h-3 w-3 text-red-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0 ${categoryColor}`}
                >
                  {insight.category}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0 ${priorityColor}`}
                >
                  {insight.priority}
                </Badge>
                <span className="text-muted-foreground">
                  {formatTimePeriod(insight.timePeriod)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ImpactIcon className={`h-3 w-3 ${impactColor}`} />
            <Badge variant={badgeVariant} className="text-xs px-2 py-0">
              {insight.impact}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm leading-relaxed mb-3">
          {insight.description}
        </CardDescription>
        
        {/* Enhanced data display */}
        {insight.data && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-xs">
              {insight.data.symbol && (
                <span className="px-2 py-1 bg-muted rounded-md font-mono">
                  {insight.data.symbol}
                </span>
              )}
              {insight.data.symbols && (
                <span className="px-2 py-1 bg-muted rounded-md font-mono">
                  {insight.data.symbols.join(', ')}
                </span>
              )}
              {insight.data.value !== undefined && (
                <span className="px-2 py-1 bg-muted rounded-md">
                  {insight.data.value > 0 ? '+' : ''}${Math.abs(insight.data.value).toFixed(2)}
                </span>
              )}
              {insight.data.percentage !== undefined && (
                <span className={`px-2 py-1 bg-muted rounded-md font-medium ${
                  insight.data.percentage > 0 ? 'text-green-600' : 
                  insight.data.percentage < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  {insight.data.percentage > 0 ? '+' : ''}
                  {insight.data.percentage.toFixed(1)}%
                </span>
              )}
            </div>
            
            {/* Action indicators */}
            {insight.isActionable && insight.data.actionType && (
              <div className="flex items-center gap-2 p-2 bg-accent/5 rounded-md border border-accent/20">
                <ArrowRight className="h-3 w-3 text-accent-foreground" />
                <span className="text-xs font-medium text-accent-foreground">
                  Action: {insight.data.actionType}
                  {insight.data.urgency && (
                    <span className="text-muted-foreground ml-1">
                      ({insight.data.urgency.replace('_', ' ')})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Interaction buttons */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Score: {insight.relevanceScore}/100</span>
            <span className="mx-1">•</span>
            <span>Confidence: {(insight.confidenceLevel * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1">
            {onBookmark && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onBookmark(insight.id)}
              >
                <Bookmark className="h-3 w-3" />
              </Button>
            )}
            {onShare && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onShare(insight.id)}
              >
                <Share className="h-3 w-3" />
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onDismiss(insight.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LegacyInsightCard = ({ insight }: { insight: PortfolioInsight }) => {
  const IconComponent = getLegacyInsightIcon(insight.type);
  const ImpactIcon = getImpactIcon(insight.impact as InsightImpact);
  const impactColor = getImpactColor(insight.impact as InsightImpact);
  const badgeVariant = getBadgeVariant(insight.impact as InsightImpact);

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
              <span className={`px-2 py-1 bg-muted rounded-md font-medium ${
                insight.data.percentage > 0 ? 'text-green-600' : 
                insight.data.percentage < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}>
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


export default function InsightsDisplay({ 
  portfolio, 
  className = '',
  recentNews = [],
  historicalData = [],
  useEnhancedInsights = true
}: InsightsDisplayProps) {
  const [enhancedInsights, setEnhancedInsights] = useState<EnhancedInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [bookmarkedInsights, setBookmarkedInsights] = useState<Set<string>>(new Set());
  
  // Legacy insights calculation - using real news data
  const { legacyInsights, relevantNews } = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return { legacyInsights: [], relevantNews: [] };
    }

    // Convert recentNews to NewsItem format for compatibility
    const newsItems: NewsItem[] = recentNews.map((item: any) => ({
      id: item.id || item.externalId || String(Date.now()),
      headline: item.headline || item.title || '',
      ticker: item.relatedSymbols?.[0] || '',
      impact: item.impact || 'neutral',
      timestamp: item.timestamp || new Date(item.publishedAt || Date.now()).toISOString(),
      description: item.summary || item.description || ''
    }));

    // Filter news for portfolio symbols
    const portfolioSymbols = portfolio.map(pos => pos.symbol);
    const relevantNews = newsItems.filter(item => 
      item.ticker && portfolioSymbols.includes(item.ticker)
    );
    
    const legacyInsights = generatePortfolioInsights(portfolio, relevantNews);
    
    return { legacyInsights, relevantNews };
  }, [portfolio, recentNews]);
  
  // Enhanced insights generation
  useEffect(() => {
    if (!useEnhancedInsights || !portfolio || portfolio.length === 0) {
      return;
    }
    
    const generateInsights = async () => {
      setLoading(true);
      try {
        const enhancedNews = convertToEnhancedNews(recentNews, portfolio);
        const context = createInsightContext(
          portfolio,
          enhancedNews,
          historicalData
        );
        
        // Generate cache key from context
        const symbols = portfolio.map(p => p.symbol);
        const totalValue = portfolio.reduce((sum, pos) => sum + (pos.totalValue || 0), 0);
        const cacheKey = `insights_${symbols.join('_')}_${totalValue}_${enhancedNews.length}`;
        let insights = getCachedInsights(cacheKey);
        
        if (!insights) {
          // For now, fallback to legacy insights since enhanced insights aren't fully implemented
          // Convert enhanced news to NewsItem format
          const newsItems: NewsItem[] = enhancedNews.map(item => ({
            id: item.id,
            headline: item.headline,
            ticker: item.relatedSymbols?.[0] || '',
            impact: item.impact === 'warning' ? 'neutral' : item.impact as 'positive' | 'negative' | 'neutral',
            timestamp: item.timestamp,
            description: item.summary
          }));
          insights = generatePortfolioInsights(portfolio, newsItems);
          // Cache the results for future use
          setCachedInsights(cacheKey, insights);
        }
        // Convert legacy insights to enhanced insights format for display
        const enhancedInsightsList: EnhancedInsight[] = insights.map((insight, index) => ({
          id: insight.id,
          category: insight.type as InsightCategory,
          priority: 'medium' as InsightPriority,
          title: insight.title,
          description: insight.description,
          impact: insight.impact as InsightImpact,
          timePeriod: 'daily' as TimePeriod,
          isActionable: false,
          relevanceScore: 75,
          confidenceLevel: 0.8,
          data: insight.data || {},
          generatedAt: new Date(),
          dataSource: 'calculated' as const,
          version: '1.0'
        }));
        setEnhancedInsights(enhancedInsightsList.filter(insight => !dismissedInsights.has(insight.id)));
      } catch (error) {
        console.error('Failed to generate enhanced insights:', error);
        // Fallback to legacy insights on error
      } finally {
        setLoading(false);
      }
    };
    
    generateInsights();
  }, [portfolio, recentNews, historicalData, useEnhancedInsights, dismissedInsights]);
  
  const handleDismissInsight = (id: string) => {
    setDismissedInsights(prev => new Set([...prev, id]));
    setEnhancedInsights(prev => prev.filter(insight => insight.id !== id));
  };
  
  const handleBookmarkInsight = (id: string) => {
    setBookmarkedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const handleShareInsight = (id: string) => {
    const insight = enhancedInsights.find(i => i.id === id);
    if (insight && navigator.share) {
      navigator.share({
        title: insight.title,
        text: insight.description,
        url: window.location.href
      }).catch(console.error);
    } else if (insight) {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${insight.title}: ${insight.description}`);
    }
  };
  
  const insights = useEnhancedInsights ? enhancedInsights : legacyInsights;

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent-foreground" />
            <h2 className="text-lg font-semibold">
              {useEnhancedInsights ? 'AI Portfolio Insights' : 'Portfolio Insights'}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {insights.length}
            </Badge>
            {useEnhancedInsights && (
              <Badge variant="outline" className="text-xs">
                Enhanced
              </Badge>
            )}
          </div>
          {bookmarkedInsights.size > 0 && (
            <Badge variant="outline" className="text-xs">
              {bookmarkedInsights.size} bookmarked
            </Badge>
          )}
        </div>
        
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm">Generating personalized insights...</p>
              </div>
            </CardContent>
          </Card>
        ) : insights.length > 0 ? (
          <div className="space-y-4">
            {/* Critical insights first */}
            {useEnhancedInsights && enhancedInsights.filter(i => i.priority === 'critical').length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  <h3 className="font-semibold text-red-600 dark:text-red-400">Critical Alerts</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {enhancedInsights
                    .filter(i => i.priority === 'critical')
                    .map((insight) => (
                      <EnhancedInsightCard 
                        key={insight.id} 
                        insight={insight}
                        onDismiss={handleDismissInsight}
                        onBookmark={handleBookmarkInsight}
                        onShare={handleShareInsight}
                      />
                    ))
                  }
                </div>
              </div>
            )}
            
            {/* Regular insights */}
            <div className="grid gap-4 md:grid-cols-2">
              {(useEnhancedInsights ? 
                enhancedInsights.filter(i => i.priority !== 'critical') :
                legacyInsights
              ).map((insight: any) => 
                useEnhancedInsights ? (
                  <EnhancedInsightCard 
                    key={insight.id} 
                    insight={insight}
                    onDismiss={handleDismissInsight}
                    onBookmark={handleBookmarkInsight}
                    onShare={handleShareInsight}
                  />
                ) : (
                  <LegacyInsightCard key={insight.id} insight={insight} />
                )
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {useEnhancedInsights ? 
                    'Add stocks to your portfolio to see AI-powered insights' :
                    'Waiting for stock price data to generate insights'
                  }
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