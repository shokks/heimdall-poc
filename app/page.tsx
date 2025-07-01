import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Filter, Zap } from 'lucide-react';

export default async function HomePage() {
  const { userId } = await auth();

  // If user is authenticated, redirect to dashboard
  if (userId) {
    redirect('/dashboard');
  }

  // If not authenticated, show landing page
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Portfolio Intelligence</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            See only the news that matters to{' '}
            <span className="text-primary">YOUR portfolio</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Stop drowning in financial news. Get personalized updates that actually affect your holdings.
            AI-powered insights for smarter investment decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg text-lg font-medium transition-colors inline-flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/sign-in"
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Enter Your Portfolio</h3>
              <p className="text-muted-foreground">
                Simply tell us what stocks you own. Our AI understands natural language like "I have 100 Apple shares."
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Filter className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Filtered News</h3>
              <p className="text-muted-foreground">
                See only news about YOUR stocks. No more scrolling through irrelevant financial updates.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Insights</h3>
              <p className="text-muted-foreground">
                Get AI-powered analysis of how news affects your specific portfolio and performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to focus on what matters?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of investors who save time with personalized portfolio news.
          </p>
          <Link
            href="/sign-up"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg text-lg font-medium transition-colors inline-flex items-center"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Portfolio Intelligence. Built for smarter investing.</p>
        </div>
      </footer>
    </div>
  );
}