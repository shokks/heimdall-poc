import type { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import { validateTickers, combineValidationScores, searchCompanySymbols } from '@/lib/ticker-validation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Regex for validating stock symbols
const STOCK_SYMBOL_REGEX = /^[A-Z]{1,5}$/;

export async function POST(request: NextRequest) {
  try {
    const { portfolioText } = await request.json();

    if (!portfolioText || typeof portfolioText !== 'string') {
      return Response.json(
        { error: 'Portfolio text is required' },
        { status: 400 }
      );
    }

    // STEP 1: Extract user intent for company references from natural language
    const extractionPrompt = `
You are an expert at extracting investment intent from natural language portfolio descriptions.

Analyze this text and extract what companies the user is referring to:
"${portfolioText}"

Extract:
1. What company the user INTENDED to reference (resolve nicknames, typos, descriptions to actual company intent)
2. Share quantities (if mentioned, otherwise use 1)

Examples of intent extraction:
- "apple stock" → "Apple" (referring to Apple Inc.)
- "microsft" → "Microsoft" (typo correction)
- "facebok" → "Facebook" (typo, now Meta)
- "iPhone maker" → "Apple" (description to company)
- "AMZN" → "Amazon" (ticker to company)
- "google" → "Google" (common name for Alphabet)
- "coke" → "Coca-Cola" (nickname)
- "windows company" → "Microsoft" (product reference)

Be VERY GENEROUS in extracting intent - include anything that could reasonably refer to a public company.
Resolve obvious typos and variations to the intended company name.
Convert product/service references to company names.
Normalize informal names to proper company references.

Return JSON array: [{"intent": "Company Name", "shares": number}]

Focus on INTENT not exact spelling - we will search for the actual company later.
Return only the JSON array, no additional text.
    `.trim();

    console.log('Step 1: Extracting company names...');
    const extractionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: extractionPrompt }],
      temperature: 0.1,
      max_tokens: 800,
    });

    const extractionContent = extractionResponse.choices[0]?.message?.content;
    if (!extractionContent) {
      return Response.json(
        { error: 'Failed to extract companies from description' },
        { status: 500 }
      );
    }

    // Parse extraction results
    let extractedIntents: Array<{intent: string, shares: number}>;
    try {
      const cleanedContent = extractionContent.replace(/```json\n?|\n?```/g, '').trim();
      extractedIntents = JSON.parse(cleanedContent);
    } catch (_parseError) {
      return Response.json(
        { error: 'Failed to parse company extraction. Please try rephrasing.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(extractedIntents) || extractedIntents.length === 0) {
      return Response.json({ 
        positions: [],
        validationSummary: {
          totalParsed: 0,
          passedBasicValidation: 0,
          passedMarketValidation: 0,
          invalidTickers: [],
          extractedCompanies: [],
          warnings: ['No companies found in the description']
        }
      });
    }

    console.log(`Step 1 complete: Extracted ${extractedIntents.length} company intents:`, extractedIntents);

    // STEP 2: Search for ticker symbols using Finnhub symbol search
    console.log('Step 2: Searching for ticker symbols using Finnhub...');
    
    const searchQueries = extractedIntents.map(intent => intent.intent);
    const searchResults = await searchCompanySymbols(searchQueries);
    
    // Convert search results to positions format
    const positions = extractedIntents.map((intent, index) => {
      const searchResult = searchResults[index];
      
      if (!searchResult) {
        return null; // Will be filtered out
      }
      
      return {
        symbol: searchResult.symbol,
        shares: intent.shares,
        companyName: searchResult.companyName,
        confidence: searchResult.confidence,
        searchQuery: intent.intent,
        isExactMatch: searchResult.isExactMatch,
        source: searchResult.source
      };
    }).filter(Boolean); // Remove null results
    
    console.log(`Step 2 complete: Found ${positions.length} ticker matches out of ${extractedIntents.length} intents:`, positions);

    // Validate the response format
    if (!Array.isArray(positions)) {
      return Response.json(
        { error: 'Invalid response format from AI model' },
        { status: 500 }
      );
    }

    // PASS 1: Basic validation of GPT response format
    const basicValidPositions = positions.filter((position) => {
      return (
        position &&
        typeof position === 'object' &&
        typeof position.symbol === 'string' &&
        STOCK_SYMBOL_REGEX.test(position.symbol) &&
        typeof position.shares === 'number' &&
        position.shares > 0 &&
        typeof position.companyName === 'string' &&
        position.companyName.trim().length > 0 &&
        typeof position.confidence === 'number' &&
        position.confidence >= 0.5 // Only include positions with confidence >= 50% (market validation will filter)
      );
    });

    if (basicValidPositions.length === 0) {
      return Response.json({ 
        positions: [],
        validationSummary: {
          totalParsed: positions.length,
          passedBasicValidation: 0,
          passedMarketValidation: 0,
          invalidTickers: [],
          extractedCompanies: extractedIntents.map(c => c.intent),
          searchResults: searchResults.map((result, index) => ({
            intent: extractedIntents[index].intent,
            found: result ? `${result.companyName} (${result.symbol})` : null,
            confidence: result?.confidence || 0
          })),
          warnings: ['No valid positions found after ticker mapping']
        }
      });
    }

    // PASS 2: Market validation using Finnhub API
    console.log(`Validating ${basicValidPositions.length} tickers against market data...`);
    
    const symbols = basicValidPositions.map(pos => pos!.symbol);
    const marketValidations = await validateTickers(symbols);
    
    // Combine search confidence with market validation
    const enhancedPositions = basicValidPositions.map((position, index) => {
      const pos = position!; // We know it's not null from filter
      const marketValidation = marketValidations[index];
      const combinedConfidence = combineValidationScores(
        pos.confidence,
        marketValidation
      );
      
      return {
        symbol: pos.symbol,
        shares: pos.shares,
        companyName: marketValidation.companyName || pos.companyName,
        confidence: combinedConfidence,
        gptConfidence: pos.confidence,
        searchQuery: pos.searchQuery,
        isExactMatch: pos.isExactMatch,
        searchSource: pos.source,
        marketValidation: {
          isValid: marketValidation.isValid,
          confidence: marketValidation.confidence,
          source: marketValidation.source,
          marketCap: marketValidation.marketCap,
          error: marketValidation.error
        }
      };
    });

    // Filter out positions that fail market validation
    const finalValidPositions = enhancedPositions.filter(pos => 
      pos.marketValidation.isValid && pos.confidence >= 0.5
    );

    // Collect validation summary
    const invalidTickers = enhancedPositions
      .filter(pos => !pos.marketValidation.isValid)
      .map(pos => pos.symbol);
    
    const lowConfidenceTickers = enhancedPositions
      .filter(pos => pos.marketValidation.isValid && pos.confidence < 0.7)
      .map(pos => pos.symbol);

    const warnings = [];
    if (invalidTickers.length > 0) {
      warnings.push(`Invalid tickers found: ${invalidTickers.join(', ')}`);
    }
    if (lowConfidenceTickers.length > 0) {
      warnings.push(`Low confidence tickers: ${lowConfidenceTickers.join(', ')}`);
    }

    console.log(`Validation complete: ${finalValidPositions.length}/${basicValidPositions.length} positions validated`);

    return Response.json({ 
      positions: finalValidPositions,
      validationSummary: {
        totalParsed: positions.length,
        passedBasicValidation: basicValidPositions.length,
        passedMarketValidation: finalValidPositions.length,
        invalidTickers,
        lowConfidenceTickers,
        extractedCompanies: extractedIntents.map(c => c.intent),
        searchResults: searchResults.map((result, index) => ({
          intent: extractedIntents[index].intent,
          found: result ? `${result.companyName} (${result.symbol})` : null,
          confidence: result?.confidence || 0
        })),
        warnings
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('API key')) {
      return Response.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    return Response.json(
      { error: 'Failed to parse portfolio. Please try again.' },
      { status: 500 }
    );
  }
}
