
export enum PostGoal {
  INFORMATIONAL = 'Информационный',
  ENTERTAINING = 'Развлекательный',
  ENGAGING = 'Вовлекающий',
  SELLING = 'Продающий'
}

export enum PostFormat {
  STORY = 'История',
  INSTRUCTION = 'Инструкция',
  LIST = 'Список',
  CASE = 'Кейс',
  OPINION = 'Личное мнение'
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface User {
  id: string; // Internal or Telegram ID as string
  email?: string; // Optional now
  first_name: string;
  username?: string;
  avatar?: string;
  telegram?: TelegramUser;
  isMock?: boolean;
}

export interface UserProfile {
  userId: string;
  savedStrategies: ChannelStrategy[];
  generationHistory: Post[];
  balance: number; // In virtual USD
  createdAt: number;
}

export interface ChannelInfo {
  name: string;
  description: string;
  topic: string;
  context: string;
  lastPosts: string[];
}

export interface ChannelStrategy {
  id: string;
  channelUrl: string;
  goal: PostGoal;
  format: PostFormat;
  userComments: string;
  analyzedChannel?: ChannelInfo;
  analysisUsage?: UsageMetadata;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  sources: string[];
  usage?: UsageMetadata;
}

export interface UsageMetadata {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  modelName: string;
}

export interface Post {
  id: string;
  text: string;
  imageUrl?: string;
  generating: boolean;
  timestamp: number;
  usage?: UsageMetadata;
  imageUsage?: UsageMetadata;
  analysisUsage?: UsageMetadata;
  ideasUsage?: UsageMetadata;
  publishedAt?: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}
