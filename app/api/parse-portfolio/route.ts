import type { NextRequest } from 'next/server';
import { OpenAI } from 'openai';

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

    const prompt = `
You are a financial assistant that extracts stock portfolio information from natural language descriptions.

Parse this portfolio description and extract stock positions:
"${portfolioText}"

Return a JSON array of objects with this exact format:
[{"symbol": "AAPL", "shares": 100, "companyName": "Apple Inc."}]

Rules:
1. Recognize ANY valid publicly traded US stock symbols (1-5 uppercase letters)
2. Use your knowledge of companies to map company names to their correct stock symbols
3. If shares aren't specified, use 1 as default
4. Use proper official company names (e.g., "Apple Inc." not "apple")
5. If no valid stocks are found, return an empty array []
6. Be comprehensive - recognize major companies like Apple (AAPL), Microsoft (MSFT), Google/Alphabet (GOOGL), Tesla (TSLA), Amazon (AMZN), Netflix (NFLX), Meta/Facebook (META), Nvidia (NVDA), Disney (DIS), Boeing (BA), Coca-Cola (KO), McDonald's (MCD), Walmart (WMT), JPMorgan Chase (JPM), Berkshire Hathaway (BRK.B), Johnson & Johnson (JNJ), Procter & Gamble (PG), Visa (V), Mastercard (MA), Home Depot (HD), and thousands of others
7. Handle variations in company names (e.g., "Facebook" or "Meta" both map to META)

Return only the JSON array, no additional text.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return Response.json(
        { error: 'No response from AI model' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let positions: unknown;
    try {
      // Clean the response - remove any markdown code blocks
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      positions = JSON.parse(cleanedContent);
    } catch (_parseError) {
      return Response.json(
        {
          error:
            'Failed to parse AI response. Please try rephrasing your portfolio description.',
        },
        { status: 500 }
      );
    }

    // Validate the response format
    if (!Array.isArray(positions)) {
      return Response.json(
        { error: 'Invalid response format from AI model' },
        { status: 500 }
      );
    }

    // Validate each position
    const validPositions = positions.filter((position) => {
      return (
        position &&
        typeof position === 'object' &&
        typeof position.symbol === 'string' &&
        STOCK_SYMBOL_REGEX.test(position.symbol) &&
        typeof position.shares === 'number' &&
        position.shares > 0 &&
        typeof position.companyName === 'string' &&
        position.companyName.trim().length > 0
      );
    });

    return Response.json({ positions: validPositions });
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
