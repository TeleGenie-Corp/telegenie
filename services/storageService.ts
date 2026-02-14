
import { UserProfile, Post, ChannelStrategy } from "../types";

const STORAGE_KEY = 'telegenie_profiles_v1';

export class StorageService {
  static getProfile(userId: string): UserProfile | null {
    const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return data ? JSON.parse(data) : null;
  }

  static saveProfile(profile: UserProfile): void {
    localStorage.setItem(`${STORAGE_KEY}_${profile.userId}`, JSON.stringify(profile));
  }

  static addPostToHistory(userId: string, post: Post): void {
    const profile = this.getProfile(userId) || this.createNewProfile(userId);
    profile.generationHistory = [post, ...profile.generationHistory].slice(0, 50);
    this.saveProfile(profile);
  }

  private static createNewProfile(userId: string): UserProfile {
    return {
      userId,
      balance: 0, // Default balance
      savedStrategies: [],
      generationHistory: [],
      createdAt: Date.now()
    };
  }
}
