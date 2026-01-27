
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ChannelStrategy, Idea, PostGoal, PostFormat, ChannelInfo, UsageMetadata } from "../types";
import { SYSTEM_PROMPT_BASE } from "../constants";
import { ChannelService } from "./channelService";

export class GeminiService {
  /**
   * Initializes the Google GenAI client using the API key from environment variables.
   */
  private static getAI() {
    // @ts-ignore
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Strategy pattern for model fallbacks to ensure reliability under high load.
   */
  private static async callWithFallback<T>(
    operation: (model: string) => Promise<T>
  ): Promise<T> {
    const models = ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-flash-lite-latest'];
    let lastError: any;

    for (const modelName of models) {
      try {
        return await operation(modelName);
      } catch (error: any) {
        lastError = error;
        const isOverloaded = error?.message?.includes('503') || 
                            error?.message?.includes('overloaded') || 
                            error?.message?.includes('429');
        
        if (isOverloaded) {
          console.warn(`Model ${modelName} overloaded or unavailable. Trying next...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue; 
        }
        throw error;
      }
    }
    throw lastError;
  }

  private static async executeWithRetry<T>(
    fn: () => Promise<T>, 
    retries: number = 2, 
    delay: number = 1500
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient = error?.message?.includes('503') || error?.message?.includes('overloaded');
      if (isTransient && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  }

  /**
   * Analyzes a channel's topic and tone.
   * Checks Firestore cache first, performs AI analysis if needed.
   */
  static async analyzeChannel(url: string): Promise<{ info: ChannelInfo, usage?: UsageMetadata }> {
    // Import cache service dynamically to avoid circular deps
    const { ChannelCacheService } = await import('./channelCacheService');
    const { CostCalculator } = await import('./costCalculator');
    
    // Check cache first
    const cached = await ChannelCacheService.getCachedChannel(url);
    if (cached) {
      console.log('✓ Using cached channel analysis');
      return { info: cached };
    }

    console.log('× Cache miss, performing AI analysis...');
    
    const usernameMatch = url.match(/t\.me\/(?:s\/)?([a-zA-Z0-9_]+)/);
    const username = usernameMatch ? usernameMatch[1] : url.replace(/[^a-zA-Z0-9_]/g, '');

    const rawData = await ChannelService.getChannelInfo(username);
    const ai = this.getAI();

    const { result, usage } = await this.callWithFallback(async (model) => {
      let prompt: string;
      let config: any = {
        systemInstruction: SYSTEM_PROMPT_BASE,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            topic: { type: Type.STRING, description: "Глобальная ниша и основные темы канала" },
            context: { type: Type.STRING, description: "Манера речи, любимые обороты, уровень формальности" },
            lastPosts: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "description", "topic", "context", "lastPosts"]
        }
      };

      if (rawData && rawData.last_posts.length > 0) {
        prompt = `ПРОВЕДИ ГЛУБОКИЙ АУДИТ КАНАЛА:
        Название: ${rawData.title}
        Описание: ${rawData.description}
        Контент: ${rawData.last_posts.join('\n---\n')}
        
        ЗАДАЧА:
        1. Определи ТОЧНУЮ ТЕМАТИКУ.
        2. Определи СТИЛЬ АВТОРА.`;
      } else {
        const previewUrl = `https://t.me/s/${username}`;
        prompt = `ПРОАНАЛИЗИРУЙ ТЕМУ И СТИЛЬ КАНАЛА ЧЕРЕЗ ПОИСК: ${previewUrl}
        Используй googleSearch, чтобы понять, о чем этот канал и как пишет его автор.`;
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: config
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const searchUrls = groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];

      const parsedResult = JSON.parse(response.text || "{}");
      if (!parsedResult.name || parsedResult.name === username) {
         throw new Error("Канал недоступен для анализа.");
      }

      if (searchUrls.length > 0) {
        parsedResult.description = (parsedResult.description || "") + "\n\nИсточники анализа: " + searchUrls.join(", ");
      }
      
      const hasGrounding = searchUrls.length > 0;
      const usageMetadata = CostCalculator.createUsageMetadata(response.usageMetadata, model, hasGrounding);
      return { result: parsedResult, usage: usageMetadata };
    });

    // Cache the result
    await ChannelCacheService.setCachedChannel(url, result);
    
    return { info: result, usage };
  }

  /**
   * Generates content ideas.
   */
  static async generateIdeas(strategy: ChannelStrategy): Promise<{ ideas: Idea[], usage: UsageMetadata }> {
    const ai = this.getAI();
    const info = strategy.analyzedChannel;
    const { CostCalculator } = await import('./costCalculator');
    
    return this.callWithFallback(async (model) => {
      const prompt = `Сгенерируй 5 идей для постов для канала «${info?.name}».
      ЦЕЛЬ: ${strategy.goal}
      ФОРМАТ: ${strategy.format}
      ТЕМАТИЧЕСКИЙ ФОКУС: ${info?.topic}
      ПОЖЕЛАНИЯ АВТОРА: ${strategy.userComments || "Нет"}
      Верни массив JSON с полями title, description, sources.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_BASE,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                sources: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "description", "sources"]
            }
          }
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const searchUrls = groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];
      const hasGrounding = searchUrls.length > 0;
      const usage = CostCalculator.createUsageMetadata(response.usageMetadata, model, hasGrounding);

      const ideas = JSON.parse(response.text || "[]").map((item: any, index: number) => ({
        ...item,
        sources: Array.from(new Set([...(item.sources || []), ...searchUrls])),
        id: `idea-${index}-${Date.now()}`
      }));

      return { ideas, usage };
    });
  }

  static async generatePostContent(idea: Idea, strategy: ChannelStrategy): Promise<{ text: string, usage: UsageMetadata }> {
    const ai = this.getAI();
    const info = strategy.analyzedChannel;
    const { CostCalculator } = await import('./costCalculator');
    
    return this.callWithFallback(async (model) => {
      const prompt = `НАПИШИ ПОСТ ДЛЯ КАНАЛА «${info?.name}» (Ниша: ${info?.topic}).
      ЦЕЛЬ: ${strategy.goal}
      ФОРМАТ: ${strategy.format}
      ТЕМА: ${idea.title}
      ОСНОВНЫЕ МЫСЛИ: ${idea.description}
      СТИЛЬ АВТОРА: ${info?.context}
      
      СТРОГИЕ ПРАВИЛА (НАРУШЕНИЕ ЗАПРЕЩЕНО):
      1. ДЛИНА ТЕКСТА: Максимум 900-1000 символов (включая пробелы). ПИШИ ОЧЕНЬ СЖАТО.
      2. ФОРМАТ: Никакого Markdown.
      3. ОРФОГРАФИЯ: Буква «ё» обязательна.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction: SYSTEM_PROMPT_BASE }
      });

      const usage = CostCalculator.createUsageMetadata(response.usageMetadata, model);
      return { text: response.text || "", usage };
    });
  }

  /**
   * Generates images using gemini-2.5-flash-image.
   */
  static async generateImage(prompt: string): Promise<{ imageUrl: string | null, usage: UsageMetadata | null }> {
    try {
      const ai = this.getAI();
      const visualPrompt = `Professional content for Telegram. Concept: "${prompt}". Minimalist, clean, high-end.`;
      const { CostCalculator } = await import('./costCalculator');
      const model = 'gemini-2.5-flash-image';
      
      const response = await this.executeWithRetry<GenerateContentResponse>(() => 
        ai.models.generateContent({
          model,
          contents: { parts: [{ text: visualPrompt }] },
          config: { 
            imageConfig: { 
              aspectRatio: "1:1"
            } 
          }
        })
      );

      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      const usage = CostCalculator.createImageUsageMetadata(model);
      
      if (part?.inlineData) {
        return { imageUrl: `data:image/png;base64,${part.inlineData.data}`, usage };
      }
      
      console.warn("No inline image data found in response.");
      return { imageUrl: null, usage: null };

    } catch (error) {
      console.error("Image generation failed:", error);
      // Return null so the post creation doesn't fail completely
      return { imageUrl: null, usage: null };
    }
  }
}
