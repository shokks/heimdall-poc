/**
 * Ticker validation service using Finnhub API
 * Validates stock symbols against real market data
 */

interface TickerValidationResult {
  symbol: string;
  isValid: boolean;
  companyName?: string;
  marketCap?: number;
  logo?: string;
  confidence: number;
  error?: string;
  source: 'finnhub' | 'cache' | 'error';
}

interface FinnhubCompanyProfile {
  name: string;
  ticker: string;
  exchange: string;
  marketCapitalization: number;
  currency: string;
  country: string;
  ipo: string;
  weburl: string;
  logo?: string;
}

interface FinnhubQuote {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubSymbolSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface SymbolSearchResult {
  symbol: string;
  companyName: string;
  confidence: number;
  searchQuery: string;
  isExactMatch: boolean;
  source: 'finnhub_search' | 'direct_validation' | 'cache';
}

// Cache for validation results (5 minute cache)
const validationCache = new Map<string, {
  result: TickerValidationResult;
  timestamp: number;
}>();

// Cache for symbol search results (longer cache since company names don't change often)
const symbolSearchCache = new Map<string, {
  result: SymbolSearchResult | null;
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SEARCH_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for symbol searches

/**
 * Calculate similarity between two strings (simple implementation)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple character overlap scoring
  const chars1 = new Set(s1.split(''));
  const chars2 = new Set(s2.split(''));
  const overlap = new Set([...chars1].filter(x => chars2.has(x)));
  const totalChars = new Set([...chars1, ...chars2]);
  
  return overlap.size / totalChars.size;
}

/**
 * Search for company symbol using Finnhub symbol search API
 */
export async function searchCompanySymbol(query: string): Promise<SymbolSearchResult | null> {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = normalizedQuery;
  
  // Check cache first
  const cached = symbolSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_DURATION) {
    return cached.result ? { ...cached.result, source: 'cache' } : null;
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    console.error('Finnhub API key not configured for symbol search');
    return null;
  }

  try {
    // Check if query is already a valid ticker symbol format
    const tickerRegex = /^[A-Z]{1,5}(\.[A-Z])?$/;
    if (tickerRegex.test(query.toUpperCase())) {
      // Direct validation for potential ticker symbols
      const validation = await validateTicker(query.toUpperCase());
      if (validation.isValid) {
        const result: SymbolSearchResult = {
          symbol: validation.symbol,
          companyName: validation.companyName || validation.symbol,
          confidence: 0.95,
          searchQuery: query,
          isExactMatch: true,
          source: 'direct_validation'
        };
        
        // Cache the result
        symbolSearchCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }
    }

    // Patch: Truncate long queries to avoid Finnhub 'q too long' error
    let finnhubQuery = query;
    if (query.length > 15) {
      finnhubQuery = query.split(' ')[0];
    }

    // Use Finnhub symbol search
    const searchUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(finnhubQuery)}&token=${finnhubKey}`;
    console.log(`Searching Finnhub for: "${finnhubQuery}"`);
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Finnhub search API error: ${response.status}`);
    }
    
    const data: FinnhubSymbolSearchResult = await response.json();
    
    if (!data.result || data.result.length === 0) {
      console.log(`No results found for: "${query}"`);
      // Cache null result
      symbolSearchCache.set(cacheKey, { result: null, timestamp: Date.now() });
      return null;
    }

    // Find best match from results
    let bestMatch = data.result[0];
    let bestScore = 0;
    
    for (const item of data.result) {
      // Skip non-stock types
      if (item.type && !['Common Stock', 'Stock', ''].includes(item.type)) {
        continue;
      }
      
      // Calculate similarity scores
      const nameScore = calculateSimilarity(query, item.description);
      const symbolScore = calculateSimilarity(query, item.symbol);
      const combinedScore = Math.max(nameScore, symbolScore);
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestMatch = item;
      }
    }

    // Determine confidence based on similarity
    let confidence = bestScore;
    
    // Boost confidence for exact symbol matches
    if (bestMatch.symbol.toLowerCase() === normalizedQuery) {
      confidence = 0.95;
    }
    // Boost confidence for exact name matches
    else if (bestMatch.description.toLowerCase().includes(normalizedQuery)) {
      confidence = Math.max(confidence, 0.85);
    }
    
    // Only return results with reasonable confidence
    if (confidence < 0.4) {
      console.log(`Low confidence match for "${query}": ${bestMatch.description} (${confidence})`);
      symbolSearchCache.set(cacheKey, { result: null, timestamp: Date.now() });
      return null;
    }

    const result: SymbolSearchResult = {
      symbol: bestMatch.symbol,
      companyName: bestMatch.description,
      confidence,
      searchQuery: query,
      isExactMatch: confidence >= 0.9,
      source: 'finnhub_search'
    };

    console.log(`Found match for "${query}": ${result.companyName} (${result.symbol}) - confidence: ${confidence}`);
    
    // Cache the result
    symbolSearchCache.set(cacheKey, { result, timestamp: Date.now() });
    
    return result;

  } catch (error) {
    console.error(`Error searching for symbol "${query}":`, error);
    return null;
  }
}

