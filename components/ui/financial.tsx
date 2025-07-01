import type * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Badge } from './badge';

// Utility variants for financial data display
const priceChangeVariants = cva(
  'font-mono text-sm font-medium',
  {
    variants: {
      change: {
        positive: 'text-green-600 dark:text-green-400',
        negative: 'text-red-600 dark:text-red-400',
        neutral: 'text-muted-foreground',
      },
    },
    defaultVariants: {
      change: 'neutral',
    },
  }
);

const priceVariants = cva(
  'font-mono font-semibold',
  {
    variants: {
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const stockSymbolVariants = cva(
  'font-mono font-medium uppercase tracking-wide',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Price component with automatic change detection
interface PriceProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  size?: VariantProps<typeof priceVariants>['size'];
  showCurrency?: boolean;
}

function Price({ value, size, showCurrency = true, className, ...props }: PriceProps) {
  const formattedValue = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span
      className={cn(priceVariants({ size }), className)}
      {...props}
    >
      {showCurrency && '$'}{formattedValue}
    </span>
  );
}

// Price change component with automatic positive/negative styling
interface PriceChangeProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  showSign?: boolean;
  showCurrency?: boolean;
}

function PriceChange({ 
  value, 
  showSign = true, 
  showCurrency = true, 
  className, 
  ...props 
}: PriceChangeProps) {
  const change = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '') : '';
  
  const formattedValue = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span
      className={cn(priceChangeVariants({ change }), className)}
      {...props}
    >
      {sign}{showCurrency && '$'}{value < 0 ? '-' : ''}{formattedValue}
    </span>
  );
}

// Percentage change component
interface PercentageChangeProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  showSign?: boolean;
}

function PercentageChange({ 
  value, 
  showSign = true, 
  className, 
  ...props 
}: PercentageChangeProps) {
  const change = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '') : '';
  
  const formattedValue = Math.abs(value).toFixed(2);

  return (
    <span
      className={cn(priceChangeVariants({ change }), className)}
      {...props}
    >
      {sign}{value < 0 ? '-' : ''}{formattedValue}%
    </span>
  );
}

// Stock symbol component with consistent styling
interface StockSymbolProps extends React.HTMLAttributes<HTMLSpanElement> {
  symbol: string;
  size?: VariantProps<typeof stockSymbolVariants>['size'];
}

function StockSymbol({ symbol, size, className, ...props }: StockSymbolProps) {
  return (
    <span
      className={cn(stockSymbolVariants({ size }), className)}
      {...props}
    >
      {symbol}
    </span>
  );
}

// Market status badge
interface MarketStatusProps {
  isOpen: boolean;
  className?: string;
}

function MarketStatus({ isOpen, className }: MarketStatusProps) {
  return (
    <Badge
      variant={isOpen ? 'default' : 'secondary'}
      className={cn(
        isOpen
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        className
      )}
    >
      {isOpen ? 'Market Open' : 'Market Closed'}
    </Badge>
  );
}

// Loading skeleton for financial data
interface FinancialSkeletonProps {
  lines?: number;
  className?: string;
}

function FinancialSkeleton({ lines = 3, className }: FinancialSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

// Portfolio summary component
interface PortfolioSummaryProps {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  className?: string;
}

function PortfolioSummary({ 
  totalValue, 
  totalChange, 
  totalChangePercent, 
  className 
}: PortfolioSummaryProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total Value</span>
        <Price value={totalValue} size="lg" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total Change</span>
        <div className="flex items-center gap-2">
          <PriceChange value={totalChange} />
          <span className="text-muted-foreground">•</span>
          <PercentageChange value={totalChangePercent} />
        </div>
      </div>
    </div>
  );
}

export {
  Price,
  PriceChange,
  PercentageChange,
  StockSymbol,
  MarketStatus,
  FinancialSkeleton,
  PortfolioSummary,
  priceVariants,
  priceChangeVariants,
  stockSymbolVariants,
};