import type * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading spinner variants
const spinnerVariants = cva(
  'animate-spin text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Skeleton variants for different content types
const skeletonVariants = cva(
  'bg-muted animate-pulse rounded',
  {
    variants: {
      variant: {
        default: '',
        text: 'h-4',
        heading: 'h-6',
        button: 'h-9',
        card: 'h-32',
        avatar: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Loading spinner component
interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: VariantProps<typeof spinnerVariants>['size'];
  text?: string;
}

function LoadingSpinner({ size, text, className, ...props }: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={cn(spinnerVariants({ size }))} />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}

// Skeleton component for content placeholders
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: VariantProps<typeof skeletonVariants>['variant'];
  lines?: number;
  width?: string;
}

function Skeleton({ 
  variant, 
  lines = 1, 
  width, 
  className, 
  ...props 
}: SkeletonProps) {
  if (lines === 1) {
    return (
      <div
        className={cn(skeletonVariants({ variant }), className)}
        style={{ width }}
        {...props}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            skeletonVariants({ variant }),
            i === lines - 1 && 'w-3/4' // Last line is shorter
          )}
          style={i === 0 ? { width } : undefined}
        />
      ))}
    </div>
  );
}

// Card loading skeleton
interface CardSkeletonProps {
  showHeader?: boolean;
  showFooter?: boolean;
  contentLines?: number;
  className?: string;
}

function CardSkeleton({ 
  showHeader = true, 
  showFooter = false, 
  contentLines = 3, 
  className 
}: CardSkeletonProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-6 space-y-4', className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton variant="heading" width="60%" />
          <Skeleton variant="text" width="80%" />
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: contentLines }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="25%" />
          </div>
        ))}
      </div>
      
      {showFooter && (
        <div className="pt-4 border-t">
          <Skeleton variant="button" width="30%" />
        </div>
      )}
    </div>
  );
}

// Portfolio loading skeleton specifically for financial data
interface PortfolioSkeletonProps {
  positions?: number;
  className?: string;
}

function PortfolioSkeleton({ positions = 3, className }: PortfolioSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Portfolio summary skeleton */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton variant="heading" width="50%" />
          <Skeleton variant="text" width="70%" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="25%" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width="35%" />
            <div className="flex items-center gap-2">
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="text" width="15%" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Individual position skeletons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: positions }).map((_, i) => (
          <CardSkeleton key={i} contentLines={4} />
        ))}
      </div>
    </div>
  );
}

// Inline loading component for buttons and small elements
interface InlineLoadingProps {
  text?: string;
  className?: string;
}

function InlineLoading({ text = 'Loading...', className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm text-muted-foreground animate-pulse">{text}</span>
    </div>
  );
}

// Full page loading component
interface PageLoadingProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

function PageLoading({ 
  title = 'Loading...', 
  subtitle, 
  className 
}: PageLoadingProps) {
  return (
    <div className={cn(
      'flex min-h-[400px] flex-col items-center justify-center space-y-4',
      className
    )}>
      <LoadingSpinner size="xl" />
      <div className="text-center space-y-2">
        <h2 className="font-semibold text-lg animate-pulse">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground text-sm animate-pulse">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Error loading state component
interface LoadingErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

function LoadingError({ 
  title = 'Failed to load', 
  message = 'Something went wrong. Please try again.', 
  onRetry,
  className 
}: LoadingErrorProps) {
  return (
    <div className={cn(
      'flex min-h-[200px] flex-col items-center justify-center space-y-4',
      className
    )}>
      <div className="text-center space-y-2">
        <h3 className="font-medium text-destructive">{title}</h3>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-primary text-sm hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export {
  LoadingSpinner,
  Skeleton,
  CardSkeleton,
  PortfolioSkeleton,
  InlineLoading,
  PageLoading,
  LoadingError,
  spinnerVariants,
  skeletonVariants,
};