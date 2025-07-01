# Task 6.0 - Design System Compliance

## Overview

This document establishes the design system guidelines for Portfolio Intelligence, ensuring consistent styling, theming, and component usage across the application. The project uses shadcn/ui components with TailwindCSS 4 and CSS custom properties for a cohesive dark/light mode experience.

## Design System Foundation

### Core Architecture
- **UI Framework**: shadcn/ui with "new-york" style variant
- **Styling**: TailwindCSS 4 with CSS custom properties
- **Color System**: OKLCH color space for better perceptual uniformity
- **Theme Support**: Automatic dark/light mode switching
- **Typography**: Inter font family with system font fallbacks

### CSS Custom Properties Structure

The design system is built on semantic CSS custom properties defined in `/app/globals.css`:

#### Core Colors
```css
/* Light Mode */
--background: oklch(0.9846 0.0017 247.8389)     /* App background */
--foreground: oklch(0.2077 0.0398 265.7549)     /* Primary text */
--card: oklch(1 0 0)                             /* Card backgrounds */
--card-foreground: oklch(0.2077 0.0398 265.7549) /* Card text */

/* Dark Mode */
--background: oklch(0.2077 0.0398 265.7549)     /* Dark background */
--foreground: oklch(0.9288 0.0126 255.5078)     /* Light text */
--card: oklch(0.2795 0.0368 260.031)            /* Dark card backgrounds */
```

#### Semantic Color Palette
- **Primary**: `oklch(0.5854 0.2041 277.1173)` - Brand purple
- **Secondary**: Subtle backgrounds and secondary actions
- **Accent**: `oklch(0.709 0.1592 293.5412)` - Highlight color (teal)
- **Muted**: Low-contrast backgrounds and disabled states
- **Destructive**: `oklch(0.6368 0.2078 25.3313)` - Error states

## Component Style Guidelines

### 1. Card Styling Patterns

#### Basic Card Structure
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

#### Card Styling Rules
- **Background**: Always use `bg-card` for card backgrounds
- **Text**: Use `text-card-foreground` for card text content
- **Borders**: Cards use `border` color with `rounded-xl` corners
- **Shadows**: Default `shadow-sm` for subtle elevation
- **Spacing**: Internal padding handled by CardContent (px-6)

#### Card Variants
```tsx
/* Standard Card */
<Card className="w-full max-w-2xl mx-auto">

/* Compact Card */
<Card className="w-full max-w-md">

/* Full Width Card */
<Card className="w-full">

/* Interactive Card (hover states) */
<Card className="w-full transition-all hover:shadow-md cursor-pointer">
```

### 2. Color Usage for Different States

#### Financial Data States
```tsx
/* Positive Changes (Green) */
<span className="text-green-600 dark:text-green-400">+$1,234.56</span>

/* Negative Changes (Red) */  
<span className="text-red-600 dark:text-red-400">-$987.65</span>

/* Neutral/Unchanged */
<span className="text-muted-foreground">$0.00</span>
```

#### Loading States
```tsx
/* Loading Text */
<span className="text-muted-foreground animate-pulse">Loading...</span>

/* Loading Background */
<div className="bg-muted animate-pulse h-4 rounded" />

/* Loading with Icon */
<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
```

#### Interactive States
```tsx
/* Primary Actions */
<Button variant="default">Primary Action</Button>

/* Secondary Actions */
<Button variant="outline">Secondary Action</Button>

/* Destructive Actions */
<Button variant="destructive">Delete</Button>

/* Ghost Actions */
<Button variant="ghost">Subtle Action</Button>
```

#### Error States
```tsx
/* Error Messages */
<p className="text-sm text-destructive">Error message here</p>

/* Error Backgrounds */
<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
  <span className="text-destructive">Error content</span>
</div>
```

### 3. Typography Hierarchy

#### Heading Levels
```tsx
/* Page Title */
<h1 className="font-bold text-4xl text-foreground">Portfolio Intelligence</h1>

/* Section Headers */
<h2 className="font-semibold text-2xl text-foreground">Your Holdings</h2>

/* Card Titles */
<CardTitle className="font-semibold leading-none">Card Title</CardTitle>

/* Subsection Headers */
<h3 className="font-medium text-lg text-foreground">Subsection</h3>

/* Small Headers */
<h4 className="font-medium text-sm text-foreground">Details</h4>
```

#### Text Content
```tsx
/* Body Text */
<p className="text-foreground">Primary content text</p>

/* Secondary Text */
<p className="text-muted-foreground">Supporting information</p>

/* Caption Text */
<span className="text-sm text-muted-foreground">Caption or metadata</span>

/* Code/Monospace */
<code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">AAPL</code>
```

