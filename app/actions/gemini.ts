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

export async function generatePositioningFormulaAction(answers: string[]) {
  try {
    return await GeminiService.generatePositioningFormula(answers);
  } catch (error: any) {
    console.error('[generatePositioningFormulaAction]', error);
    throw error;
  }
}
