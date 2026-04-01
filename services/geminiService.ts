
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
            description: { type: Type.STRING, description: "Краткое описание канала (1-2 предложения)" },
            topic: { type: Type.STRING, description: "Глобальная ниша и основные темы канала" },
            context: { type: Type.STRING, description: "Манера речи, любимые обороты, уровень формальности" },
            lastPosts: { type: Type.ARRAY, items: { type: Type.STRING } },
            contentPillars: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 контент-столпов (основные рубрики/категории постов)" },
            toneOfVoice: { type: Type.STRING, description: "Детальный ToV: уровень формальности, юмор, отношение к аудитории, фирменные приёмы" },
            forbiddenPhrases: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Фразы и обороты, которые НЕ свойственны этому каналу" }
          },
          required: ["name", "description", "topic", "context", "lastPosts", "contentPillars", "toneOfVoice", "forbiddenPhrases"]
        }
      };

      if (rawData && rawData.last_posts.length > 0) {
        prompt = `ПРОВЕДИ ГЛУБОКИЙ АУДИТ КАНАЛА:
        Название: ${rawData.title}
        Описание: ${rawData.description}
        Контент: ${rawData.last_posts.join('\n---\n')}

        ЗАДАЧА:
        1. Определи ТОЧНУЮ ТЕМАТИКУ — глобальную нишу и подтемы.
        2. Определи СТИЛЬ АВТОРА — как он пишет, какие обороты использует.
        3. Выдели 3-5 КОНТЕНТ-СТОЛПОВ — основные рубрики или категории постов.
        4. Опиши ТОНАЛЬНОСТЬ (Tone of Voice) подробно:
           - Уровень формальности (разговорный / деловой / дерзкий / академический)
           - Юмор (есть / нет / саркастический / мягкий)
           - Отношение к аудитории (на «ты» / на «вы» / менторский / дружеский)
           - Фирменные приёмы (риторические вопросы, списки, провокации, истории)
        5. Выпиши ЗАПРЕЩЁННЫЕ ФРАЗЫ — обороты, которые автор НИКОГДА не использует
           (например: «в современном мире», «давайте разберёмся», «стоит отметить»).`;
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
  static async generateIdeas(strategy: ChannelStrategy, recentPostTitles?: string[]): Promise<{ ideas: Idea[], usage: UsageMetadata }> {
    const ai = this.getAI();
    const info = strategy.analyzedChannel;
    const { CostCalculator } = await import('./costCalculator');

    // Fast path: use Flash Lite directly, no search grounding
    const model = 'gemini-2.0-flash-lite';

    const authorContext = strategy.positioning
      ? `ПОЗИЦИОНИРОВАНИЕ АВТОРА: ${strategy.positioning}`
      : `СТИЛЬ АВТОРА: ${info?.context || 'Экспертный, уверенный'}`;

    const topicConstraint = strategy.point
      ? `ГЛАВНЫЙ ПОИНТ: "${strategy.point}". Все идеи — разные углы на этот поинт.`
      : `ТЕМАТИКА: ${info?.topic || 'нет данных'}`;

    const memoryBlock = recentPostTitles && recentPostTitles.length > 0
      ? `\nНЕ ПОВТОРЯЙ (уже опубликовано):\n${recentPostTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : '';

    const prompt = `Придумай 3 идеи для постов в канал «${info?.name || 'Telegram'}».

Цель: ${strategy.goal}
${authorContext}
${topicConstraint}
${memoryBlock}

Каждая идея — твит-тезис до 140 знаков, С РАЗНОГО УГЛА:
- Угол A: личный опыт / история
- Угол B: контринтуитивный тезис / провокация
- Угол C: практический совет / факт / цифра

Верни JSON-массив. Поля: title (тезис ≤140 зн.), userBenefit (зачем читать, 10-15 слов), description (""), sources ([]).`;

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
              title: { type: Type.STRING },
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
      id: `idea-${index}-${Date.now()}`
    }));

    return { ideas, usage };
  }

  /**
   * Builds structured author context from positioning or channel analysis.
   * Decomposes positioning blob into labeled fields for better prompt grounding.
   */
  private static buildAuthorContext(strategy: ChannelStrategy): string {
    const info = strategy.analyzedChannel;
    const parts: string[] = ['АВТОР И БРЕНД:'];

    if (strategy.positioning) {
      parts.push(`- Позиционирование: ${strategy.positioning}`);
    }

    parts.push(`- Тональность: ${info?.toneOfVoice || info?.context || 'Экспертная, уверенная'}`);
    parts.push(`- Тематика канала: ${info?.topic || 'Не определена'}`);

    if (info?.contentPillars && info.contentPillars.length > 0) {
      parts.push(`- Контент-столпы: ${info.contentPillars.join(', ')}`);
    }

    if (info?.forbiddenPhrases && info.forbiddenPhrases.length > 0) {
      parts.push(`- ЗАПРЕЩЁННЫЕ ФРАЗЫ (никогда не используй): ${info.forbiddenPhrases.join('; ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Selects a specific framework with reasoning, not a random pick.
   */
  private static buildFrameworkInstruction(goal: PostGoal, ideaTitle: string): string {
    switch (goal) {
      case PostGoal.SELL:
        return `ФРЕЙМВОРК (выбери ОДИН исходя из идеи):
- Если идея про выгоду/результат → AIDA: Внимание → Интерес → Желание → Действие.
- Если идея про ограничение/срок → ODC: Оффер → Дедлайн → Призыв.
- Если идея про конкретное решение → PAS: Боль → Усиление боли → Решение.
- Если идея про сомнения аудитории → Снятие возражений: Возражение → Факт → Доказательство → CTA.

Назови выбранный фреймворк перед текстом в формате: <!-- framework: AIDA --> (это техническая метка, её не увидит читатель).`;

      case PostGoal.ENGAGE:
        return `ФРЕЙМВОРК (выбери ОДИН исходя из идеи):
- Если идея про личный опыт → Сторителлинг: Контекст → Конфликт → Развязка → Вывод.
- Если идея про трансформацию → BAB: Мир ДО → Мир ПОСЛЕ → Мост (как попасть).
- Если идея про ошибку/провал → Искренний факап: Что случилось → Почему → Чему научился.
- Если идея про спорную тему → Провокация: Тезис → Антитезис → Вопрос к аудитории.

Назови выбранный фреймворк: <!-- framework: BAB -->`;

      case PostGoal.EDUCATE:
        return `ФРЕЙМВОРК:
- Если идея про «как делать» → Пошаговка: Проблема → Шаг 1 → Шаг 2 → Шаг 3 → Результат.
- Если идея про инсайт → Тезис-Мясо-Вывод: Тезис (жирный) → Аргументы/Примеры → Практический вывод.
- Если идея про разбор → Кейс: Ситуация → Что сделали → Результат с цифрами.

Назови выбранный фреймворк: <!-- framework: ... -->`;

      case PostGoal.INFORM:
        return `ФРЕЙМВОРК:
- Новость/факт → Перевёрнутая пирамида: Главное → Детали → Контекст → «Что это значит для вас».
- Тренд/наблюдение → Тезис-Мясо-Вывод: Тезис → Факты → Вывод/Рекомендация.

Назови выбранный фреймворк: <!-- framework: ... -->`;

      default:
        return 'Пиши максимально полезно и сжато.';
    }
  }

  static async generatePostContent(idea: Idea, strategy: ChannelStrategy): Promise<{ text: string, usage: UsageMetadata }> {
    // Delegate to Claude Sonnet for higher quality post generation
    const { ClaudeService } = await import('./claudeService');
    return ClaudeService.generatePostContent(idea, strategy);
  }

  /**
   * Streams content generation for real-time feedback.
   */
  static async *generatePostContentStream(idea: Idea, strategy: ChannelStrategy): AsyncGenerator<{ text: string, usage?: UsageMetadata }> {
    const ai = this.getAI();
    const info = strategy.analyzedChannel;
    const { CostCalculator } = await import('./costCalculator');
    const model = 'gemini-2.0-flash-lite'; // Use fast model for streaming

    const authorContext = this.buildAuthorContext(strategy);
    const frameworkInstruction = this.buildFrameworkInstruction(strategy.goal, idea.title);

    const pointContext = strategy.point
      ? `ГЛАВНЫЙ ПОИНТ: «${strategy.point}». Весь текст раскрывает этот поинт.`
      : '';

    const prompt = `НАПИШИ ПОСТ ДЛЯ КАНАЛА «${info?.name || 'Telegram'}».

ИДЕЯ: «${idea.title}»
ЦЕЛЬ: ${strategy.goal}
${pointContext}

${authorContext}

${frameworkInstruction}

РЕДАКТУРА (метод Ильяхова — применяй сразу):
- Удали вводные и пустые оценки. Конкретика, цифры, примеры.
- Заголовок-хук → мясо → CTA.
- Эмодзи: 1-3 как визуальные якоря, не в середине предложений.

TELEGRAM HTML: <b>, <i>, <code>, <a href="...">. Пустая строка между абзацами. 800-1500 знаков.
ВЫДАЙ ТОЛЬКО HTML-ТЕКСТ ПОСТА.`;

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
    // Delegate to Claude Sonnet — better at precise, minimal edits
    const { ClaudeService } = await import('./claudeService');
    return ClaudeService.polishContent(text, instruction, strategy);
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
