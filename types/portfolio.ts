/**
 * Enhanced portfolio types with validation support
 */

import type { PortfolioPosition } from '@/lib/storage';

export interface EnhancedPortfolioPosition extends PortfolioPosition {
  confidence: number;
  gptConfidence?: number;
  marketValidation?: {
    isValid: boolean;
    confidence: number;
    source: 'finnhub' | 'cache' | 'error';
    marketCap?: number;
    error?: string;
  };
}

export interface ValidationSummary {
  totalParsed: number;
  passedBasicValidation: number;
  passedMarketValidation: number;
  invalidTickers: string[];
  lowConfidenceTickers?: string[];
  extractedCompanies?: string[];
  searchResults?: Array<{
    intent: string;
    found: string | null;
    confidence: number;
  }>;
  warnings: string[];
}

export interface ParsePortfolioResponse {
  positions: EnhancedPortfolioPosition[];
  validationSummary: ValidationSummary;
}

export interface PortfolioParsingResult {
  positions: PortfolioPosition[];
  validationSummary: ValidationSummary;
  hasWarnings: boolean;
  hasErrors: boolean;
}