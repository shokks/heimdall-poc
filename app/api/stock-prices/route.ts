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

interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  error?: string;
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

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.log('Alpha Vantage API key not found');
      return NextResponse.json(
        { error: 'Alpha Vantage API key not configured' },
        { status: 500 }
      );
    }

    console.log('API key found, fetching prices for:', symbols);

    // For development/testing, use demo mode if API key is "demo"
    if (apiKey === 'demo') {
      console.log('Using demo mode');
      const mockPrices: StockPrice[] = symbols.map((symbol: string) => ({
        symbol,
        price: Math.random() * 200 + 50, // Random price between 50-250
        change: (Math.random() - 0.5) * 10, // Random change between -5 to +5
        changePercent: `${((Math.random() - 0.5) * 10).toFixed(2)}%`,
      }));
      return NextResponse.json({ prices: mockPrices });
    }

    // Fetch stock prices for all symbols
    const stockPrices: StockPrice[] = await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
          console.log(`Fetching from URL: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data: AlphaVantageResponse = await response.json();
          console.log(`Response for ${symbol}:`, JSON.stringify(data, null, 2));

          // Check for API errors
          if (data['Error Message']) {
            console.log(`Error for ${symbol}:`, data['Error Message']);
            return {
              symbol,
              price: 0,
              change: 0,
              changePercent: '0.00%',
              error: data['Error Message'],
            };
          }

          // Check for rate limiting
          if (data['Note']) {
            console.log(`Rate limited for ${symbol}:`, data['Note']);
            return {
              symbol,
              price: 0,
              change: 0,
              changePercent: '0.00%',
              error: 'API rate limit exceeded',
            };
          }

          const quote = data['Global Quote'];
          if (!quote) {
            console.log(`No quote data for ${symbol}`);
            return {
              symbol,
              price: 0,
              change: 0,
              changePercent: '0.00%',
              error: 'No quote data available',
            };
          }

          console.log(`Quote for ${symbol}:`, quote);

          return {
            symbol,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
          };
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
          return {
            symbol,
            price: 0,
            change: 0,
            changePercent: '0.00%',
            error: 'Failed to fetch price',
          };
        }
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