#### Financial Data Typography
```tsx
/* Stock Prices */
<span className="font-mono text-lg font-semibold">$156.78</span>

/* Stock Symbols */
<span className="font-mono text-sm font-medium uppercase">AAPL</span>

/* Percentage Changes */
<span className="font-mono text-sm">+2.34%</span>
```

### 4. Spacing and Layout Patterns

#### Container Spacing
```tsx
/* Page Container */
<div className="container mx-auto px-4 py-8">

/* Section Spacing */
<section className="space-y-6">

/* Card Grid */
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
```

#### Component Spacing
```tsx
/* Form Spacing */
<form className="space-y-4">
  <div className="space-y-2">
    <Label>Field Label</Label>
    <Input />
  </div>
</form>

/* Button Groups */
<div className="flex gap-2">
  <Button>Primary</Button>
  <Button variant="outline">Secondary</Button>
</div>

/* Content Sections */
<div className="space-y-4">
  <h2>Section Title</h2>
  <p>Section content</p>
</div>
```

#### Responsive Spacing
```tsx
/* Responsive Padding */
<div className="p-4 md:p-6 lg:p-8">

/* Responsive Gaps */
<div className="grid gap-4 md:gap-6 lg:gap-8">

/* Responsive Margins */
<section className="mt-8 md:mt-12 lg:mt-16">
```

## Loading States and Animations

### Loading Components
```tsx
/* Skeleton Loading */
<div className="space-y-3">
  <div className="h-4 bg-muted animate-pulse rounded" />
  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
</div>

/* Spinner Loading */
<div className="flex items-center justify-center p-8">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
</div>

/* Button Loading State */
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### Transition Patterns
```tsx
/* Hover Transitions */
<Card className="transition-all duration-200 hover:shadow-md">

/* State Transitions */
<Button className="transition-colors duration-200">

/* Layout Transitions */
<div className="transition-all duration-300 ease-in-out">
```

## Component Utilities

### Reusable Utility Classes

#### Financial Display Utilities
```css
/* Custom utility classes to add */
.price-positive { @apply text-green-600 dark:text-green-400; }
.price-negative { @apply text-red-600 dark:text-red-400; }
.price-neutral { @apply text-muted-foreground; }
.stock-symbol { @apply font-mono text-sm font-medium uppercase; }
.price-value { @apply font-mono font-semibold; }
```

#### Status Indicators
```tsx
/* Status Badges */
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Error</Badge>

/* Custom Status Colors */
<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
  Up
</Badge>
<Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
  Down
</Badge>
```

## Best Practices

### 1. Theme Consistency
- Always use semantic color tokens (`text-foreground`, `bg-card`) instead of hardcoded colors
- Test components in both light and dark themes
- Use `text-muted-foreground` for secondary information
- Leverage CSS custom properties for consistent theming

### 2. Accessibility
- Maintain sufficient color contrast ratios
- Use semantic HTML elements with proper ARIA attributes
- Ensure focus states are visible with `focus-visible:ring-ring`
- Provide loading states for async operations

### 3. Responsive Design
- Use mobile-first responsive classes (`md:`, `lg:`)
- Implement flexible layouts with CSS Grid and Flexbox
- Consider touch targets on mobile devices (minimum 44px)
- Test components across different screen sizes

### 4. Performance
- Use CSS custom properties for dynamic theming
- Leverage TailwindCSS purging for optimal bundle size
- Implement proper loading states to improve perceived performance
- Minimize layout shifts with consistent component dimensions

## Implementation Checklist

- [ ] All components use semantic color tokens
- [ ] Dark mode compatibility verified
- [ ] Loading states implemented with proper animations
- [ ] Financial data uses consistent typography and color coding
- [ ] Cards follow established spacing and border patterns
- [ ] Responsive behavior tested across screen sizes
- [ ] Accessibility guidelines followed
- [ ] Component documentation updated

## Examples

### Portfolio Card Component
```tsx
export function PortfolioCard({ position, loading }: PortfolioCardProps) {
  return (
    <Card className="w-full transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="stock-symbol">{position.symbol}</CardTitle>
          <CardAction>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="secondary">{position.shares} shares</Badge>
            )}
          </CardAction>
        </div>
        <CardDescription>{position.companyName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Price</span>
            <span className="price-value text-lg">${position.currentPrice}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Change</span>
            <span className={cn(
              "price-value text-sm",
              position.change >= 0 ? "price-positive" : "price-negative"
            )}>
              {position.change >= 0 ? '+' : ''}${position.change.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

This design system ensures consistent, accessible, and maintainable styling across the Portfolio Intelligence application while supporting both light and dark themes with semantic color usage.