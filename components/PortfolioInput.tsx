'use client';

import { Loader2 } from 'lucide-react';
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
import { parsePortfolioText } from '@/lib/api';
import { type PortfolioPosition } from '@/lib/storage';

interface PortfolioInputProps {
  onPortfolioParsed: (positions: PortfolioPosition[]) => void;
}

export default function PortfolioInput({
  onPortfolioParsed,
}: PortfolioInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError('Please enter your portfolio information');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const positions = await parsePortfolioText(input.trim());

      if (positions.length === 0) {
        setError(
          'No valid stock positions found. Please try rephrasing your portfolio description.'
        );
        return;
      }

      // Notify parent component (dashboard will handle saving to Convex)
      onPortfolioParsed(positions);

      // Clear input
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

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Portfolio Intelligence</CardTitle>
        <CardDescription>
          Tell me about your portfolio in natural language, and I'll show you
          only the news that matters to YOUR stocks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Textarea
              className="min-h-24"
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about your portfolio: 'I have 100 Apple shares and 50 Microsoft shares' or 'I own TSLA, AAPL, and some Google stock'"
              value={input}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <Button
            className="w-full"
            disabled={loading || !input.trim()}
            type="submit"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Your Portfolio...
              </>
            ) : (
              'Parse My Portfolio'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            ✨ <strong>Example:</strong> "I have 100 Apple shares, 50 Microsoft,
            and 25 Tesla stocks"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
