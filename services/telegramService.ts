
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
    
    // Ensure chatId starts with @ if it's a username (not a numeric ID)
    const normalizedChatId = (typeof chatId === 'string' && !chatId.startsWith('@') && !chatId.startsWith('-')) 
      ? `@${chatId}` 
      : chatId;
    
    // Convert Web HTML (from TipTap) to Telegram HTML
    const processedText = text
      // Convert Spoilers (handle potential multi-line content)
      .replace(/<span class="tg-spoiler">([\s\S]*?)<\/span>/gi, '<tg-spoiler>$1</tg-spoiler>')
      
      // IMPORTANT: Empty paragraph handler MUST run BEFORE generic <br> handler
      // Otherwise <p><br></p> becomes <p>\n</p> and never matches this pattern
      .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '\n')  // Empty para -> single newline
      
      .replace(/<br\s*\/?>/gi, '\n') // <br> -> newline (now safe, empty paras already handled)
      
      .replace(/<\/p>/gi, '\n')      // </p> -> newline
      .replace(/<p>/gi, '')          // <p> -> remove
      .replace(/&nbsp;/g, ' ')       // &nbsp; -> space
      .trim();

    const safeText = processedText.length > 1024 ? processedText.substring(0, 1021) + "..." : processedText;

    try {
      let lastMessageId: number | undefined;

      if (mediaUrl) {
        const formData = new FormData();
        formData.append('chat_id', normalizedChatId);

        const res = await fetch(mediaUrl);
        const mediaBlob = await res.blob();

        // Detect media type from MIME or URL extension
        const isVideo = mediaBlob.type.startsWith('video/') || 
                        mediaUrl.match(/\.(mp4|mov|avi|webm)$/i);
        const isImage = mediaBlob.type.startsWith('image/') || 
                        mediaUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i);

        if (!isImage && !isVideo) {
          throw new Error(`Unsupported media format: ${mediaBlob.type || 'unknown'}`);
        }

        const method = isVideo ? 'sendVideo' : 'sendPhoto';
        const filename = isVideo ? 'media.mp4' : 'media.png';
        
        // Explicitly set MIME type to prevent Telegram misinterpretation
        const typedBlob = new Blob([mediaBlob], { 
          type: isVideo ? 'video/mp4' : 'image/png' 
        });
        
        formData.append(isVideo ? 'video' : 'photo', typedBlob, filename);
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
          body: JSON.stringify({ chat_id: normalizedChatId, text: safeText, parse_mode: 'HTML' })
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
  ): Promise<{ success: boolean; chatId?: string; title?: string; photoUrl?: string; memberCount?: number; error?: string }> {
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

      // Get photo URL if available
      let photoUrl: string | undefined;
      if (chat.photo?.big_file_id) {
        try {
          const fileResponse = await fetch(`${apiUrl}/getFile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: chat.photo.big_file_id })
          });
          const fileResult = await fileResponse.json();
          if (fileResult.ok && fileResult.result.file_path) {
            photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileResult.result.file_path}`;
          }
        } catch (e) { console.warn('Failed to fetch channel photo:', e); }
      }

      // Get member count
      let memberCount: number | undefined;
      try {
        const countResponse = await fetch(`${apiUrl}/getChatMemberCount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId })
        });
        const countResult = await countResponse.json();
        if (countResult.ok) {
          memberCount = countResult.result;
        }
      } catch (e) { console.warn('Failed to fetch member count:', e); }

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

      return { success: true, chatId, title, photoUrl, memberCount };
    } catch (error: any) {
      console.error('Channel verification error:', error);
      return { success: false, error: error.message || 'Ошибка проверки канала' };
    }
  }

  /**
   * Delete a message from a chat
   */
  static async deleteMessage(
    chatId: string,
    messageId: number,
    botToken: string
  ): Promise<{ success: boolean; error?: string }> {
    const apiUrl = `https://api.telegram.org/bot${botToken}/deleteMessage`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId })
      });
      const result = await response.json();
      
      if (!result.ok) {
         return { success: false, error: result.description };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Delete message error:', error);
      return { success: false, error: error.message };
    }
  }
}
