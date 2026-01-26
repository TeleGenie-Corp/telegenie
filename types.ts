
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

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface UserProfile {
  userId: string;
  savedStrategies: ChannelStrategy[];
  generationHistory: Post[];
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
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  sources: string[];
}

export interface Post {
  id: string;
  text: string;
  imageUrl?: string;
  generating: boolean;
  timestamp: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}
