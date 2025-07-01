'use client';

import { useState, useEffect } from 'react';
import PortfolioInput from '@/components/PortfolioInput';
import { PortfolioDisplay } from '@/components/PortfolioDisplay';
import NewsDisplay from '@/components/NewsDisplay';
import InsightsDisplay from '@/components/InsightsDisplay';
import { type PortfolioPosition, hasPortfolio, loadPortfolio } from '@/lib/storage';

export default function Home() {
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);

  // Check if portfolio exists on mount
  useEffect(() => {
    const hasPortfolioData = hasPortfolio();
    setShowPortfolio(hasPortfolioData);
    if (hasPortfolioData) {
      setPortfolio(loadPortfolio());
    }
  }, []);

  const handlePortfolioParsed = (positions: PortfolioPosition[]) => {
    if (positions.length > 0) {
      setShowPortfolio(true);
      setPortfolio(positions);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {!showPortfolio ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
            <div className="text-center space-y-4 max-w-2xl">
              <h1 className="text-4xl font-bold tracking-tight">
                Portfolio Intelligence
              </h1>
              <p className="text-xl text-muted-foreground">
                Get personalized financial news for your stock portfolio. 
                Enter your holdings and see only the news that matters to you.
              </p>
            </div>
            <PortfolioInput onPortfolioParsed={handlePortfolioParsed} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Your Portfolio</h1>
                <p className="text-muted-foreground">
                  Real-time prices and daily changes for your holdings
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPortfolio(false);
                  setPortfolio([]);
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Edit Portfolio
              </button>
            </div>
            <PortfolioDisplay />
            
            {/* AI Insights Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">AI Portfolio Insights</h2>
                <p className="text-muted-foreground">
                  Personalized analysis and recommendations for your holdings
                </p>
              </div>
              <InsightsDisplay portfolio={portfolio} />
            </div>
            
            {/* News Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Portfolio News</h2>
                <p className="text-muted-foreground">
                  Financial news filtered for your holdings
                </p>
              </div>
              <NewsDisplay portfolio={portfolio} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
