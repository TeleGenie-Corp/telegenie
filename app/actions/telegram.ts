'use server';

/**
 * Server Action для публикации в Telegram.
 * Бот-токен системного бота НИКОГДА не покидает сервер —
 * он читается из process.env.TELEGRAM_BOT_TOKEN (без NEXT_PUBLIC_).
 * Кастомные боты пользователя передаются отдельным параметром.
 */
import { TelegramService } from '@/services/telegramService';

function htmlToTelegramText(html: string): string {
  return html
    .replace(/<span class="tg-spoiler">([\s\S]*?)<\/span>/gi, '<tg-spoiler>$1</tg-spoiler>')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

async function sendToTelegram(
  token: string,
  chatId: string,
  text: string,
  imageUrl?: string,
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const apiUrl = `https://api.telegram.org/bot${token}`;
  const normalizedChatId =
    typeof chatId === 'string' && !chatId.startsWith('@') && !chatId.startsWith('-')
      ? `@${chatId}`
      : chatId;

  const safeText = text.length > 4096 ? text.substring(0, 4093) + '...' : text;

  try {
    if (imageUrl) {
      const mediaRes = await fetch(imageUrl);
      const mediaBlob = await mediaRes.blob();
      const isVideo =
        mediaBlob.type.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(imageUrl);
      const method = isVideo ? 'sendVideo' : 'sendPhoto';
      const fieldName = isVideo ? 'video' : 'photo';
      const filename = isVideo ? 'media.mp4' : 'media.png';
      const typedBlob = new Blob([mediaBlob], { type: isVideo ? 'video/mp4' : 'image/png' });

      const form = new FormData();
      form.append('chat_id', normalizedChatId);
      form.append(fieldName, typedBlob, filename);
      form.append('caption', safeText);
      form.append('parse_mode', 'HTML');

      const res = await fetch(`${apiUrl}/${method}`, { method: 'POST', body: form });
      const result = await res.json();
      if (!result.ok) throw new Error(result.description);
      return { success: true, messageId: result.result.message_id };
    }

    const res = await fetch(`${apiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: normalizedChatId, text: safeText, parse_mode: 'HTML' }),
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.description);
    return { success: true, messageId: result.result.message_id };
  } catch (err: any) {
    console.error('[publishPostAction] Telegram API error:', err);
    return { success: false, error: err.message || 'Ошибка Telegram API' };
  }
}

export async function publishPostAction(params: {
  postHtml: string;
  chatId: string;
  /** Токен кастомного бота пользователя. Если не передан — используется системный бот. */
  customBotToken?: string;
  imageUrl?: string;
}): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const { postHtml, chatId, customBotToken, imageUrl } = params;

  if (!chatId) return { success: false, error: 'Нет подключённого канала' };

  // Системный токен никогда не попадает в клиентский бандл
  const token = customBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { success: false, error: 'Бот не настроен. Проверьте настройки сервера (env).' };

  const text = htmlToTelegramText(postHtml);
  return sendToTelegram(token, chatId, text, imageUrl);
}

/**
 * Серверное действие для проверки бота в канале.
 * Позволяет проверить демо-бота (без передачи токена на клиент)
 * или кастомного бота пользователя.
 */
export async function verifyChannelAction(params: {
  username: string;
  customBotToken?: string;
}): Promise<{ 
  success: boolean; 
  chatId?: string; 
  title?: string; 
  photoUrl?: string; 
  memberCount?: number; 
  error?: string 
}> {
  const { username, customBotToken } = params;
  
  // Если токен не передан, используем системный
  const token = customBotToken || process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return { success: false, error: 'Бот не настроен на сервере.' };
  }

  return TelegramService.verifyBotInChannel(username, token);
}
