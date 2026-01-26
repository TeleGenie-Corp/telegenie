import { db } from './firebaseConfig';
import { collection, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { ChannelInfo } from '../types';

export interface CachedChannel extends ChannelInfo {
  username: string;
  analyzedAt: Date;
  updatedAt: Date;
}

export class ChannelCacheService {
  private static COLLECTION_NAME = 'channels';
  private static CACHE_EXPIRY_DAYS = 7; // Cache expires after 7 days

  /**
   * Normalize channel URL to username (lowercase, no domain)
   * Examples:
   * - "https://t.me/AiKanalishe" -> "aikanalishe"
   * - "t.me/s/AiKanalishe" -> "aikanalishe"
   * - "AiKanalishe" -> "aikanalishe"
   */
  static normalizeChannelUrl(url: string): string {
    const usernameMatch = url.match(/t\.me\/(?:s\/)?([a-zA-Z0-9_]+)/);
    const username = usernameMatch ? usernameMatch[1] : url.replace(/[^a-zA-Z0-9_]/g, '');
    return username.toLowerCase();
  }

  /**
   * Get cached channel info from Firestore
   * Returns null if not found or expired
   */
  static async getCachedChannel(url: string): Promise<ChannelInfo | null> {
    try {
      const username = this.normalizeChannelUrl(url);
      const docRef = doc(db, this.COLLECTION_NAME, username);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      const analyzedAt = data.analyzedAt?.toDate();
      
      // Check if cache is expired
      if (analyzedAt) {
        const daysSinceAnalysis = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAnalysis > this.CACHE_EXPIRY_DAYS) {
          console.log(`Cache expired for channel: ${username}`);
          return null;
        }
      }

      // Return ChannelInfo format
      return {
        name: data.name,
        description: data.description,
        topic: data.topic,
        context: data.context,
        lastPosts: data.lastPosts || []
      };
    } catch (error) {
      console.error('Error fetching cached channel:', error);
      return null;
    }
  }

  /**
   * Save channel analysis to Firestore cache
   */
  static async setCachedChannel(url: string, channelInfo: ChannelInfo): Promise<void> {
    try {
      const username = this.normalizeChannelUrl(url);
      const docRef = doc(db, this.COLLECTION_NAME, username);
      
      const cacheData = {
        username,
        ...channelInfo,
        analyzedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(docRef, cacheData);
      console.log(`Channel cached: ${username}`);
    } catch (error) {
      console.error('Error caching channel:', error);
      // Don't throw - caching failure shouldn't break the flow
    }
  }
}
