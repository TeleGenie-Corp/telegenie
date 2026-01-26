
export class TelegramService {
  static async publish(
    text: string, 
    botToken: string, 
    chatId: string, 
    mediaUrl?: string, 
    isPaid: boolean = false
  ): Promise<{ success: boolean; message: string; messageId?: number }> {
    if (!botToken || !chatId) {
      throw new Error("Настройки Telegram не найдены.");
    }

    const apiUrl = `https://api.telegram.org/bot${botToken}`;
    // Принудительно ограничиваем текст для подписи (caption) до 1024 символов
    const safeText = text.length > 1024 ? text.substring(0, 1021) + "..." : text;

    try {
      let lastMessageId: number | undefined;

      if (mediaUrl) {
        const isVideo = mediaUrl.startsWith('blob:') || mediaUrl.includes('.mp4');
        const formData = new FormData();
        formData.append('chat_id', chatId);

        let mediaBlob: Blob;
        if (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:')) {
          const res = await fetch(mediaUrl);
          mediaBlob = await res.blob();
        } else {
          const res = await fetch(mediaUrl);
          mediaBlob = await res.blob();
        }

        if (isPaid) {
          // Платный контент (за звезды)
          formData.append('star_count', '1');
          
          // В sendPaidMedia подпись (caption) должна быть отдельным полем FormData, 
          // а не частью объекта внутри массива media.
          const mediaEntry = {
            type: isVideo ? 'video' : 'photo',
            media: `attach://mediafile`
          };
          
          formData.append('media', JSON.stringify([mediaEntry]));
          formData.append('mediafile', mediaBlob, isVideo ? 'video.mp4' : 'photo.png');
          formData.append('caption', safeText);
          formData.append('parse_mode', 'HTML');

          const response = await fetch(`${apiUrl}/sendPaidMedia`, { method: 'POST', body: formData });
          const result = await response.json();
          if (!result.ok) throw new Error(result.description);
          lastMessageId = result.result?.message_id; // У платных медиа ID может быть в другом поле, но Telegram возвращает Message
        } else {
          // Обычный контент с подписью
          const method = isVideo ? 'sendVideo' : 'sendPhoto';
          formData.append(isVideo ? 'video' : 'photo', mediaBlob, isVideo ? 'video.mp4' : 'photo.png');
          formData.append('caption', safeText);
          formData.append('parse_mode', 'HTML');

          const response = await fetch(`${apiUrl}/${method}`, { method: 'POST', body: formData });
          const result = await response.json();
          if (!result.ok) throw new Error(result.description);
          lastMessageId = result.result.message_id;
        }
      } else {
        // Только текст
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
        message: isPaid ? "Опубликовано платно (1 ★)!" : "Опубликовано!", 
        messageId: lastMessageId 
      };
    } catch (error: any) {
      console.error("Telegram API Error:", error);
      return { success: false, message: `Ошибка: ${error.message}` };
    }
  }
}
