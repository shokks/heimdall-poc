/**
 * Enhanced insight types for Phase II implementation
 * Supports multiple insight categories, time-specific observations, and personalization
 */

import type { PortfolioPosition } from '@/lib/storage';

// Core insight categories
export type InsightCategory = 'performance' | 'news' | 'market' | 'risk' | 'opportunity';

// Insight priority levels
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

// Insight impact types
export type InsightImpact = 'positive' | 'negative' | 'neutral' | 'warning';

// Time periods for insights
export type TimePeriod = 'realtime' | 'daily' | 'weekly' | 'monthly' | 'seasonal';

// Portfolio characteristics for personalization
export interface PortfolioCharacteristics {
  size: 'small' | 'medium' | 'large'; // Based on total value
  diversity: 'concentrated' | 'moderate' | 'diversified'; // Based on position count and allocation
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'; // Based on volatility and holdings
  investmentStyle: 'growth' | 'value' | 'dividend' | 'mixed'; // Based on stock characteristics
  holdingPeriod: 'new' | 'established'; // Based on historical data availability
}

// Market conditions context
export interface MarketContext {
  isMarketHours: boolean;
  marketStatus: 'pre-market' | 'open' | 'after-hours' | 'closed';
  timeUntilOpen?: number; // Minutes until market opens
  timeUntilClose?: number; // Minutes until market closes
  dayOfWeek: number; // 0-6 for Sunday-Saturday
  isEarningsSeason: boolean;
  isHolidayWeek: boolean;
}

// Enhanced news item structure
export interface EnhancedNewsItem {
  id: string;
  headline: string;
  summary: string;
  timestamp: string;
  relatedSymbols: string[];
  impact: InsightImpact;
  source: string;
  url: string;
  image?: string;
  category?: string;
  relevanceScore?: number;
  sentimentScore?: number; // -1 to 1 scale
  confidenceLevel?: number; // 0-1 scale
}

// Portfolio snapshot data for historical comparisons
export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  positions: Array<{
    symbol: string;
    shares: number;
    price: number;
    value: number;
  }>;
}

// Enhanced insight data structure
export interface InsightData {
  // Financial values
  value?: number;
  percentage?: number;
  previousValue?: number;
  
  // Related entities
  symbol?: string;
  symbols?: string[];
  companyName?: string;
  
  // Time-based comparisons
  timeframe?: TimePeriod;
  previousPeriodValue?: number;
  trend?: 'improving' | 'declining' | 'stable';
  
  // Risk metrics
  volatility?: number;
  beta?: number;
  sharpeRatio?: number;
  
  // Diversification metrics
  sectorAllocation?: Record<string, number>;
  concentrationRisk?: number;
  correlationRisk?: number;
  
  // News-based metrics
  newsCount?: number;
  sentimentAverage?: number;
  relevanceScore?: number;
  
  // Action items
  actionRequired?: boolean;
  actionType?: 'monitor' | 'review' | 'rebalance' | 'investigate';
  urgency?: 'immediate' | 'this_week' | 'this_month' | 'when_convenient';
}

// Main enhanced insight interface
export interface EnhancedInsight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  impact: InsightImpact;
  
  // Time and context
  timePeriod: TimePeriod;
  expiresAt?: Date; // When insight becomes stale
  isActionable: boolean;
  
  // Personalization
  relevanceScore: number; // 0-100 scale
  confidenceLevel: number; // 0-1 scale
  
  // Enhanced data
  data: InsightData;
  
  // Interaction tracking
  interactionId?: string;
  isDismissed?: boolean;
  isBookmarked?: boolean;
  lastShown?: Date;
  
  // Generation metadata
  generatedAt: Date;
  dataSource: 'realtime' | 'historical' | 'news' | 'calculated';
  version: string; // For insight template versioning
}

// Insight generation context
export interface InsightGenerationContext {
  portfolio: PortfolioPosition[];
  portfolioCharacteristics: PortfolioCharacteristics;
  marketContext: MarketContext;
  recentNews: EnhancedNewsItem[];
  historicalData: PortfolioSnapshot[];
  previousInsights?: EnhancedInsight[];
  userPreferences?: {
    preferredCategories?: InsightCategory[];
    minimumPriority?: InsightPriority;
    maxInsights?: number;
  };
}

// Insight generator interface
export interface InsightGenerator {
  category: InsightCategory;
  name: string;
  priority: number; // Higher = runs first
  minConfidence: number; // Minimum confidence to generate insight
  
  canGenerate(context: InsightGenerationContext): boolean;
  generate(context: InsightGenerationContext): Promise<EnhancedInsight[]>;
}

// Template for creating insights with consistent formatting
export interface InsightTemplate {
  id: string;
  category: InsightCategory;
  titleTemplate: string;
  descriptionTemplate: string;
  dataRequirements: string[];
  conditions: {
    minPortfolioSize?: number;
    minPositions?: number;
    requiredData?: string[];
    marketHoursOnly?: boolean;
  };
}

// Historical insight tracking
export interface InsightHistory {
  insightId: string;
  userId: string;
  generatedAt: Date;
  category: InsightCategory;
  priority: InsightPriority;
  wasAccurate?: boolean; // User feedback
  wasHelpful?: boolean; // User feedback
  actionTaken?: string; // What user did based on insight
}

// Export helper types
export type InsightMetrics = {
  totalGenerated: number;
  byCategory: Record<InsightCategory, number>;
  byPriority: Record<InsightPriority, number>;
  averageRelevanceScore: number;
  averageConfidenceLevel: number;
};

export type InsightFilters = {
  categories?: InsightCategory[];
  priorities?: InsightPriority[];
  impacts?: InsightImpact[];
  timePeriods?: TimePeriod[];
  minRelevanceScore?: number;
  minConfidenceLevel?: number;
  excludeDismissed?: boolean;
  onlyActionable?: boolean;
};