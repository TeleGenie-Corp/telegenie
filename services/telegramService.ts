
export class TelegramService {
  static async publish(
    text: string, 
    botToken: string, 
    chatId: string, 
    mediaUrl?: string
  ): Promise<{ success: boolean; message: string; messageId?: number }> {
    if (!botToken || !chatId) {
      throw new Error("Настройки Telegram не найдены.");
    }

    const apiUrl = `https://api.telegram.org/bot${botToken}`;
    const safeText = text.length > 1024 ? text.substring(0, 1021) + "..." : text;

    try {
      let lastMessageId: number | undefined;

      if (mediaUrl) {
        const isVideo = mediaUrl.startsWith('blob:') || mediaUrl.includes('.mp4');
        const formData = new FormData();
        formData.append('chat_id', chatId);

        const res = await fetch(mediaUrl);
        const mediaBlob = await res.blob();

        const method = isVideo ? 'sendVideo' : 'sendPhoto';
        formData.append(isVideo ? 'video' : 'photo', mediaBlob, isVideo ? 'video.mp4' : 'photo.png');
        formData.append('caption', safeText);
        formData.append('parse_mode', 'HTML');

        const response = await fetch(`${apiUrl}/${method}`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.ok) throw new Error(result.description);
        lastMessageId = result.result.message_id;
      } else {
        const response = await fetch(`${apiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: safeText, parse_mode: 'HTML' })
        });
        const result = await response.json();
        if (!result.ok) throw new Error(result.description);
        lastMessageId = result.result.message_id;
      }

      return { 
        success: true, 
        message: "Опубликовано!", 
        messageId: lastMessageId 
      };
    } catch (error: any) {
      console.error("Telegram API Error:", error);
      return { success: false, message: `Ошибка: ${error.message}` };
    }
  }
}
