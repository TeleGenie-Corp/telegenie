
export enum PostGoal {
  SELL = 'Продать',
  ENGAGE = 'Вовлечь',
  EDUCATE = 'Обучить',
  INFORM = 'Проинформировать'
}

export enum PostFormat {
  TWEET = 'Твит',
  STORY = 'История',
  LIST = 'Список',
  CASE = 'Кейс'
}

export type PostIntent = 'value' | 'engagement' | 'sales';

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
  photoUrl?: string;    // Channel avatar URL
  memberCount?: number; // Subscriber count
}

// === WORKSPACE DATA MODEL ===

export interface Brand {
  id: string;
  name: string;                    // Display name
  channelUrl: string;              // t.me/username
  linkedChannel?: LinkedChannel;   // Publishing config (chatId, botToken, etc)
  positioning?: string;            // Brand positioning formula
  analyzedChannel?: ChannelInfo;   // Cached channel analysis
  createdAt: number;
  updatedAt: number;
}

export interface PostVersion {
  text: string;
  imageUrl?: string;
  savedAt: number;
}

export type PostStatus = 'draft' | 'published' | 'archived';

export interface PostProject {
  id: string;
  brandId: string;                 // Reference to Brand
  status: PostStatus;
  
  // Strategy
  goal: PostGoal;
  point?: string;                  // Current topic/news
  userComments?: string;
  
  // Content
  ideas: Idea[];
  selectedIdeaId?: string;
  text: string;
  rawText?: string;
  imageUrl?: string;
  
  // History
  versions: PostVersion[];
  
  // Publish
  publishedAt?: number;
  publishedMessageId?: number;
  
  // Meta
  createdAt: number;
  updatedAt: number;
}

// === BILLING & SUBSCRIPTIONS ===

export type SubscriptionTier = 'free' | 'pro' | 'monster';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  limits: {
    postsPerMonth: number;
    aiTokens: number;
    brandsCount: number;
  };
  features: string[];
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  type: 'subscription' | 'topup';
  createdAt: number;
  planId?: string;
}

export interface UserProfile {
  userId: string;
  savedStrategies: ChannelStrategy[];
  generationHistory: Post[];
  balance: number; // In virtual USD
  createdAt: number;
  telegram?: TelegramUser; // Linked Telegram account for channel integration
  linkedChannel?: LinkedChannel; // Connected channel for publishing
  
  // Billing & Usage
  subscription?: {
    tier: SubscriptionTier;
    status: 'active' | 'canceled' | 'expired';
    currentPeriodEnd: number;
    autoRenew: boolean;
  };
  usage?: {
    postsThisMonth: number;
    tokensThisMonth: number;
    lastReset: number;
  };
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
  format: PostFormat; // Keep for internal logic if needed, though UI hides it
  userComments: string; // Keeps existing field, but 'point' might replace or augment it.
  positioning?: string; // Who am I (Brand/Expert identity)
  point?: string; // Core message/product/news for this specific generation
  withImage?: boolean;
  analyzedChannel?: ChannelInfo;
  analysisUsage?: UsageMetadata;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  userBenefit?: string; // New: utility value for the reader
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
  rawText?: string; // Original unformatted text from AI
  imageUrl?: string;
  generating: boolean;
  timestamp: number;
  usage?: UsageMetadata;
  polishingUsage?: UsageMetadata;
  imageUsage?: UsageMetadata;
  analysisUsage?: UsageMetadata;
  ideasUsage?: UsageMetadata;
  publishedAt?: number;
  publishedMessageId?: number;
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
  polishing: number;
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
  | 'polishing'
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
