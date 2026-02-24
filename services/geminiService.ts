
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ChannelStrategy, Idea, PostGoal, PostFormat, ChannelInfo, UsageMetadata } from "../types";
import { SYSTEM_PROMPT_BASE } from "../constants";
import { ChannelService } from "./channelService";

export class GeminiService {
  /**
   * Initializes the Google GenAI client using the API key from environment variables.
   */
  private static getAI() {
    const apiKey = process.env.GEMINI_API_KEY;

    
    if (!apiKey || apiKey === 'your_gemini_api_key') {
      console.error('[GeminiService] CRITICAL: API key is missing or is the default placeholder.');
      throw new Error('API_KEY_MISSING');
    }

    console.log('[GeminiService] Initializing with key:', apiKey ? `${apiKey.slice(0, 5)}...` : 'UNDEFINED');
    // @ts-ignore
    return new GoogleGenAI({ apiKey });
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

      const prompt = `Сгенерируй 3 идеи для постов для канала «${info?.name}».
      
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
      
      ВЫДАЙ ТОЛЬКО ТЕКСТ ПОСТА В ФОРМАТЕ TELEGRAM HTML (<b>, <i>, <a href="...">, <code>, <s>). 
      Без маркеров "Here is", без кавычек и без блока кода \`\`\`html.`;

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
   * Streams content generation for real-time feedback.
   */
  static async *generatePostContentStream(idea: Idea, strategy: ChannelStrategy): AsyncGenerator<{ text: string, usage?: UsageMetadata }> {
    const ai = this.getAI();
    const info = strategy.analyzedChannel;
    const { CostCalculator } = await import('./costCalculator');
    const model = 'gemini-2.0-flash-lite'; // Use fast model for streaming

    const authorContext = strategy.positioning 
      ? `ПОЗИЦИОНИРОВАНИЕ: ${strategy.positioning}`
      : `СТИЛЬ АВТОРА: ${info?.context}`;

    const pointContext = strategy.point
      ? `ГЛАВНЫЙ ПОИНТ (СУТЬ ПОСТА): "${strategy.point}" (Все должно крутиться вокруг этого).`
      : '';

    const prompt = `НАПИШИ ПОСТ ДЛЯ КАНАЛА «${info?.name}».
    
    ВХОДНЫЕ ДАННЫЕ:
    - Идея: "${idea.title}"
    - Цель: ${strategy.goal}
    - ${authorContext}
    - ${pointContext}
    
    ГЛАВНЫЕ ПРАВИЛА:
    1. Сразу к делу.
    2. Сильные глаголы.
    3. Ритм (чередуй длину фраз).
    4. Без воды.
    
    ВЫДАЙ ТОЛЬКО ТЕКСТ ПОСТА В ФОРМАТЕ TELEGRAM HTML (<b>, <i>, <a>, <code>, <s>). Без блока кода \`\`\`html.`;

    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: { systemInstruction: SYSTEM_PROMPT_BASE }
    });

    let fullText = '';
    
    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        yield { text: fullText };
      }
    }

    // Final yield with usage
    // Note: Usage might only be available at the end or via a refined API call
    // For now we estimate or try to get it from the final chunk if available
    // const finalUsage = ... 
    // yield { text: fullText, usage: finalUsage };
  }

  /**
   * Generates images using gemini-2.5-flash-image.
   * ... existing generateImage ...
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

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
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
  static async polishContent(text: string, instruction: string, strategy: ChannelStrategy): Promise<{ text: string, usage: UsageMetadata }> {
    const ai = this.getAI();
    const { CostCalculator } = await import('./costCalculator');
    const model = 'gemini-2.0-flash-lite'; // Fast model for text-only edits
    
    // Construct context
    const authorContext = strategy.positioning 
      ? `ПОЗИЦИОНИРОВАНИЕ АВТОРА: ${strategy.positioning}`
      : `СТИЛЬ АВТОРА: ${strategy.analyzedChannel?.context || 'Экспертный'}`;

    const pointContext = strategy.point
      ? `ГЛАВНЫЙ ПОИНТ (СУТЬ): "${strategy.point}"`
      : `ТЕМАТИКА КАНАЛА: ${strategy.analyzedChannel?.topic || 'Бизнес'}`;

    const prompt = `ОТРЕДАКТИРУЙ ТЕКСТ ПО ИНСТРУКЦИИ.
    
    КОНТЕКСТ АВТОРА И ЗАДАЧИ:
    - ${authorContext}
    - ${pointContext}
    - ЦЕЛЬ ПОСТА: ${strategy.goal}

    ИНСТРУКЦИЯ ПОЛЬЗОВАТЕЛЯ: ${instruction}

    ИСХОДНЫЙ ТЕКСТ:
    ${text}

    ПРАВИЛА:
    1. Строго следуй инструкции.
    2. Сохрани авторский стиль (если инструкция не говорит об обратном).
    3. Не добавляй "отсебятины", работай с исходником.
    4. Буква «ё» обязательна.
    5. Возвращай ТОЛЬКО отредактированный текст (Markdown).`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction: 'Ты профессиональный редактор. Твоя задача — улучшить текст, сохранив голос автора.' }
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
