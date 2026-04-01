import Anthropic from '@anthropic-ai/sdk';
import { ChannelStrategy, Idea, PostGoal, UsageMetadata } from "../types";
import { SYSTEM_PROMPT_BASE } from "../constants";

// claude-sonnet-4-5 — best balance of quality and speed
const MODEL = 'claude-sonnet-4-5';

// Pricing per 1M tokens (USD) — update if Anthropic changes pricing
const COST_PER_1M_INPUT  = 3.0;
const COST_PER_1M_OUTPUT = 15.0;

export class ClaudeService {
  private static getClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[ClaudeService] ANTHROPIC_API_KEY is missing');
      throw new Error('ANTHROPIC_API_KEY_MISSING');
    }
    return new Anthropic({ apiKey });
  }

  private static buildUsage(usage: Anthropic.Usage): UsageMetadata {
    const input  = usage.input_tokens  ?? 0;
    const output = usage.output_tokens ?? 0;
    const cost   = (input / 1_000_000) * COST_PER_1M_INPUT
                 + (output / 1_000_000) * COST_PER_1M_OUTPUT;
    return {
      promptTokens:     input,
      candidatesTokens: output,
      totalTokens:      input + output,
      estimatedCostUsd: cost,
      modelName:        MODEL,
    };
  }

  private static buildAuthorContext(strategy: ChannelStrategy): string {
    const info = strategy.analyzedChannel;
    const parts: string[] = ['АВТОР И БРЕНД:'];

    if (strategy.positioning) {
      parts.push(`- Позиционирование: ${strategy.positioning}`);
    }
    parts.push(`- Тональность: ${info?.toneOfVoice || info?.context || 'Экспертная, уверенная'}`);
    parts.push(`- Тематика канала: ${info?.topic || 'Не определена'}`);

    if (info?.contentPillars?.length) {
      parts.push(`- Контент-столпы: ${info.contentPillars.join(', ')}`);
    }
    if (info?.forbiddenPhrases?.length) {
      parts.push(`- ЗАПРЕЩЁННЫЕ ФРАЗЫ (никогда не используй): ${info.forbiddenPhrases.join('; ')}`);
    }

    return parts.join('\n');
  }

  private static buildFrameworkInstruction(goal: PostGoal): string {
    switch (goal) {
      case PostGoal.SELL:
        return `ФРЕЙМВОРК (выбери ОДИН, исходя из идеи):
- Идея про выгоду/результат → AIDA: Внимание → Интерес → Желание → Действие.
- Идея про ограничение/срок → ODC: Оффер → Дедлайн → Призыв.
- Идея про конкретное решение → PAS: Боль → Усиление → Решение.
- Идея про сомнения → Снятие возражений: Возражение → Факт → Доказательство → CTA.`;

      case PostGoal.ENGAGE:
        return `ФРЕЙМВОРК (выбери ОДИН):
- Личный опыт → Сторителлинг: Контекст → Конфликт → Развязка → Вывод.
- Трансформация → BAB: Мир ДО → Мир ПОСЛЕ → Мост.
- Ошибка/провал → Искренний факап: Что случилось → Почему → Чему научился.
- Спорная тема → Провокация: Тезис → Антитезис → Вопрос к аудитории.`;

      case PostGoal.EDUCATE:
        return `ФРЕЙМВОРК (выбери ОДИН):
- «Как делать» → Пошаговка: Проблема → Шаги → Результат.
- Инсайт → Тезис-Мясо-Вывод: Тезис → Аргументы/Примеры → Практический вывод.
- Разбор → Кейс: Ситуация → Что сделали → Результат с цифрами.`;

      case PostGoal.INFORM:
        return `ФРЕЙМВОРК (выбери ОДИН):
- Новость/факт → Перевёрнутая пирамида: Главное → Детали → Контекст → «Что это значит для вас».
- Тренд → Тезис-Мясо-Вывод: Тезис → Факты → Вывод.`;

      default:
        return 'Пиши максимально полезно и сжато.';
    }
  }

  /**
   * Generates a full post in Telegram HTML format using Claude Sonnet.
   */
  static async generatePostContent(
    idea: Idea,
    strategy: ChannelStrategy
  ): Promise<{ text: string; usage: UsageMetadata }> {
    const client = this.getClient();
    const info   = strategy.analyzedChannel;

    const authorContext       = this.buildAuthorContext(strategy);
    const frameworkInstruction = this.buildFrameworkInstruction(strategy.goal);

    const pointContext = strategy.point
      ? `ГЛАВНЫЙ ПОИНТ (суть поста): «${strategy.point}». Весь текст должен раскрывать этот поинт.`
      : '';

    const lastPostsBlock = info?.lastPosts?.length
      ? `\nПОСЛЕДНИЕ ПОСТЫ КАНАЛА (для эталона стиля):\n${info.lastPosts.slice(0, 3).join('\n---\n')}`
      : '';

    const prompt = `НАПИШИ ПОСТ ДЛЯ TELEGRAM-КАНАЛА «${info?.name || 'Telegram'}».

ИДЕЯ: «${idea.title}»
ЦЕЛЬ: ${strategy.goal}
${pointContext}

${authorContext}
${lastPostsBlock}

${frameworkInstruction}

РЕДАКТУРА (метод Ильяхова — применяй сразу, не в отдельном проходе):
1. ЧИСТОТА: никаких вводных («давайте разберёмся», «стоит отметить»), пустых оценок («уникальный», «эффективный»), штампов.
2. КОНКРЕТИКА: цифры, примеры, имена — вместо абстракций. Если нет точных данных — не выдумывай, пиши обобщённо.
3. СТРУКТУРА: заголовок-хук → мясо → чёткий CTA (что сделать читателю).
4. ЭМОДЗИ: 1-3 на пост как визуальные якоря (📌 👉 ✅), не в середине предложений.

TELEGRAM HTML ФОРМАТИРОВАНИЕ:
- <b>жирный</b> — ключевая мысль (1-2 раза на пост).
- <i>курсив</i> — ирония или термин.
- <code>моноширинный</code> — цифры и данные (<code>+30%</code>).
- Пустая строка между абзацами (двойной перенос строки).
- Объём: 800-1500 знаков (не считая HTML-тегов).

ВЫДАЙ ТОЛЬКО ГОТОВЫЙ HTML-ТЕКСТ ПОСТА. Без обёрток \`\`\`html, без комментариев, без пояснений.`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT_BASE,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    let text = content.type === 'text' ? content.text : '';

    // Strip accidental code fences
    text = text.replace(/^\s*```[a-zA-Z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    return { text, usage: this.buildUsage(message.usage) };
  }

  /**
   * Surgically edits existing post content following the user's instruction.
   * Claude Sonnet is exceptionally good at minimal, precise edits.
   */
  static async polishContent(
    text: string,
    instruction: string,
    strategy: ChannelStrategy
  ): Promise<{ text: string; usage: UsageMetadata }> {
    const client = this.getClient();
    const authorContext = this.buildAuthorContext(strategy);

    const prompt = `Ты — хирургический редактор. Внеси МИНИМАЛЬНЫЕ точечные изменения в текст по инструкции.

ИНСТРУКЦИЯ: «${instruction}»

${authorContext}

ИСХОДНЫЙ ТЕКСТ (Telegram HTML):
${text}

ПРИНЦИП МИНИМАЛЬНОСТИ (КРИТИЧЕСКИ ВАЖНО):
- Меняй ТОЛЬКО то, что напрямую относится к инструкции.
- Каждое предложение, которое НЕ затронуто инструкцией — оставь ДОСЛОВНО.
- Не переписывай, не перефразируй, не «улучшай» то, о чём не просили.
- Не меняй порядок абзацев, не добавляй новые абзацы без прямой необходимости.

ФОРМАТ ОТВЕТА:
- Сохраняй ТОЧНО ТОТ ЖЕ HTML-формат, что в исходном тексте. Не конвертируй между форматами.
- Возвращай ТОЛЬКО текст. Без \`\`\`html, без комментариев, без пояснений.

АНТИПАТТЕРНЫ (никогда):
- ❌ «Заодно подправлю стиль» — меняй только по инструкции.
- ❌ Добавлять эмодзи, если не просили.
- ❌ Менять тональность всего текста, если просили изменить одно предложение.`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT_BASE,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    let resultText = content.type === 'text' ? content.text : text;
    resultText = resultText.replace(/^\s*```[a-zA-Z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    return { text: resultText, usage: this.buildUsage(message.usage) };
  }
}
