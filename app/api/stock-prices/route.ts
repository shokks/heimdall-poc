import { NextRequest, NextResponse } from 'next/server';

interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface AlphaVantageResponse {
  'Global Quote': AlphaVantageQuote;
  'Error Message'?: string;
  'Note'?: string;
}

interface FinnhubQuote {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubError {
  error?: string;
}

interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  error?: string;
  source?: 'alphavantage' | 'finnhub' | 'demo';
}

interface CachedStockPrice extends StockPrice {
  timestamp: number;
  expiresAt: number;
}

// Finnhub API helper function
async function fetchFinnhubPrice(symbol: string, apiKey: string): Promise<StockPrice> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    console.log(`Fetching from Finnhub: ${url}`);
    
    const response = await fetch(url);
    const data: FinnhubQuote & FinnhubError = await response.json();
    
    if (data.error) {
      console.log(`Finnhub error for ${symbol}:`, data.error);
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: '0.00%',
        error: data.error,
        source: 'finnhub'
      };
    }
    
    // Calculate change and percentage
    const change = data.c - data.pc;
    const changePercent = data.pc > 0 ? ((change / data.pc) * 100).toFixed(2) + '%' : '0.00%';
    
    console.log(`Finnhub quote for ${symbol}:`, data);
    
    return {
      symbol,
      price: data.c,
      change,
      changePercent,
      source: 'finnhub'
    };
  } catch (error) {
    console.error(`Error fetching Finnhub price for ${symbol}:`, error);
    return {
      symbol,
      price: 0,
      change: 0,
      changePercent: '0.00%',
      error: 'Failed to fetch from Finnhub',
      source: 'finnhub'
    };
  }
}

// Alpha Vantage API helper function  
async function fetchAlphaVantagePrice(symbol: string, apiKey: string): Promise<StockPrice> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    console.log(`Fetching from Alpha Vantage: ${url}`);
    
    const response = await fetch(url);
    const data: AlphaVantageResponse = await response.json();
    
    // Check for API errors
    if (data['Error Message']) {
      console.log(`Alpha Vantage error for ${symbol}:`, data['Error Message']);
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: '0.00%',
        error: data['Error Message'],
        source: 'alphavantage'
      };
    }

    // Check for rate limiting
    if (data['Note']) {
      console.log(`Alpha Vantage rate limited for ${symbol}:`, data['Note']);
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: '0.00%',
        error: 'API rate limit exceeded',
        source: 'alphavantage'
      };
    }

    const quote = data['Global Quote'];
    if (!quote) {
      console.log(`No Alpha Vantage quote data for ${symbol}`);
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: '0.00%',
        error: 'No quote data available',
        source: 'alphavantage'
      };
    }

    console.log(`Alpha Vantage quote for ${symbol}:`, quote);

    return {
      symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'],
      source: 'alphavantage'
    };
  } catch (error) {
    console.error(`Error fetching Alpha Vantage price for ${symbol}:`, error);
    return {
      symbol,
      price: 0,
      change: 0,
      changePercent: '0.00%',
      error: 'Failed to fetch from Alpha Vantage',
      source: 'alphavantage'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json();
    console.log('Received symbols:', symbols);

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      console.log('Invalid symbols array');
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;
    
    if (!alphaVantageKey && !finnhubKey) {
      console.log('No API keys found');
      return NextResponse.json(
        { error: 'No stock price API keys configured' },
        { status: 500 }
      );
    }

    console.log('API keys available - Alpha Vantage:', !!alphaVantageKey, 'Finnhub:', !!finnhubKey);

    // For development/testing, use demo mode if Alpha Vantage API key is "demo"
    if (alphaVantageKey === 'demo') {
      console.log('Using demo mode');
      const mockPrices: StockPrice[] = symbols.map((symbol: string) => ({
        symbol,
        price: Math.random() * 200 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: `${((Math.random() - 0.5) * 10).toFixed(2)}%`,
        source: 'demo'
      }));
      return NextResponse.json({ prices: mockPrices });
    }

    // Fetch stock prices with fallback logic: Alpha Vantage → Finnhub
    const stockPrices: StockPrice[] = await Promise.all(
      symbols.map(async (symbol: string) => {
        // Try Alpha Vantage first if available
        if (alphaVantageKey && alphaVantageKey !== 'demo') {
          console.log(`Trying Alpha Vantage for ${symbol}`);
          const alphaVantageResult = await fetchAlphaVantagePrice(symbol, alphaVantageKey);
          
          // If Alpha Vantage succeeds (no error), return the result
          if (!alphaVantageResult.error) {
            return alphaVantageResult;
          }
          
          // If Alpha Vantage fails but we have Finnhub, try Finnhub
          if (finnhubKey) {
            console.log(`Alpha Vantage failed for ${symbol}, trying Finnhub fallback`);
            const finnhubResult = await fetchFinnhubPrice(symbol, finnhubKey);
            
            // If Finnhub succeeds, return that
            if (!finnhubResult.error) {
              return finnhubResult;
            }
            
            // Both failed, return Alpha Vantage error (primary service)
            return {
              ...alphaVantageResult,
              error: `Alpha Vantage: ${alphaVantageResult.error}; Finnhub: ${finnhubResult.error}`
            };
          }
          
          // Only Alpha Vantage available and it failed
          return alphaVantageResult;
        }
        
        // Try Finnhub first if Alpha Vantage is not available
        if (finnhubKey) {
          console.log(`Trying Finnhub for ${symbol}`);
          return await fetchFinnhubPrice(symbol, finnhubKey);
        }
        
        // No valid API keys
        return {
          symbol,
          price: 0,
          change: 0,
          changePercent: '0.00%',
          error: 'No valid API keys available',
          source: undefined
        };
      })
    );

    return NextResponse.json({ prices: stockPrices });
  } catch (error) {
    console.error('Error in stock-prices API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}