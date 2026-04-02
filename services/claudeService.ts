import { ChannelStrategy, Idea, PostGoal, UsageMetadata } from '../types';
import { SYSTEM_PROMPT_BASE } from '../constants';

export class ClaudeService {
  private static getHeaders() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  private static buildAuthorContext(strategy: ChannelStrategy): string {
    const info = strategy.analyzedChannel;
    const parts: string[] = ['АВТОР И БРЕНД:'];
    if (strategy.positioning) parts.push(`- Позиционирование: ${strategy.positioning}`);
    parts.push(`- Тональность: ${info?.toneOfVoice || info?.context || 'Экспертная, уверенная'}`);
    parts.push(`- Тематика канала: ${info?.topic || 'Не определена'}`);
    if (info?.contentPillars?.length) parts.push(`- Контент-столпы: ${info.contentPillars.join(', ')}`);
    if (info?.forbiddenPhrases?.length) parts.push(`- ЗАПРЕЩЁННЫЕ ФРАЗЫ (никогда не используй): ${info.forbiddenPhrases.join('; ')}`);
    return parts.join('\n');
  }

  private static buildFrameworkInstruction(goal: PostGoal, ideaTitle: string): string {
    switch (goal) {
      case PostGoal.SELL:
        return `ФРЕЙМВОРК (выбери ОДИН исходя из идеи):
- Если идея про выгоду/результат → AIDA: Внимание → Интерес → Желание → Действие.
- Если идея про ограничение/срок → ODC: Оффер → Дедлайн → Призыв.
- Если идея про конкретное решение → PAS: Боль → Усиление боли → Решение.
- Если идея про сомнения аудитории → Снятие возражений: Возражение → Факт → Доказательство → CTA.
Назови выбранный фреймворк: <!-- framework: AIDA --> (техническая метка, читатель её не видит).`;
      case PostGoal.ENGAGE:
        return `ФРЕЙМВОРК (выбери ОДИН исходя из идеи):
- Личный опыт → Сторителлинг: Контекст → Конфликт → Развязка → Вывод.
- Трансформация → BAB: Мир ДО → Мир ПОСЛЕ → Мост.
- Ошибка/провал → Искренний факап: Что случилось → Почему → Чему научился.
- Спорная тема → Провокация: Тезис → Антитезис → Вопрос к аудитории.
Назови выбранный фреймворк: <!-- framework: BAB -->`;
      case PostGoal.EDUCATE:
        return `ФРЕЙМВОРК:
- «Как делать» → Пошаговка: Проблема → Шаг 1 → Шаг 2 → Шаг 3 → Результат.
- Инсайт → Тезис-Мясо-Вывод: Тезис (жирный) → Аргументы/Примеры → Практический вывод.
- Разбор → Кейс: Ситуация → Что сделали → Результат с цифрами.
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

  static async generatePostContent(
    idea: Idea,
    strategy: ChannelStrategy
  ): Promise<{ text: string; usage: UsageMetadata }> {
    const info = strategy.analyzedChannel;
    const authorContext = this.buildAuthorContext(strategy);
    const frameworkInstruction = this.buildFrameworkInstruction(strategy.goal, idea.title);
    const pointContext = strategy.point
      ? `ГЛАВНЫЙ ПОИНТ (суть поста): «${strategy.point}». Весь текст должен раскрывать этот поинт.`
      : '';

    const prompt = `НАПИШИ ПОСТ ДЛЯ КАНАЛА «${info?.name || 'Telegram'}».

ИДЕЯ: «${idea.title}»
ЦЕЛЬ: ${strategy.goal}
${pointContext}

${authorContext}

${frameworkInstruction}

РЕДАКТУРА (метод Ильяхова — применяй сразу, не в отдельном проходе):
1. ЧИСТОТА: удали вводные («давайте разберёмся», «стоит отметить»), пустые оценки («уникальный», «эффективный»), штампы.
2. КОНКРЕТИКА: цифры, примеры, имена вместо абстракций.
3. СТРУКТУРА: заголовок-хук → мясо → чёткий CTA (что сделать читателю).
4. ЭМОДЗИ: 1–3 на пост как визуальные якоря (📌, 👉, ✅), не в середине предложений.

TELEGRAM HTML ФОРМАТИРОВАНИЕ:
- <b>жирный</b> — для ключевой мысли (1–2 раза на пост).
- <i>курсив</i> — для иронии или термина.
- <code>моноширинный</code> — для цифр (<code>+30%</code>).
- Абзацы разделяй пустой строкой (\\n\\n).
- Объём: 800–1500 знаков (не считая HTML-тегов).

ВЫДАЙ ТОЛЬКО ГОТОВЫЙ HTML-ТЕКСТ ПОСТА. Без обёрток \`\`\`html, без пояснений.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: SYSTEM_PROMPT_BASE,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API ${response.status}: ${err}`);
    }

