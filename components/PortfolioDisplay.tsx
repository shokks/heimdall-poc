'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  type PortfolioPosition,
  calculatePortfolioValue,
  calculatePortfolioDailyChange,
} from '@/lib/storage';
import { enrichPortfolioWithPrices, clearStockPriceCache } from '@/lib/api';
import { TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react';

/**
 * PortfolioDisplay component shows the user's portfolio with real-time stock prices
 * Features:
 * - Real-time stock prices from Alpha Vantage API
 * - Daily change indicators with color coding
 * - Portfolio summary with total value and daily P&L
 * - Responsive card layout for position details
 * - Manual refresh capability
 * - Loading states and error handling
 */
interface PortfolioDisplayProps {
  portfolio: PortfolioPosition[];
}

export function PortfolioDisplay({ portfolio: initialPortfolio }: PortfolioDisplayProps) {
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(initialPortfolio || []);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track newly added positions for highlight/badge
  const [recentPositions, setRecentPositions] = useState<Record<string, number>>({});
  const NEW_HIGHLIGHT_DURATION = 5000; // ms

  // Update portfolio when props change
  useEffect(() => {
    setPortfolio(initialPortfolio || []);

    // Track newly added positions (with lastUpdated timestamp from backend)
    if (initialPortfolio) {
      const now = Date.now();
      const newEntries: Record<string, number> = {};
      initialPortfolio.forEach((pos) => {
        if (
          pos.lastUpdated &&
          now - pos.lastUpdated < NEW_HIGHLIGHT_DURATION &&
          !(pos.symbol in recentPositions)
        ) {
          newEntries[pos.symbol] = pos.lastUpdated + NEW_HIGHLIGHT_DURATION;
        }
      });
      if (Object.keys(newEntries).length > 0) {
        setRecentPositions((prev) => ({ ...prev, ...newEntries }));
      }
    }

    // Fetch prices immediately for positions
    if (initialPortfolio && initialPortfolio.length > 0) {
      fetchStockPrices(initialPortfolio);
    }
  }, [initialPortfolio]);

  // Clean up expired recent positions periodically
  useEffect(() => {
    if (Object.keys(recentPositions).length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setRecentPositions((prev) => {
        const updated: Record<string, number> = {};
        Object.entries(prev).forEach(([symbol, expiry]) => {
          if (expiry > now) updated[symbol] = expiry;
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recentPositions]);

  const fetchStockPrices = useCallback(async (positions: PortfolioPosition[]) => {
    if (positions.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedPortfolio = await enrichPortfolioWithPrices(positions);
      setPortfolio(updatedPortfolio);
      setLastUpdated(new Date());
      // Note: Portfolio saving is now handled by dashboard component via Convex
    } catch (err) {
      console.error('Error fetching stock prices:', err);
      setError('Failed to update stock prices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPrices = (skipCache = false) => {
    if (skipCache) {
      clearStockPriceCache();
    }
    fetchStockPrices(portfolio);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percentString: string) => {
    // Remove the % sign and convert to number for formatting
    const percent = parseFloat(percentString.replace('%', ''));
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (portfolio.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Portfolio Found</h3>
          <p className="text-muted-foreground text-center">
            Add some stocks to your portfolio to see them displayed here with real-time prices.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalValue = calculatePortfolioValue(portfolio);
  const { totalChange, totalChangePercent } = calculatePortfolioDailyChange(portfolio);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Portfolio Summary</CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => refreshPrices(false)}
                disabled={isLoading}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                title="Refresh (use cache if available)"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => refreshPrices(true)}
                disabled={isLoading}
                className="px-3 py-2 text-xs rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                title="Force refresh (skip cache)"
              >
                Force
              </button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {portfolio.length > 0 && portfolio[0].source && (
                <span className="ml-2">
                  • Source: {portfolio[0].source === 'alphavantage' ? 'Alpha Vantage' : 
                           portfolio[0].source === 'finnhub' ? 'Finnhub' :
                           portfolio[0].source === 'demo' ? 'Demo' : 'Cache'}
                </span>
              )}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Change</p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-bold ${
                    totalChange >= 0 ? 'text-accent' : 'text-destructive'
                  }`}
                >
                  {formatCurrency(totalChange)}
                </span>
                <Badge
                  variant={totalChange >= 0 ? 'default' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {totalChange >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Position Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolio.map((position) => {
          const isNew = position.symbol in recentPositions;
          const cardClasses = isNew
            ? 'relative border-primary/40 bg-primary/5 animate-pulse'
            : 'relative';
          return (
            <Card key={position.symbol} className={cardClasses}>
              {/* NEW badge */}
              {isNew && (
                <span className="absolute top-2 right-2 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-bounce" role="status" aria-label="New position added">NEW</span>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">{position.symbol}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {position.companyName}
                    </p>
                  </div>
                  {position.currentPrice && position.dailyChange !== undefined && (
                    <Badge
                      variant={position.dailyChange >= 0 ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {position.dailyChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {position.dailyChangePercent && formatPercent(position.dailyChangePercent)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Shares</p>
                    <p className="font-semibold">{position.shares.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Price</p>
                    <p className="font-semibold">
                      {position.currentPrice ? formatCurrency(position.currentPrice) : (
                        <span className="text-muted-foreground">Loading...</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="font-bold text-lg">
                      {position.totalValue ? formatCurrency(position.totalValue) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </p>
                  </div>
                  {position.currentPrice && position.dailyChange !== undefined && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">Daily P&L</p>
                      <p
                        className={`font-semibold text-sm ${
                          position.dailyChange >= 0 ? 'text-accent' : 'text-destructive'
                        }`}
                      >
                        {position.dailyChange >= 0 ? '+' : ''}
                        {formatCurrency(position.dailyChange * position.shares)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <p>Updating stock prices...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}