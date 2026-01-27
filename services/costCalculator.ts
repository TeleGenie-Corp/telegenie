import { UsageMetadata } from '../types';

export class CostCalculator {
  // Pricing per 1M tokens (Gemini 2.0 / 2.5 - Jan 2025)
  // https://ai.google.dev/pricing
  private static PRICING = {
    // Gemini 2.0 Flash / 2.5 Flash
    flash: {
      input: 0.10,   // $0.10 per 1M input tokens
      output: 0.40   // $0.40 per 1M output tokens
    },
    // Gemini 2.0 Pro / 2.5 Pro
    pro: {
      input: 1.25,   // $1.25 per 1M input tokens
      output: 5.00   // $5.00 per 1M output tokens
    },
    // Gemini Flash Lite
    lite: {
      input: 0.02,   // $0.02 per 1M input tokens  
      output: 0.10   // $0.10 per 1M output tokens
    },
    // Google Search grounding (approximate)
    grounding: 0.035, // ~$35 per 1K grounded queries = $0.035 per query
    // Image generation (Gemini 2.0 Flash Image / Imagen)
    image: 0.04       // ~$0.04 per image (varies by resolution)
  };

  /**
   * Determines pricing tier based on model name.
   */
  private static getTier(modelName: string) {
    if (modelName.includes('pro')) return this.PRICING.pro;
    if (modelName.includes('lite')) return this.PRICING.lite;
    return this.PRICING.flash;
  }

  /**
   * Calculates the USD cost for a given token usage and model.
   */
  static calculateCost(
    promptTokens: number, 
    candidatesTokens: number, 
    modelName: string,
    hasGrounding: boolean = false
  ): number {
    const tier = this.getTier(modelName);
    
    const inputCost = (promptTokens / 1_000_000) * tier.input;
    const outputCost = (candidatesTokens / 1_000_000) * tier.output;
    const groundingCost = hasGrounding ? this.PRICING.grounding : 0;
    
    return inputCost + outputCost + groundingCost;
  }

  /**
   * Returns a standard UsageMetadata object.
   * @param usage - Raw usage object from Gemini API response
   * @param modelName - Model identifier
   * @param hasGrounding - Whether Google Search grounding was used
   */
  static createUsageMetadata(
    usage: any, 
    modelName: string, 
    hasGrounding: boolean = false
  ): UsageMetadata {
    const promptTokens = usage?.promptTokenCount || 0;
    const candidatesTokens = usage?.candidatesTokenCount || 0;
    const totalTokens = usage?.totalTokenCount || promptTokens + candidatesTokens;

    // Log warning if usage is missing (helps debug API issues)
    if (!usage) {
      console.warn(`[CostCalculator] Missing usage metadata for model: ${modelName}`);
    }
    
    return {
      promptTokens,
      candidatesTokens,
      totalTokens,
      estimatedCostUsd: this.calculateCost(promptTokens, candidatesTokens, modelName, hasGrounding),
      modelName
    };
  }

  /**
   * Returns usage metadata for image generation.
   */
  static createImageUsageMetadata(modelName: string): UsageMetadata {
    return {
      promptTokens: 0,
      candidatesTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: this.PRICING.image,
      modelName
    };
  }
}
