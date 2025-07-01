# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application for **Portfolio Intelligence** - a personalized news feed that shows only financial news relevant to a user's stock portfolio. The project is currently in **POC (Proof of Concept)** phase, focusing on validating the core concept with minimal technical complexity.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting with Biome
npm run lint
```

The development server runs on http://localhost:3000 with Turbopack for faster builds.

## Architecture

### Tech Stack
- **Next.js 15** with App Router and React 19
- **TypeScript** with strict mode and bundler module resolution
- **TailwindCSS 4** for styling
- **Shadcn/ui** component library with New York style and Radix UI primitives
- **OpenAI API** for AI-powered portfolio parsing
- **Alpha Vantage API** for real-time stock prices
- **Biome** for code linting/formatting (extends ultracite config)
- **Stagewise Toolbar** integration for development tools

### Project Structure
```
/app/
├── api/
│   ├── parse-portfolio/route.ts    # OpenAI GPT-4o portfolio parsing
│   └── stock-prices/route.ts       # Alpha Vantage price fetching with demo mode
├── layout.tsx                      # Root layout with Geist fonts
└── page.tsx                        # Main application page

/components/
├── ui/                            # Shadcn/ui components (button, card, input, etc.)
├── PortfolioInput.tsx             # AI-powered natural language portfolio input
├── PortfolioDisplay.tsx           # Real-time portfolio with prices and changes
├── NewsDisplay.tsx                # Portfolio-filtered news component
└── InsightsDisplay.tsx            # AI-generated portfolio insights

/lib/
├── storage.ts                     # localStorage utilities for persistence
├── api.ts                         # API helper functions
├── insights.ts                    # AI insight generation logic
└── newsFilter.ts                  # News filtering by portfolio symbols

/data/
└── mockNews.ts                    # 25 mock news articles for POC testing
```

### Key Configuration
- Uses `@/*` path alias for clean imports
- `components.json`: Shadcn/ui configured with New York style, neutral colors
- `biome.jsonc`: Code formatting extends ultracite configuration
- `tsconfig.json`: Strict TypeScript with bundler module resolution

## POC Implementation Details

### Core Features
1. **Portfolio Input**: Natural language parsing ("I have 100 Apple shares") via OpenAI GPT-4o
2. **Portfolio Display**: Real-time stock prices with daily changes from Alpha Vantage
3. **Filtered News**: Mock news data filtered to show only user's holdings
4. **AI Insights**: Portfolio-based observations and market commentary

### Technical Approach for POC
- **No database** - localStorage for all data persistence
- **Mock news data** - 25 hardcoded articles covering major tech stocks (AAPL, MSFT, TSLA, GOOGL, NVDA, AMZN, META, NFLX)
- **Demo mode** - Stock prices API supports "demo" API key for testing with mock data
- **Error handling** - Graceful fallbacks for API failures and rate limiting
- **Mobile-first design** - Responsive UI optimized for mobile experience

### API Integration
- **OpenAI API**: Portfolio parsing with company name mapping and position validation
- **Alpha Vantage API**: Global quote endpoint for real-time prices with comprehensive error handling
- **Demo mode**: Use `ALPHA_VANTAGE_API_KEY=demo` for development with mock price data
- **Rate limiting**: Proper handling of API constraints and error responses

### Data Flow
1. User enters portfolio in natural language
2. OpenAI API parses text to structured positions with symbol validation
3. Alpha Vantage fetches real-time prices (or demo data)
4. Mock news filtered by portfolio symbols
5. AI generates insights based on current holdings
6. All data persisted in localStorage for session continuity

## Development Notes

- **Turbopack** enabled for faster development builds
- **Strict TypeScript** throughout with comprehensive type definitions
- **Component-driven architecture** with reusable UI components
- **localStorage utilities** handle serialization and data persistence
- **Error boundaries** implemented for graceful API failure handling
- **Performance optimized** for sub-30-second user experience

## Project Phases

1. **POC** (Current): 3-5 days, localStorage + mock data + real APIs
2. **Prototype**: 2-3 weeks, real news APIs + user authentication
3. **MVP**: 4-6 weeks, PDF parsing + payment integration

## Environment Setup

Required environment variables:
- `OPENAI_API_KEY`: For portfolio parsing (required)
- `ALPHA_VANTAGE_API_KEY`: For stock prices (use "demo" for testing)