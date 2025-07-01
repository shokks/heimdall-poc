# Components Library

This directory contains the component library for Portfolio Intelligence, implementing the design system established in `_IDEA/06_DesignSystemCompliance.md`.

## Structure

```
components/
├── ui/                      # Base UI components (shadcn/ui)
│   ├── badge.tsx           # Status badges and labels
│   ├── button.tsx          # Button variants and styles
│   ├── card.tsx            # Card container components
│   ├── financial.tsx       # Financial data display components
│   ├── form.tsx            # Form controls
│   ├── label.tsx           # Form labels
│   ├── loading.tsx         # Loading states and skeletons
│   └── textarea.tsx        # Text input areas
├── examples/               # Example implementations
│   └── DesignSystemShowcase.tsx
├── layout/                 # Layout components
├── landing/                # Landing page components
├── PortfolioInput.tsx      # Portfolio input form
└── README.md              # This file
```

## Base UI Components

### Card Components (`ui/card.tsx`)
Flexible card containers with consistent styling:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

<Card className="w-full max-w-2xl mx-auto">
  <CardHeader>
    <CardTitle>Portfolio Intelligence</CardTitle>
    <CardDescription>Descriptive text here</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

### Button Components (`ui/button.tsx`)
Button variants with consistent styling and accessibility:

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="destructive">Delete Action</Button>
```

## Financial Components (`ui/financial.tsx`)

Specialized components for displaying financial data with automatic styling:

### Price Display
```tsx
import { Price, PriceChange, PercentageChange } from '@/components/ui/financial';

<Price value={156.78} size="lg" />
<PriceChange value={2.34} />  {/* Automatically styled positive/negative */}
<PercentageChange value={1.52} />
```

### Stock Symbols
```tsx
import { StockSymbol } from '@/components/ui/financial';

<StockSymbol symbol="AAPL" size="md" />
```

### Portfolio Summary
```tsx
import { PortfolioSummary } from '@/components/ui/financial';

<PortfolioSummary
  totalValue={125420.50}
  totalChange={2340.25}
  totalChangePercent={1.9}
/>
```

## Loading Components (`ui/loading.tsx`)

Consistent loading states throughout the application:

### Loading Spinners
```tsx
import { LoadingSpinner, InlineLoading } from '@/components/ui/loading';

<LoadingSpinner size="lg" text="Loading portfolio..." />
<InlineLoading text="Fetching data..." />
```

### Skeleton Loading
```tsx
import { Skeleton, CardSkeleton, PortfolioSkeleton } from '@/components/ui/loading';

<Skeleton variant="text" lines={3} />
<CardSkeleton showHeader contentLines={4} />
<PortfolioSkeleton positions={3} />
```

## Usage Guidelines

### 1. Import Organization
Always import components from their specific modules:
```tsx
// ✅ Good
import { Card, CardContent } from '@/components/ui/card';
import { Price, StockSymbol } from '@/components/ui/financial';

// ❌ Avoid
import { Card, Price } from '@/components/ui';
```

### 2. Component Composition
Compose components following the established patterns:
```tsx
// Portfolio position card example
<Card className="interactive-card">
  <CardHeader>
    <div className="flex items-center justify-between">
      <StockSymbol symbol="AAPL" />
      <Badge variant="secondary">100 shares</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Current Price</span>
        <Price value={156.78} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Change</span>
        <PriceChange value={2.34} />
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. Loading States
Always provide loading states for async operations:
```tsx
function PortfolioCard({ position, loading }) {
  if (loading) {
    return <CardSkeleton contentLines={3} />;
  }
  
  return (
    <Card>
      {/* Card content */}
    </Card>
  );
}
```

### 4. Error Handling
Use consistent error display patterns:
```tsx
import { LoadingError } from '@/components/ui/loading';

{error && (
  <LoadingError
    title="Failed to load"
    message={error.message}
    onRetry={handleRetry}
  />
)}
```

## Custom Utility Classes

The design system includes custom utility classes in `globals.css`:

### Financial Data
- `.price-positive` - Green text for positive changes
- `.price-negative` - Red text for negative changes  
- `.price-neutral` - Muted text for neutral values
- `.stock-symbol` - Consistent stock symbol styling
- `.price-value` - Monospace font for price values

### Status Indicators
- `.status-success` - Success state styling
- `.status-error` - Error state styling
- `.status-warning` - Warning state styling
- `.status-info` - Information state styling

### Interactive Elements
- `.interactive-card` - Hover effects for clickable cards
- `.focus-ring` - Consistent focus ring styling

## Testing Components

Use the `DesignSystemShowcase` component to test and validate component implementations:

```tsx
import DesignSystemShowcase from '@/components/examples/DesignSystemShowcase';

// Render in development to test all components
<DesignSystemShowcase />
```

## Best Practices

1. **Theme Consistency**: Always use semantic color tokens (`text-foreground`, `bg-card`) instead of hardcoded colors
2. **Accessibility**: Ensure proper contrast ratios and keyboard navigation
3. **Responsive Design**: Test components across different screen sizes
4. **Loading States**: Provide appropriate loading indicators for all async operations
5. **Error Handling**: Implement consistent error display patterns
6. **Performance**: Use appropriate loading skeletons to minimize layout shifts

## Contributing

When adding new components:

1. Follow existing naming conventions
2. Use TypeScript with proper type definitions
3. Implement proper accessibility attributes
4. Include loading and error states where applicable
5. Test in both light and dark themes
6. Update this README with usage examples
7. Add the component to `DesignSystemShowcase` for testing