'use client';

import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardAction,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Price,
  PriceChange,
  PercentageChange,
  StockSymbol,
  MarketStatus,
  PortfolioSummary,
} from '@/components/ui/financial';
import {
  LoadingSpinner,
  Skeleton,
  CardSkeleton,
  InlineLoading,
  LoadingError,
} from '@/components/ui/loading';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Design System Showcase Component
 * 
 * This component demonstrates all the design system patterns and components
 * established in the Portfolio Intelligence application. It serves as a
 * reference implementation and testing ground for design consistency.
 */
export default function DesignSystemShowcase() {
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const toggleLoading = () => setLoading(!loading);
  const toggleError = () => setShowError(!showError);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <h1 className="font-bold text-4xl text-foreground">Design System Showcase</h1>
        <p className="text-muted-foreground text-lg">
          A comprehensive demonstration of the Portfolio Intelligence design system components and patterns.
        </p>
      </div>

      {/* Typography Section */}
      <Card>
        <CardHeader>
          <CardTitle>Typography Hierarchy</CardTitle>
          <CardDescription>
            Semantic typography scales and color usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h1 className="font-bold text-4xl text-foreground">Page Title (4xl)</h1>
            <h2 className="font-semibold text-2xl text-foreground">Section Header (2xl)</h2>
            <h3 className="font-medium text-lg text-foreground">Subsection Header (lg)</h3>
            <h4 className="font-medium text-sm text-foreground">Detail Header (sm)</h4>
            <p className="text-foreground">Body text with primary foreground color</p>
            <p className="text-muted-foreground">Secondary text with muted foreground</p>
            <span className="text-sm text-muted-foreground">Caption text for metadata</span>
          </div>
        </CardContent>
      </Card>

      {/* Color System Section */}
      <Card>
        <CardHeader>
          <CardTitle>Color System</CardTitle>
          <CardDescription>
            Semantic color tokens and their usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Backgrounds</h4>
              <div className="space-y-1">
                <div className="bg-background border rounded p-2 text-foreground">Background</div>
                <div className="bg-card border rounded p-2 text-card-foreground">Card</div>
                <div className="bg-muted border rounded p-2 text-muted-foreground">Muted</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Actions</h4>
              <div className="space-y-1">
                <div className="bg-primary text-primary-foreground rounded p-2">Primary</div>
                <div className="bg-secondary text-secondary-foreground rounded p-2">Secondary</div>
                <div className="bg-accent text-accent-foreground rounded p-2">Accent</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Status</h4>
              <div className="space-y-1">
                <div className="bg-destructive text-destructive-foreground rounded p-2">Destructive</div>
                <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded p-2">
                  Success
                </div>
                <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded p-2">
                  Warning
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Components Section */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Data Components</CardTitle>
          <CardDescription>
            Specialized components for displaying financial information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stock symbols */}
          <div className="space-y-2">
            <h4 className="font-medium">Stock Symbols</h4>
            <div className="flex items-center gap-4">
              <StockSymbol symbol="AAPL" size="sm" />
              <StockSymbol symbol="MSFT" size="md" />
              <StockSymbol symbol="GOOGL" size="lg" />
            </div>
          </div>

          {/* Prices */}
          <div className="space-y-2">
            <h4 className="font-medium">Price Display</h4>
            <div className="flex items-center gap-4">
              <Price value={156.78} size="sm" />
              <Price value={328.45} size="md" />
              <Price value={2842.67} size="lg" />
              <Price value={1234.56} size="xl" />
            </div>
          </div>

          {/* Price changes */}
          <div className="space-y-2">
            <h4 className="font-medium">Price Changes</h4>
            <div className="flex items-center gap-4">
              <PriceChange value={12.34} />
              <PriceChange value={-8.76} />
              <PriceChange value={0} />
              <PercentageChange value={2.45} />
              <PercentageChange value={-1.23} />
            </div>
          </div>

          {/* Market status */}
          <div className="space-y-2">
            <h4 className="font-medium">Market Status</h4>
            <div className="flex items-center gap-4">
              <MarketStatus isOpen={true} />
              <MarketStatus isOpen={false} />
            </div>
          </div>

          {/* Portfolio summary */}
          <div className="space-y-2">
            <h4 className="font-medium">Portfolio Summary</h4>
            <div className="max-w-md">
              <PortfolioSummary
                totalValue={125420.50}
                totalChange={2340.25}
                totalChangePercent={1.9}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Variants Section */}
      <Card>
        <CardHeader>
          <CardTitle>Button Variants</CardTitle>
          <CardDescription>
            Different button styles and their appropriate use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <TrendingUp className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button disabled>Disabled</Button>
              <Button>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge Components Section */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Components</CardTitle>
          <CardDescription>
            Status indicators and labels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <TrendingUp className="mr-1 h-3 w-3" />
                Up
              </Badge>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <TrendingDown className="mr-1 h-3 w-3" />
                Down
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading States Section */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
          <CardDescription>
            Various loading indicators and skeleton components
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" onClick={toggleLoading}>
              Toggle Loading
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading spinners */}
          <div className="space-y-2">
            <h4 className="font-medium">Loading Spinners</h4>
            <div className="flex items-center gap-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
              <LoadingSpinner size="xl" />
            </div>
          </div>

          {/* Inline loading */}
          <div className="space-y-2">
            <h4 className="font-medium">Inline Loading</h4>
            <InlineLoading text="Fetching data..." />
          </div>

          {/* Skeleton loading */}
          <div className="space-y-2">
            <h4 className="font-medium">Skeleton Loading</h4>
            <div className="space-y-3">
              <Skeleton variant="heading" />
              <Skeleton variant="text" lines={3} />
              <Skeleton variant="button" width="120px" />
            </div>
          </div>

          {/* Conditional loading state */}
          {loading && (
            <div className="space-y-4">
              <h4 className="font-medium">Card Loading State</h4>
              <CardSkeleton showHeader showFooter contentLines={4} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error States Section */}
      <Card>
        <CardHeader>
          <CardTitle>Error States</CardTitle>
          <CardDescription>
            Error handling and display patterns
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" onClick={toggleError}>
              Toggle Error
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {showError ? (
            <LoadingError
              title="Failed to load portfolio data"
              message="Unable to fetch your portfolio information. Please check your connection and try again."
              onRetry={() => setShowError(false)}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                This is an error message using the destructive color token.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-destructive text-sm">
                  This is an error container with proper background and border styling.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Portfolio Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Portfolio Card</CardTitle>
          <CardDescription>
            A complete example implementing all design system patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <StockSymbol symbol="AAPL" />
                  <p className="text-sm text-muted-foreground">Apple Inc.</p>
                </div>
                <Badge variant="secondary">100 shares</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Price</span>
                  <Price value={156.78} size="lg" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Change</span>
                  <div className="flex items-center gap-2">
                    <PriceChange value={2.34} />
                    <span className="text-muted-foreground">•</span>
                    <PercentageChange value={1.52} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <Price value={15678.00} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  Strong performance this quarter
                </span>
              </div>
            </CardFooter>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}