/**
 * Search for multiple company symbols in parallel
 */
export async function searchCompanySymbols(queries: string[]): Promise<(SymbolSearchResult | null)[]> {
  // Limit concurrent requests
  const BATCH_SIZE = 3;
  const results: (SymbolSearchResult | null)[] = [];
  
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(query => searchCompanySymbol(query))
    );
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + BATCH_SIZE < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

/**
 * Validate a single ticker symbol using Finnhub API
 */
export async function validateTicker(symbol: string): Promise<TickerValidationResult> {
  const cacheKey = symbol.toUpperCase();
  
  // Check cache first
  const cached = validationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached.result, source: 'cache' };
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    return {
      symbol,
      isValid: false,
      confidence: 0,
      error: 'Finnhub API key not configured',
      source: 'error'
    };
  }

  try {
    // Get company profile and quote data in parallel
    const [profileResponse, quoteResponse] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubKey}`),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`)
    ]);

    const profile: FinnhubCompanyProfile = await profileResponse.json();
    const quote: FinnhubQuote = await quoteResponse.json();

    // Check if we got valid data
    const hasValidProfile = profile && profile.name && profile.name.trim().length > 0;
    const hasValidQuote = quote && typeof quote.c === 'number' && quote.c > 0;

    let confidence = 0;
    let isValid = false;

    if (hasValidProfile && hasValidQuote) {
      // Both profile and quote data available - high confidence
      confidence = 0.95;
      isValid = true;
    } else if (hasValidProfile && !hasValidQuote) {
      // Profile but no quote - might be delisted or non-trading
      confidence = 0.7;
      isValid = true;
    } else if (!hasValidProfile && hasValidQuote) {
      // Quote but no profile - unusual but possible
      confidence = 0.6;
      isValid = true;
    } else {
      // No valid data - likely invalid symbol
      confidence = 0;
      isValid = false;
    }

    // Additional validation checks
    if (isValid && hasValidProfile) {
      // Check if it's a US exchange (primary markets)
      const majorExchanges = ['NYSE', 'NASDAQ', 'AMEX', 'OTC'];
      if (profile.exchange && !majorExchanges.some(ex => 
        profile.exchange.toUpperCase().includes(ex)
      )) {
        // Foreign exchange - lower confidence
        confidence = Math.max(0.5, confidence - 0.2);
      }

      // Check market cap for additional validation
      if (profile.marketCapitalization && profile.marketCapitalization < 10) {
        // Very small market cap (< $10M) - might be penny stock
        confidence = Math.max(0.6, confidence - 0.1);
      }
    }

    const result: TickerValidationResult = {
      symbol: symbol.toUpperCase(),
      isValid,
      companyName: hasValidProfile ? profile.name : undefined,
      marketCap: hasValidProfile ? profile.marketCapitalization : undefined,
      logo: hasValidProfile ? profile.logo : undefined,
      confidence,
      source: 'finnhub'
    };

    // Cache the result
    validationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;

  } catch (error) {
    console.error(`Error validating ticker ${symbol}:`, error);
    
    const result: TickerValidationResult = {
      symbol,
      isValid: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'error'
    };

    return result;
  }
}

/**
 * Validate multiple ticker symbols in parallel
 */
export async function validateTickers(symbols: string[]): Promise<TickerValidationResult[]> {
  // Limit concurrent requests to avoid rate limiting
  const BATCH_SIZE = 5;
  const results: TickerValidationResult[] = [];
  
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(symbol => validateTicker(symbol))
    );
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to the API
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Enhanced validation that combines GPT confidence with market validation
 */
export function combineValidationScores(
  gptConfidence: number,
  marketValidation: TickerValidationResult
): number {
  if (!marketValidation.isValid) {
    // Market says it's invalid - heavily penalize
    return Math.min(0.3, gptConfidence * 0.5);
  }
  
  // Weighted average favoring market validation for high-confidence market data
  if (marketValidation.confidence >= 0.9) {
    return Math.max(gptConfidence, marketValidation.confidence);
  } else if (marketValidation.confidence >= 0.7) {
    return (gptConfidence * 0.4) + (marketValidation.confidence * 0.6);
  } else {
    return (gptConfidence * 0.7) + (marketValidation.confidence * 0.3);
  }
}

/**
 * Clean up expired cache entries
 */
export function cleanupValidationCache(): void {
  const now = Date.now();
  
  // Clean validation cache
  for (const [key, entry] of validationCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION * 2) {
      validationCache.delete(key);
    }
  }
  
  // Clean symbol search cache
  for (const [key, entry] of symbolSearchCache.entries()) {
    if (now - entry.timestamp > SEARCH_CACHE_DURATION * 2) {
      symbolSearchCache.delete(key);
    }
  }
}

// Auto-cleanup every 10 minutes
setInterval(cleanupValidationCache, 10 * 60 * 1000);