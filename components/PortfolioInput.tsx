'use client';

import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { parsePortfolioWithValidation } from '@/lib/api';
import { type PortfolioPosition } from '@/lib/storage';
import { type ValidationSummary } from '@/types/portfolio';
import { Input } from '@/components/ui/input';

interface PortfolioInputProps {
  onPortfolioParsed: (positions: PortfolioPosition[]) => void;
  compact?: boolean;
  placeholder?: string;
}

export default function PortfolioInput({
  onPortfolioParsed,
  compact = false,
  placeholder,
}: PortfolioInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError('Please enter your portfolio information');
      return;
    }

    setLoading(true);
    setError(null);
    setValidationSummary(null);
    setShowValidation(false);

    try {
      const result = await parsePortfolioWithValidation(input.trim());

      if (result.positions.length === 0) {
        setError(
          'No valid stock positions found. Please try rephrasing your portfolio description.'
        );
        setValidationSummary(result.validationSummary);
        setShowValidation(true);
        return;
      }

      // Auto-save valid positions immediately
      onPortfolioParsed(result.positions);

      // Show success feedback and validation summary if needed
      if (result.hasWarnings || (result.validationSummary.lowConfidenceTickers?.length ?? 0) > 0) {
        setValidationSummary(result.validationSummary);
        setShowValidation(true);
      } else {
        // Show brief success message for clean additions
        setValidationSummary(result.validationSummary);
        setShowValidation(true);
        // Auto-hide after 3 seconds for successful additions
        setTimeout(() => setShowValidation(false), 3000);
      }

      // Clear input immediately for next addition
      setInput('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to parse portfolio. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputPlaceholder = placeholder ||
    (compact ? 'Add more stocks: Tesla, Netflix...' : "I own 100 Apple shares, some Tesla stock, and Microsoft...");

  return (
    <Card className={compact ? 'w-full' : 'mx-auto w-full max-w-2xl'}>
      <CardHeader>
        <CardTitle>Your Portfolio, Your News</CardTitle>
        <CardDescription>
          Just describe your holdings in plain English. We'll instantly filter 
          the entire financial world down to what matters for your money.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            {compact ? (
              <Input
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputPlaceholder}
                value={input}
              />
            ) : (
              <Textarea
                className="min-h-24"
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputPlaceholder}
                value={input}
              />
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            
            {/* Validation Summary */}
            {showValidation && validationSummary && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Validation Results</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  {validationSummary.extractedCompanies && validationSummary.extractedCompanies.length > 0 && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5" />
                      <div>
                        <span className="text-blue-600">Extracted intents:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {validationSummary.extractedCompanies.map(company => (
                            <Badge key={company} variant="secondary" className="text-xs">
                              {company}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {validationSummary.searchResults && validationSummary.searchResults.length > 0 && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                      <div>
                        <span className="text-green-600">Search results:</span>
                        <div className="space-y-1 mt-1">
                          {validationSummary.searchResults.map((result, index) => (
                            <div key={index} className="text-xs flex items-center gap-2">
                              <span className="text-muted-foreground">"{result.intent}" →</span>
                              {result.found ? (
                                <Badge variant="outline" className="text-xs">
                                  {result.found}
                                </Badge>
                              ) : (
                                <span className="text-red-500">No match found</span>
                              )}
                              <span className="text-muted-foreground">
                                ({Math.round(result.confidence * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{validationSummary.passedMarketValidation} of {validationSummary.totalParsed} mapped to valid tickers</span>
                  </div>
                  
                  {validationSummary.invalidTickers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5" />
                      <div>
                        <span className="text-red-600">Invalid tickers:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {validationSummary.invalidTickers.map(ticker => (
                            <Badge key={ticker} variant="destructive" className="text-xs">
                              {ticker}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {validationSummary.lowConfidenceTickers && validationSummary.lowConfidenceTickers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5" />
                      <div>
                        <span className="text-orange-600">Low confidence:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {validationSummary.lowConfidenceTickers.map(ticker => (
                            <Badge key={ticker} variant="outline" className="text-xs border-orange-300">
                              {ticker}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {validationSummary.warnings.length > 0 && (
                    <div className="space-y-1">
                      {validationSummary.warnings.map((warning, index) => (
                        <div key={index} className="text-orange-600 text-xs">
                          • {warning}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowValidation(false)}
                  className="text-xs h-6"
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>

          <Button
            className={compact ? '' : 'w-full'}
            disabled={loading || !input.trim()}
            type="submit"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Your Portfolio...
              </>
            ) : (
              'Show Me My News'
            )}
          </Button>
        </form>

        {!compact && (
        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            ✨ <strong>Try:</strong> "I have Apple, Tesla, and some Google stock" or "100 AAPL, 50 TSLA"
          </p>
        </div>)
        }
      </CardContent>
    </Card>
  );
}
