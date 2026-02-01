import { GoogleGenAI } from "@google/genai";
import { ChannelStrategy, UsageMetadata } from "../types";
import { SYSTEM_PROMPT_BASE } from "../constants";

/**
 * TextPolishingService - AI-powered post formatting for Telegram.
 * 
 * Applies Law 30: "Make it look easy"
 * - Removes AI clichés and verbose phrasing
 * - Applies professional Telegram HTML formatting
 * - Ensures readability and impact
 */
export class TextPolishingService {
  
  private static getAI() {
    // @ts-ignore
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Polish and format raw post text with Telegram HTML.
   */
  static async polishAndFormat(
    rawText: string,
    strategy: ChannelStrategy
  ): Promise<{ formattedText: string; usage: UsageMetadata }> {
    const ai = this.getAI();
    const { CostCalculator } = await import('./costCalculator');

    try {
      const model = 'gemini-3-flash-preview';
      
      const prompt = `ОТПОЛИРУЙ ТЕКСТ ПОСТА В ИНФОСТИЛЕ (MЕTOД ИЛЬЯХОВА) И ПРИМЕНИ TELEGRAM HTML.

ИСХОДНЫЙ ТЕКСТ:
${rawText}

КОНТЕКСТ КАНАЛА:
Тема: ${strategy.analyzedChannel?.topic || 'общая'}
Стиль: ${strategy.analyzedChannel?.context || 'нейтральный'}

СТРОГИЕ ПРАВИЛА РЕДАКТУРЫ (ГЛАВРЕД):

1. ЧИСТОТА И СМЫСЛ:
   - УДАЛИ вводные: "давайте разберем", "стоит отметить", "как известно", "разумеется".
   - УДАЛИ оценки без фактов: "уникальный", "эффективный", "качественный", "лучший".
   - УДАЛИ штампы: "динамично развивающийся", "команда профессионалов", "индивидуальный подход".
   - Фокус на ПОЛЬЗЕ ЧИТАТЕЛЯ: не "мы предлагаем", а "вы получите".

2. СИНТАКСИС:
   - Одно предложение = одна мысль.
   - Упрощай деепричастные обороты.
   - Длина предложений: не более 15-20 слов.

3. TELEGRAM HTML ФОРМАТИРОВАНИЕ:
   - <b>жирный</b> для главной мысли (1-2 раза на пост).
   - <i>курсив</i> для иронии или термина.
   - <code>код</code> для цифр (например: <code>+30%</code> к выручке).
   - <a href="url">ссылка</a> для источников.
   - Делай отступы между абзацами.
   - ЭМОДЗИ: используй сдержанно (1-3 на пост) как визуальные якоря (📌, 👉, ✅). Не ставь их в середине предложений.

4. СТРУКТУРА:
   - Заголовок: сразу в "боль" или выгоду.
   - Тело: факты, примеры, "мясо".
   - Финал: четкий CTA (что сделать?).

ВЕРНИ ТОЛЬКО ГОТОВЫЙ HTML-ТЕКСТ. Без маркеров "Here is", без кавычек.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
          systemInstruction: SYSTEM_PROMPT_BASE,
          temperature: 0.7 // Creativity for style
        }
      });

      const formattedText = response.text?.trim() || rawText;
      const usage = CostCalculator.createUsageMetadata(response.usageMetadata, model);

      // Fallback: if AI failed to format, return raw text
      if (formattedText.length < 50) {
        console.warn('[TextPolishingService] AI returned too short text, using raw');
        return { formattedText: rawText, usage };
      }

      return { formattedText, usage };

    } catch (error: any) {
      console.error('[TextPolishingService] Polishing failed:', error);
      // Graceful degradation: return raw text if AI fails
      const { CostCalculator } = await import('./costCalculator');
      return { 
        formattedText: rawText, 
        usage: CostCalculator.createUsageMetadata({
          promptTokens: 0,
          candidatesTokens: 0,
          totalTokens: 0
        }, 'gemini-3-flash-preview')
      };
    }
  }

  /**
   * Strip all HTML tags (for character counting or plain text preview).
   */
  static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Validate Telegram HTML (basic check for unclosed tags).
   */
  static validateHtml(html: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const tags = ['b', 'i', 'code', 's', 'u', 'a'];
    
    for (const tag of tags) {
      const openCount = (html.match(new RegExp(`<${tag}(\\s|>)`, 'gi')) || []).length;
      const closeCount = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
      
      if (openCount !== closeCount) {
        errors.push(`Несовпадение тегов <${tag}>: открыто ${openCount}, закрыто ${closeCount}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
