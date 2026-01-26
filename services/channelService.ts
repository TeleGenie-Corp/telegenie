
/**
 * ChannelService
 * Компонент для извлечения данных из Telegram через внешнюю облачную функцию.
 * Использует специализированный API для обхода ограничений и получения чистого контента.
 */
export class ChannelService {
  /**
   * URL развернутой в Google Cloud функции для чтения каналов.
   */
  private static API_ENDPOINT = "https://channel-reader-837051086539.us-west1.run.app";

  /**
   * Получает данные канала напрямую через Cloud Function.
   * Если функция возвращает ошибку или недоступна, возвращает null для активации fallback-механизма в GeminiService.
   */
  static async getChannelInfo(username: string) {
    // Формируем URL согласно спецификации: ?name=username
    const fetchUrl = `${this.API_ENDPOINT}?name=${username}`;
    
    try {
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`Cloud Function returned status: ${response.status}`);
      }
      
      const data = await response.json();

      // Проверка на наличие ошибки в ответе API
      if (data.error) {
        console.warn("API Error:", data.error);
        return null;
      }

      // Возвращаем структуру, ожидаемую GeminiService
      return {
        title: data.title || username,
        description: data.description || "",
        last_posts: data.last_posts || []
      };
    } catch (error: any) {
      console.warn("ChannelService fetch failed:", error.message);
      // Возвращаем null, чтобы GeminiService переключился на поиск (Google Search Grounding)
      return null;
    }
  }
}
