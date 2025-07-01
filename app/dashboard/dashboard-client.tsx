'use client';

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../convex/_generated/api';
import PortfolioInput from '@/components/PortfolioInput';
import { PortfolioDisplay } from '@/components/PortfolioDisplay';
import NewsDisplay from '@/components/NewsDisplay';
import InsightsDisplay from '@/components/InsightsDisplay';
import { 
  type PortfolioPosition, 
  hasPortfolioInLocalStorage, 
  loadPortfolioFromLocalStorage,
  clearPortfolioFromLocalStorage 
} from '@/lib/storage';
import { Settings2 } from 'lucide-react';

export default function DashboardClient() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [recentNews, setRecentNews] = useState<any[]>([]);

  // Convex hooks
  const portfolio = useQuery(
    api.portfolios.getPortfolioByUser, 
    user ? { clerkId: user.id } : "skip"
  );
  const historicalData = useQuery(
    api.portfolioSnapshots.getHistoricalData,
    user ? { clerkId: user.id, days: 30 } : "skip"
  );
  const createUser = useMutation(api.users.createUser);
  const savePortfolio = useMutation(api.portfolios.savePortfolio);
  const createSnapshot = useMutation(api.portfolioSnapshots.createSnapshot);

  // Initialize user and handle migration
  useEffect(() => {
    if (isLoaded && user) {
      // Create user in Convex if they don't exist
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      }).catch(() => {
        // User probably already exists, ignore error
      });

      // Check for localStorage data to migrate
      if (hasPortfolioInLocalStorage() && !portfolio) {
        setIsMigrating(true);
        const localPortfolio = loadPortfolioFromLocalStorage();
        if (localPortfolio.length > 0) {
          // Migrate localStorage portfolio to Convex
          savePortfolio({
            clerkId: user.id,
            positions: localPortfolio,
          }).then(() => {
            // Clear localStorage after successful migration
            clearPortfolioFromLocalStorage();
            setIsMigrating(false);
            setShowPortfolio(true);
          }).catch(() => {
            setIsMigrating(false);
          });
        } else {
          setIsMigrating(false);
        }
      }
    }
  }, [isLoaded, user, createUser, savePortfolio, portfolio]);

  // Update showPortfolio state based on Convex data
  useEffect(() => {
    if (portfolio) {
      setShowPortfolio(portfolio.positions.length > 0);
    }
  }, [portfolio]);

  // Fetch news data for enhanced insights
  useEffect(() => {
    if (portfolio && portfolio.positions.length > 0) {
      const symbols = portfolio.positions.map(pos => pos.symbol);
      const fetchNews = async () => {
        try {
          const response = await fetch(`/api/financial-news?symbols=${symbols.join(',')}&portfolio=${encodeURIComponent(JSON.stringify(portfolio.positions))}`);
          if (response.ok) {
            const data = await response.json();
            setRecentNews(data.news || []);
          }
        } catch (error) {
          console.error('Failed to fetch news:', error);
          setRecentNews([]);
        }
      };
      
      fetchNews();
      
      // Refresh news every 5 minutes
      const interval = setInterval(fetchNews, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [portfolio]);

  const handlePortfolioParsed = async (newPositions: PortfolioPosition[]) => {
    if (newPositions.length > 0 && user) {
      try {
        // Smart merging: combine new positions with existing ones
        const existingPositions = portfolio?.positions || [];
        const mergedPositions = smartMergePositions(existingPositions, newPositions);
        
        await savePortfolio({
          clerkId: user.id,
          positions: mergedPositions,
        });
        // Create snapshot after saving
        await createSnapshot({ clerkId: user.id });
        setShowPortfolio(true);
      } catch (error) {
        console.error('Failed to save portfolio:', error);
      }
    }
  };

  // Smart merge function to handle duplicate symbols
  const smartMergePositions = (existing: PortfolioPosition[], newPositions: PortfolioPosition[]): PortfolioPosition[] => {
    const merged = [...existing];
    
    newPositions.forEach(newPos => {
      const existingIndex = merged.findIndex(pos => pos.symbol === newPos.symbol);
      
      if (existingIndex >= 0) {
        // Update existing position by adding shares
        merged[existingIndex] = {
          ...merged[existingIndex],
          shares: merged[existingIndex].shares + newPos.shares,
          // Mark as recently updated for highlighting
          lastUpdated: Date.now()
        };
      } else {
        // Add new position with timestamp for highlighting
        merged.push({
          ...newPos,
          lastUpdated: Date.now()
        });
      }
    });
    
    return merged;
  };

  const handleEditPortfolio = () => {
    router.push('/dashboard/portfolio/edit');
  };

  if (!isLoaded || isMigrating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {isMigrating ? 'Migrating your portfolio...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with user info */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Portfolio Intelligence</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10"
                }
              }}
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {!showPortfolio ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
            <div className="text-center space-y-4 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight">
                Set Up Your Portfolio
              </h2>
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
                <h2 className="text-3xl font-bold">Your Portfolio</h2>
                <p className="text-muted-foreground">
                  Real-time prices and daily changes for your holdings
                </p>
              </div>
              <button
                onClick={handleEditPortfolio}
                className="inline-flex items-center gap-2 p-2 rounded-full bg-background hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-muted-foreground hover:text-foreground shadow-sm"
                aria-label="Edit Portfolio"
                tabIndex={0}
                type="button"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Edit Portfolio</span>
              </button>
            </div>
            <PortfolioDisplay portfolio={portfolio?.positions || []} />
            
            {/* AI Insights Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold">AI Portfolio Insights</h3>
                <p className="text-muted-foreground">
                  Personalized analysis and recommendations for your holdings
                </p>
              </div>
              <InsightsDisplay 
                portfolio={portfolio?.positions || []}
                recentNews={recentNews}
                historicalData={historicalData || []}
                useEnhancedInsights={true}
              />
            </div>
            
            {/* News Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold">Portfolio News</h3>
                <p className="text-muted-foreground">
                  Financial news filtered for your holdings
                </p>
              </div>
              <NewsDisplay portfolio={portfolio?.positions || []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}