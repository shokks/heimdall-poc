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

# Run ESLint
npm run lint
```

The development server runs on http://localhost:3000 with Turbopack for faster builds.

## Architecture

### Tech Stack
- **Next.js 15** with App Router
- **TypeScript** with strict mode
- **TailwindCSS 4** for styling
- **React 19** with concurrent features
- **Stagewise Toolbar** integration for development tools

### Key Dependencies
- `@stagewise-plugins/react` and `@stagewise/toolbar-next` for development tooling
- **Geist fonts** (Sans & Mono) for typography
- **ESLint** with Next.js TypeScript config

### Project Structure
- `app/` - Next.js App Router pages and layouts
- `_IDEA/` - Product documentation and development phases
- `public/` - Static assets (SVG icons)
- Uses `@/*` path alias for imports

## POC Implementation Plan

Based on `_IDEA/00_OverView.md`, the POC phase focuses on:

1. **Portfolio Input**: AI-powered text parsing ("I have 100 Apple shares")
2. **Portfolio Display**: Real-time prices with localStorage persistence
3. **Filtered News**: Mock news data filtered to user's holdings only
4. **AI Insights**: Simple portfolio-based observations

### Technical Approach for POC
- **No database** - localStorage for persistence
- **Mock news data** - hardcoded articles for testing
- **Alpha Vantage API** for real stock prices
- **OpenAI integration** for portfolio parsing (already built)
- **Mobile-first design** with Navy & Teal UI theme

### What's NOT in POC
- User authentication
- Real news APIs
- Historical data or charts
- Real-time updates
- Multiple portfolios

## Development Notes

- Uses **Turbopack** for faster development builds
- **Strict TypeScript** configuration with bundler module resolution
- **ESLint** configured for Next.js TypeScript projects
- **TailwindCSS 4** with PostCSS integration
- The project is set up for **rapid iteration** and **quick validation**

## Project Phases

1. **POC** (Current): 3-5 days, localStorage + mock data
2. **Prototype**: 2-3 weeks, real APIs + authentication
3. **MVP**: 4-6 weeks, full feature set + payments