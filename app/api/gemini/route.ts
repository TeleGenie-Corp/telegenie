import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'your_gemini_api_key') {
  console.error('[Gemini API Route] CRITICAL: API key is missing or is placeholder');
}

/**
 * POST /api/gemini
 * Proxy for Gemini API requests to hide API key and bypass VPN restrictions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, contents, config } = body;

    if (!model || !contents) {
      return NextResponse.json(
        { error: 'Missing model or contents' },
        { status: 400 }
      );
    }

    console.log(`[Gemini API] Model: ${model}`);

    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey: apiKey! });
    
    // Try models with fallback
    const models = [model, 'gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-flash-lite-latest'];
    const uniqueModels = [...new Set(models)];
    let lastError: any;

    for (const modelName of uniqueModels) {
      try {
        const response = await genAI.models.generateContent({
          model: modelName,
          contents,
          config,
        });

        // Return the complete response including usage metadata
        return NextResponse.json({ 
          success: true, 
          data: {
            text: response.text,
            usageMetadata: response.usageMetadata,
            candidates: response.candidates,
          }
        });

      } catch (error: any) {
        lastError = error;
        const isOverloaded = error?.message?.includes('503') || 
                            error?.message?.includes('overloaded') || 
                            error?.message?.includes('429');
        
        if (isOverloaded) {
          console.warn(`Model ${modelName} overloaded. Trying next...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // If not overloaded, throw immediately
        throw error;
      }
    }

    // All models failed
    throw lastError;

  } catch (error: any) {
    console.error('[Gemini API] Error:', error);
    
    const isRegionError = error?.message?.includes('User location is not supported') || 
                          error?.message?.includes('403') ||
                          error?.message?.includes('Request is not permitted');
    
    if (isRegionError) {
      return NextResponse.json(
        { error: 'VPN_REQUIRED', message: 'Gemini API не доступен в вашем регионе' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'GEMINI_ERROR', message: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
