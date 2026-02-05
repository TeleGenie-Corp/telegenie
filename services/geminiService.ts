
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
   * Generates content ideas as short, punchy "tweets".
   */
  static async generateIdeas(strategy: ChannelStrategy): Promise<{ ideas: Idea[], usage: UsageMetadata }> {
    const ai = this.getAI();
    const info = strategy.analyzedChannel;
    const { CostCalculator } = await import('./costCalculator');
    
    return this.callWithFallback(async (model) => {
      // Construct context from Positioning or Analysis
      const authorContext = strategy.positioning 
        ? `ПОЗИЦИОНИРОВАНИЕ АВТОРА: ${strategy.positioning}`
        : `СТИЛЬ АВТОРА: ${info?.context || 'Экспертный, уверенный'}`;

      // Construct Topic/Point constraint
      const topicConstraint = strategy.point
        ? `ГЛАВНЫЙ ПОИНТ (Тема поста): "${strategy.point}".\nВСЕ ИДЕИ ДОЛЖНЫ БЫТЬ ПОСВЯЩЕНЫ ЭТОМУ ПОИНТУ, но с разных углов (подходов).`
        : `ТЕМАТИЧЕСКИЙ ФОКУС: ${info?.topic}`;

      const prompt = `Сгенерируй 5 идей для постов для канала «${info?.name}».
      
      ВВОДНЫЕ ДАННЫЕ:
      - Цель: ${strategy.goal}
      - ${authorContext}
      - ${topicConstraint}
      
      ФОРМАТ ВЫВОДА:
      Каждая идея должна быть сформулирована как "Короткий Твит" (тезис, инсайт, провокация) длиной до 140 знаков.
      
      ПРИНЦИПЫ:
      1. НИКАКОЙ ВОДЫ. Только суть.
      2. Дерзко, коротко, без "успешного успеха".
      3. Если цель "Продать" -> идея должна продавать ПОИНТ (или вести к нему).
      4. Если цель "Вовлечь" -> провокация вокруг ПОИНТА.

      Верни массив JSON с полями title (сам твит-идея), description (пустое поле), userBenefit (зачем это читать), sources.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_BASE,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Короткий твит-тезис (до 140 символов)" },
                description: { type: Type.STRING },
                userBenefit: { type: Type.STRING },
                sources: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "description", "userBenefit", "sources"]
            }
          }
        }
      });

      const usage = CostCalculator.createUsageMetadata(response.usageMetadata, model);

      const ideas = JSON.parse(response.text || "[]").map((item: any, index: number) => ({
        ...item,
        sources: [],
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
      
      // Select Framework based on Goal
      let frameworkInstructions = "";
      switch (strategy.goal) {
          case PostGoal.SELL:
              frameworkInstructions = `
              ИСПОЛЬЗУЙ ОДИН ИЗ ФРЕЙМВОРКОВ (Выбери наиболее подходящий):
              1. AIDA (Attention -> Interest -> Desire -> Action).
              2. ODC (Offer -> Deadline -> Call to Action).
              3. 4U (Useful, Urgent, Unique, Ultra-Specific).
              4. Снятие возражений.
              `;
              break;
          case PostGoal.ENGAGE:
              frameworkInstructions = `
              ИСПОЛЬЗУЙ ОДИН ИЗ ФРЕЙМВОРКОВ:
              1. Сторителлинг "Путь героя".
              2. BAB (World Before -> World After -> Bridge).
              3. "Искренний Факап".
              `;
              break;
          case PostGoal.EDUCATE:
          case PostGoal.INFORM:
              frameworkInstructions = `
              ИСПОЛЬЗУЙ СТРУКТУРУ:
              1. Тезис.
              2. Мясо (Контент).
              3. Вывод/Action.
              `;
              break;
          default:
              frameworkInstructions = "Пиши максимально полезно и сжато.";
      }

      // Context construction
      const authorContext = strategy.positioning 
        ? `ПОЗИЦИОНИРОВАНИЕ: ${strategy.positioning}`
        : `СТИЛЬ АВТОРА: ${info?.context}`;

      const pointContext = strategy.point
        ? `ГЛАВНЫЙ ПОИНТ (СУТЬ ПОСТА): "${strategy.point}" (Все должно крутиться вокруг этого).`
        : '';

      const prompt = `НАПИШИ ПОСТ ДЛЯ КАНАЛА «${info?.name}».
      
      ВХОДНЫЕ ДАННЫЕ:
      - Идея (Твит): "${idea.title}"
      - Цель: ${strategy.goal}
      - ${authorContext}
      - ${pointContext}

      ${frameworkInstructions}

      ГЛАВНЫЕ ПРАВИЛА (The Algorithm of Power):
      1. ПОЛЬЗА: Текст должен решать проблему.
      2. ФАКТЫ ВМЕСТО ОЦЕНОК: Конкретика, цифры, примеры.
      3. СИЛЬНЫЕ ГЛАГОЛЫ: Активный залог.
      4. РИТМ: Чередуй длину предложений.
      5. СУШКА: Без воды и вводных слов.
      6. ПЕРВЫЙ ЭКРАН: Хук в первой строке.

      ТЕХНИЧЕСКИЕ ОГРАНИЧЕНИЯ:
      - Объем: до 1500 знаков.
      - Пустая строка между абзацами.
      - Буква «ё» обязательна.
      
      ВЫДАЙ ТОЛЬКО ТЕКСТ ПОСТА.`;

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

  /**
   * Polishes/edits content based on user instruction.
   * Uses fast model directly - no heavy tools needed for simple text edits.
   */
  static async polishContent(text: string, instruction: string): Promise<{ text: string, usage: UsageMetadata }> {
    const ai = this.getAI();
    const { CostCalculator } = await import('./costCalculator');
    const model = 'gemini-2.0-flash-lite'; // Fast model for text-only edits
    
    const prompt = `ОТРЕДАКТИРУЙ ТЕКСТ ПО ИНСТРУКЦИИ.

ИНСТРУКЦИЯ: ${instruction}

ИСХОДНЫЙ ТЕКСТ:
${text}

ПРАВИЛА:
- Сохрани общий смысл.
- Не добавляй ничего лишнего.
- Буква «ё» обязательна.
- Возвращай ТОЛЬКО отредактированный текст.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction: 'Ты редактор. Возвращай только текст без комментариев.' }
    });

    const usage = CostCalculator.createUsageMetadata(response.usageMetadata, model);
    return { text: response.text || text, usage };
  }

  /**
   * Analyzes channel to guess positioning answers.
   * Uses ChannelService (cloud function) for consistent data fetching.
   */
  static async analyzePositioning(channelUrl: string): Promise<Record<string, string>> {
     const ai = this.getAI();
     
     // Extract username and fetch real channel data via cloud function
     const usernameMatch = channelUrl.match(/t\.me\/(?:s\/)?([a-zA-Z0-9_]+)/);
     const username = usernameMatch ? usernameMatch[1] : channelUrl.replace(/[^a-zA-Z0-9_]/g, '');
     
     const rawData = await ChannelService.getChannelInfo(username);
     
     if (!rawData || rawData.last_posts.length === 0) {
       console.warn('No channel data for positioning, returning empty');
       return {};
     }

     const prompt = `ПРОАНАЛИЗИРУЙ КАНАЛ И ОТВЕТЬ НА ВОПРОСЫ ДЛЯ ПОЗИЦИОНИРОВАНИЯ.

ДАННЫЕ КАНАЛА:
Название: ${rawData.title}
Описание: ${rawData.description}
Последние посты:
${rawData.last_posts.slice(0, 5).join('\n---\n')}

ВОПРОСЫ:
1. audience: Кто целевая аудитория? (конкретно: возраст, профессия, ситуация)
2. problem: Какую ключевую проблему решает автор?
3. category: В какой нише конкурирует?
4. diff: Чем отличается от других каналов?
5. benefit: Главная выгода для читателя?
6. emotion: 2-3 прилагательных, описывающих эмоции бренда
7. phrase: Одной фразой о чем канал?

Верни JSON объект {audience, problem, category, diff, benefit, emotion, phrase}.
Ответы на русском, краткие и по делу.`;

     const response = await this.callWithFallback(async (model) => {
       const res = await ai.models.generateContent({
         model,
         contents: prompt,
         config: {
           responseMimeType: "application/json"
         }
       });
       return res;
     });

     // Parse JSON from response
     const text = response.text || "{}";
     const jsonMatch = text.match(/\{[\s\S]*\}/);
     return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  /**
   * Collapses answers into a single formula.
   */
  static async generatePositioningFormula(answers: Record<string, string>): Promise<string> {
      const ai = this.getAI();
      const model = 'gemini-2.0-flash-lite'; // Valid model name

      const inputs = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
      
      const prompt = `СОБЕРИ ФОРМУЛУ ПОЗИЦИОНИРОВАНИЯ ИЗ ОТВЕТОВ:
      ${inputs}

      ИСПОЛЬЗУЙ ШАБЛОН:
      "Для [конкретной аудитории], которая хочет/сталкивается с [ключевая задача/боль], [бренд] — это [категория], который даёт [главная выгода], потому что [ключевые отличия]."

      Задача: Сформулируй ОДНОЙ красивой, связной, продающей фразой. Убери "воду". Сделай так, чтобы звучало статусно и понятно.`;

      const response = await ai.models.generateContent({
          model,
          contents: prompt
      });

      return response.text?.trim() || "";
  }
}
