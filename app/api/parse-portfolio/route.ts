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
1. Only include valid US stock symbols (1-5 uppercase letters)
2. If shares aren't specified, use 1 as default
3. Use proper company names (e.g., "Apple Inc." not "apple")
4. If no valid stocks are found, return an empty array []
5. Common stock mappings:
   - Apple -> AAPL (Apple Inc.)
   - Microsoft -> MSFT (Microsoft Corporation)
   - Google/Alphabet -> GOOGL (Alphabet Inc.)
   - Tesla -> TSLA (Tesla, Inc.)
   - Amazon -> AMZN (Amazon.com, Inc.)
   - Netflix -> NFLX (Netflix, Inc.)
   - Meta/Facebook -> META (Meta Platforms, Inc.)

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