    const data = await response.json();
    let text: string = data.content?.[0]?.text || '';
    text = text.replace(/^\s*```[a-zA-Z]*\n?/i, '').replace(/\n?```\s*$/i, '');
    text = text.replace(/<!--\s*framework:.*?-->\n?/gi, '');

    const usage: UsageMetadata = {
      promptTokens: data.usage?.input_tokens ?? 0,
      candidatesTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      estimatedCostUsd:
        ((data.usage?.input_tokens ?? 0) * 3 + (data.usage?.output_tokens ?? 0) * 15) / 1_000_000,
      modelName: 'claude-sonnet-4-5',
    };

    return { text, usage };
  }

  static async generatePostSuggestions(
    text: string,
    strategy: ChannelStrategy
  ): Promise<string[]> {
    const authorContext = this.buildAuthorContext(strategy);

    const prompt = `Ты — редактор Telegram-постов. Прочитай пост и предложи ровно 4 конкретных улучшения.

${authorContext}

ПОСТ:
${text}

ТРЕБОВАНИЯ К ОТВЕТУ:
- Ровно 4 пункта, каждый на отдельной строке, без нумерации и маркеров.
- Каждый пункт — конкретное действие: «Замени X на Y», «Добавь цифру в первый абзац», «Сократи последний блок до 2 предложений».
- Не общие советы («улучши стиль»), а точечные правки именно для этого текста.
- Длина каждого пункта: 5–12 слов.
- Только русский язык.

Выведи только 4 строки, без пояснений.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: SYSTEM_PROMPT_BASE,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API ${response.status}: ${err}`);
    }

    const data = await response.json();
    const raw: string = data.content?.[0]?.text || '';
    return raw
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 4);
  }

  static async polishContent(
    text: string,
    instruction: string,
    strategy: ChannelStrategy
  ): Promise<{ text: string; usage: UsageMetadata }> {
    const authorContext = this.buildAuthorContext(strategy);

    const prompt = `Ты — хирургический редактор. Внеси МИНИМАЛЬНЫЕ точечные изменения по инструкции.

ИНСТРУКЦИЯ: «${instruction}»

${authorContext}

ИСХОДНЫЙ ТЕКСТ (Telegram HTML):
${text}

ПРАВИЛА:
- Сохраняй все HTML-теги Telegram: <b>, <i>, <code>, <a href="...">, <u>, <s>, <tg-spoiler>.
- Не добавляй теги, которых не было в исходнике, если инструкция этого не требует.
- Меняй только то, о чём просит инструкция. Остальное — не трогай.
- НЕ добавляй вводных фраз типа «Вот улучшенный текст:».

ВЫДАЙ ТОЛЬКО ИТОГОВЫЙ HTML-ТЕКСТ. Без пояснений.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: SYSTEM_PROMPT_BASE,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API ${response.status}: ${err}`);
    }

    const data = await response.json();
    const resultText: string = data.content?.[0]?.text || text;

    const usage: UsageMetadata = {
      promptTokens: data.usage?.input_tokens ?? 0,
      candidatesTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      estimatedCostUsd:
        ((data.usage?.input_tokens ?? 0) * 3 + (data.usage?.output_tokens ?? 0) * 15) / 1_000_000,
      modelName: 'claude-sonnet-4-5',
    };

    return { text: resultText, usage };
  }
}
