
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

  /**
   * Verify that the bot has posting permissions in a channel.
   * @param channelUsername - Channel username (with or without @)
   * @param botToken - Bot token
   */
  static async verifyBotInChannel(
    channelUsername: string,
    botToken: string
  ): Promise<{ success: boolean; chatId?: string; title?: string; error?: string }> {
    const apiUrl = `https://api.telegram.org/bot${botToken}`;
    const username = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;

    try {
      // Get chat info
      const chatResponse = await fetch(`${apiUrl}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: username })
      });
      const chatResult = await chatResponse.json();
      
      if (!chatResult.ok) {
        return { success: false, error: 'Канал не найден или бот не добавлен' };
      }

      const chat = chatResult.result;
      const chatId = String(chat.id);
      const title = chat.title || username;

      // Check if bot can post messages
      const adminsResponse = await fetch(`${apiUrl}/getChatAdministrators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId })
      });
      const adminsResult = await adminsResponse.json();

      if (!adminsResult.ok) {
        return { success: false, error: 'Не удалось получить список администраторов' };
      }

      // Get bot info to find its user_id
      const meResponse = await fetch(`${apiUrl}/getMe`);
      const meResult = await meResponse.json();
      const botId = meResult.result?.id;

      // Check if bot is in admin list with post_messages permission
      const botAdmin = adminsResult.result.find((admin: any) => admin.user.id === botId);
      
      if (!botAdmin) {
        return { success: false, error: 'Бот не является администратором канала' };
      }

      if (botAdmin.can_post_messages === false) {
        return { success: false, error: 'У бота нет прав на публикацию' };
      }

      return { success: true, chatId, title };
    } catch (error: any) {
      console.error('Channel verification error:', error);
      return { success: false, error: error.message || 'Ошибка проверки канала' };
    }
  }
}
