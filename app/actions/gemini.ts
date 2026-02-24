'use server';

import { GeminiService } from '@/services/geminiService';
import { ChannelStrategy, Idea } from '@/types';

/**
 * Server Actions для работы с Gemini API
 * Вызовы идут через сервер, API ключ не виден клиенту
 */

export async function analyzeChannelAction(url: string) {
  try {
    return await GeminiService.analyzeChannel(url);
  } catch (error: any) {
    console.error('[analyzeChannelAction]', error);
    throw error;
  }
}

export async function generateIdeasAction(strategy: ChannelStrategy) {
  try {
    return await GeminiService.generateIdeas(strategy);
  } catch (error: any) {
    console.error('[generateIdeasAction]', error);
    throw error;
  }
}

export async function generatePostContentAction(idea: Idea, strategy: ChannelStrategy) {
  try {
    return await GeminiService.generatePostContent(idea, strategy);
  } catch (error: any) {
    console.error('[generatePostContentAction]', error);
    throw error;
  }
}

export async function generateDemoPostAction(idea: Idea, strategy: ChannelStrategy) {
  try {
    const rawResult = await GeminiService.generatePostContent(idea, strategy);
    const { TextPolishingService } = await import('@/services/textPolishingService');
    const polishedResult = await TextPolishingService.polishAndFormat(rawResult.text, strategy);
    return { text: polishedResult.formattedText };
  } catch (error: any) {
    console.error('[generateDemoPostAction]', error);
    throw error;
  }
}

export async function polishContentAction(text: string, instruction: string, strategy: ChannelStrategy) {
  try {
    return await GeminiService.polishContent(text, instruction, strategy);
  } catch (error: any) {
    console.error('[polishContentAction]', error);
    throw error;
  }
}

export async function analyzePositioningAction(channelUrl: string) {
  try {
    return await GeminiService.analyzePositioning(channelUrl);
  } catch (error: any) {
    console.error('[analyzePositioningAction]', error);
    throw error;
  }
}

export async function generatePositioningFormulaAction(answers: Record<string, string>) {
  try {
    return await GeminiService.generatePositioningFormula(answers);
  } catch (error: any) {
    console.error('[generatePositioningFormulaAction]', error);
    throw error;
  }
}

export async function generatePostAction(input: any) {
  try {
    const { PostGenerationService } = await import('@/services/postGenerationService');
    return await PostGenerationService.generate(input);
  } catch (error: any) {
    console.error('[generatePostAction]', error);
    throw error;
  }
}
