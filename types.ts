
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

export interface LinkedChannel {
  chatId: string;       // Telegram chat_id (negative for channels)
  username: string;     // @channel_username
  title: string;        // Channel title
  linkedAt: number;     // Timestamp when linked
  verified: boolean;    // Bot has posting permissions
  botToken?: string;    // Optional custom bot token
}

export interface UserProfile {
  userId: string;
  savedStrategies: ChannelStrategy[];
  generationHistory: Post[];
  balance: number; // In virtual USD
  createdAt: number;
  telegram?: TelegramUser; // Linked Telegram account for channel integration
  linkedChannel?: LinkedChannel; // Connected channel for publishing
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
  withImage?: boolean; // Flag to enable/disable image generation
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

// === GENERATION PIPELINE ===

export interface GenerationConfig {
  withImage: boolean;
  withAnalysis: boolean;
  maxTextLength?: number;
  imageStyle?: 'realistic' | 'illustration' | 'minimal';
}

export interface GenerationInput {
  idea: Idea;
  strategy: ChannelStrategy;
  config: GenerationConfig;
  userId: string;
}

export interface GenerationCosts {
  analysis: number;
  ideas: number;
  content: number;
  image: number;
  total: number;
}

export interface GenerationTiming {
  startedAt: number;
  completedAt: number;
  durationMs: number;
}

export interface GenerationResult {
  success: boolean;
  post?: Post;
  costs: GenerationCosts;
  errors: string[];
  timing: GenerationTiming;
}

export type PipelineStage = 
  | 'idle'
  | 'validating'
  | 'analyzing'
  | 'generating_content'
  | 'generating_image'
  | 'uploading'
  | 'completed'
  | 'failed';

export interface PipelineState {
  stage: PipelineStage;
  progress: number;  // 0-100
  currentTask?: string;
  error?: string;
}
