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

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alpha Vantage API key not configured' },
        { status: 500 }
      );
    }

    // Fetch stock prices for all symbols
    const stockPrices: StockPrice[] = await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          const data: AlphaVantageResponse = await response.json();

          // Check for API errors
          if (data['Error Message']) {
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
            return {
              symbol,
              price: 0,
              change: 0,
              changePercent: '0.00%',
              error: 'No quote data available',
            };
          }

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