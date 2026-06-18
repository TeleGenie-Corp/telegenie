import { UsageMetadata, ImageModel, buildImageTextPrompt } from '../types';
import { CostCalculator } from './costCalculator';

export interface FalImageResult {
  url: string;
  width: number;
  height: number;
}

export interface FalGenerateResponse {
  images?: FalImageResult[];
  request_id?: string;
  status_url?: string;
  response_url?: string;
  status?: string;
  error?: string;
  error_type?: string;
  seed?: number;
  has_nsfw_content?: boolean[];
  prompt?: string;
  // Catch-all for unexpected fields from the API
  [key: string]: unknown;
}

export interface FalImageGenerationOptions {
  count?: number;
  imageSize?: 'square' | 'square_hd' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
  enableSafetyChecker?: boolean;
  model?: ImageModel;
  textPrompt?: string;
}

const MODEL_ENDPOINTS: Record<ImageModel, string[]> = {
  'gpt-image-2': ['openai/gpt-image-2', 'fal-ai/nano-banana-2', 'xai/grok-imagine-image', 'fal-ai/flux/dev', 'fal-ai/flux/schnell'],
  'flux/dev': ['fal-ai/flux/dev', 'fal-ai/flux/schnell'],
  'nano-banana-2': ['fal-ai/nano-banana-2', 'fal-ai/flux/dev', 'fal-ai/flux/schnell'],
  'grok-imagine-image': ['xai/grok-imagine-image', 'fal-ai/flux/dev', 'fal-ai/flux/schnell'],
};

const MODEL_USAGE_KEYS: Record<ImageModel, string> = {
  'gpt-image-2': 'gpt-image-2',
  'flux/dev': 'flux-dev',
  'nano-banana-2': 'nano-banana-2',
  'grok-imagine-image': 'grok-imagine-image',
};

export class FalImageService {
  private static readonly API_BASE = 'https://queue.fal.run';
  private static readonly TIMEOUT_MS = 120_000; // 2 minutes for sync
  private static readonly POLL_INTERVAL_MS = 3_000; // 3 seconds
  private static readonly MAX_POLL_ATTEMPTS = 40; // ~2 minutes

  private static getApiKey(): string {
    const key = process.env.FAL_API_KEY;
    if (!key) throw new Error('FAL_API_KEY_MISSING');
    return key;
  }

  /**
   * Generate images using fal.ai.
   * Tries the selected model first, then falls back to flux/dev and flux/schnell.
   */
  static async generateImages(
    prompt: string,
    options: FalImageGenerationOptions = {}
  ): Promise<{ images: FalImageResult[]; usage: UsageMetadata; rawResponses: unknown[] }> {
    const {
      count = 2,
      imageSize = 'square_hd',
      enableSafetyChecker = true,
      model = 'flux/dev',
      textPrompt,
    } = options;

    const seeds = Array.from({ length: count }, () => Math.floor(Math.random() * 2_147_483_647));
    const rawResponses: unknown[] = [];
    const endpointOrder = MODEL_ENDPOINTS[model] ?? MODEL_ENDPOINTS['flux/dev'];
    const composedPrompt = this.composePrompt(prompt, model, textPrompt);

    for (const endpoint of endpointOrder) {
      try {
        const results = await Promise.all(
          seeds.map((seed) => this.generateSingle(composedPrompt, seed, imageSize, enableSafetyChecker, endpoint))
        );

        results.forEach((r) => rawResponses.push(r));

        const images = results
          .filter((r): r is FalGenerateResponse => r !== null)
          .flatMap((r) => r.images ?? [])
          .filter((img): img is FalImageResult => !!img && typeof img.url === 'string' && img.url.length > 0);

        if (images.length === 0) {
          throw new Error(`No valid images generated from ${endpoint}`);
        }

        const usageKey = endpoint.includes('nano-banana-2')
          ? MODEL_USAGE_KEYS['nano-banana-2']
          : endpoint.includes('grok-imagine-image')
            ? MODEL_USAGE_KEYS['grok-imagine-image']
            : endpoint.includes('gpt-image-2')
              ? MODEL_USAGE_KEYS['gpt-image-2']
            : MODEL_USAGE_KEYS['flux/dev'];
        const usage = CostCalculator.createFalImageUsageMetadata(images.length, usageKey);
        return { images, usage, rawResponses };
      } catch (error) {
        console.warn(`[FalImageService] ${endpoint} failed, trying next fallback:`, error);
      }
    }

    throw new Error('All fal.ai image models failed');
  }

  private static composePrompt(prompt: string, model: ImageModel, textPrompt?: string): string {
    const overlay = buildImageTextPrompt(undefined, textPrompt);
    if (!overlay) return prompt;

    const textInstruction = `Include this readable on-image text as a central overlay or caption: "${overlay}".`;

    if (model === 'gpt-image-2' || model === 'nano-banana-2' || model === 'grok-imagine-image') {
      return `${prompt}\n\n${textInstruction}`;
    }

    return `${prompt}\n\nIf it fits naturally, incorporate the following text into the composition: "${overlay}".`;
  }

  private static toAspectRatio(imageSize: string): string {
    const aspectRatios: Record<string, string> = {
      square: '1:1',
      square_hd: '1:1',
      portrait_4_3: '3:4',
      portrait_16_9: '9:16',
      landscape_4_3: '4:3',
      landscape_16_9: '16:9',
    };

    return aspectRatios[imageSize] || '1:1';
  }

  private static toGptImageSize(imageSize: string): string | { width: number; height: number } {
    const imageSizes: Record<string, string | { width: number; height: number }> = {
      square: { width: 1024, height: 1024 },
      square_hd: { width: 1024, height: 1024 },
      portrait_4_3: { width: 1024, height: 1360 },
      portrait_16_9: { width: 1024, height: 1792 },
      landscape_4_3: 'landscape_4_3',
      landscape_16_9: { width: 1792, height: 1024 },
    };

    return imageSizes[imageSize] || { width: 1024, height: 1024 };
  }

  private static buildRequestBody(
    prompt: string,
    seed: number,
    imageSize: string,
    enableSafetyChecker: boolean,
    endpoint: string
  ): Record<string, unknown> {
    if (endpoint.includes('gpt-image-2')) {
      return {
        prompt,
        image_size: this.toGptImageSize(imageSize),
        quality: 'high',
        num_images: 1,
        output_format: 'png',
      };
    }

    if (endpoint.includes('nano-banana-2')) {
      return {
        prompt,
        seed,
        aspect_ratio: this.toAspectRatio(imageSize),
        resolution: '1K',
        safety_tolerance: enableSafetyChecker ? '4' : '6',
        limit_generations: true,
        num_images: 1,
        output_format: 'png',
      };
    }

    if (endpoint.includes('grok-imagine-image')) {
      return {
        prompt,
        aspect_ratio: this.toAspectRatio(imageSize),
        resolution: '1k',
        num_images: 1,
        output_format: 'jpeg',
      };
    }

    return {
      prompt,
      seed,
      image_size: imageSize,
      enable_safety_checker: enableSafetyChecker,
      num_images: 1,
      sync_mode: true,
    };
  }

  /**
   * Generate a single image via fal.ai REST API.
   * Handles both synchronous responses and async queue (request_id) polling.
   */
  private static async generateSingle(
    prompt: string,
    seed: number,
    imageSize: string,
    enableSafetyChecker: boolean,
    endpoint: string
  ): Promise<FalGenerateResponse | null> {
    const url = `${this.API_BASE}/${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildRequestBody(prompt, seed, imageSize, enableSafetyChecker, endpoint)),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FalImageService] HTTP ${response.status} from ${endpoint}: ${errorText}`);
        throw new Error(`fal.ai API error ${response.status}: ${errorText}`);
      }

      const data: FalGenerateResponse = await response.json();

      if (data.request_id && !data.images) {
        console.log(`[FalImageService] Got request_id=${data.request_id}, polling...`);
        return await this.pollForResult(data.request_id, endpoint, data.status_url, data.response_url);
      }

      if (!data.images || !Array.isArray(data.images)) {
        console.error(`[FalImageService] Unexpected response structure from ${endpoint}:`, JSON.stringify(data));
        return null;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        console.error(`[FalImageService] Timeout generating with ${endpoint}`);
      } else {
        console.error(`[FalImageService] Error generating with ${endpoint}:`, error);
      }
      return null;
    }
  }

  /**
   * Poll fal.ai queue API for async request result.
   */
  private static async pollForResult(
    requestId: string,
    endpoint: string,
    initialStatusUrl?: string,
    initialResponseUrl?: string
  ): Promise<FalGenerateResponse | null> {
    const statusUrl = initialStatusUrl || `${this.API_BASE}/${endpoint}/requests/${requestId}/status`;
    let responseUrl = initialResponseUrl || `${this.API_BASE}/${endpoint}/requests/${requestId}/response`;

    for (let attempt = 0; attempt < this.MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL_MS));

      try {
        const statusEndpoint = statusUrl.includes('?') ? statusUrl : `${statusUrl}?logs=1`;
        const response = await fetch(statusEndpoint, {
          method: 'GET',
          headers: { 'Authorization': `Key ${this.getApiKey()}` },
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`[FalImageService] Poll error ${response.status}: ${text}`);
          continue;
        }

        const data: FalGenerateResponse = await response.json();
        responseUrl = data.response_url || responseUrl;

        if (data.status === 'FAILED' || data.error) {
          console.error(`[FalImageService] Request ${requestId} failed:`, data.error || data.error_type || 'unknown error');
          return null;
        }

        if (data.status === 'COMPLETED' || data.images) {
          if (data.images && Array.isArray(data.images)) {
            return data;
          }

          return await this.fetchResult(responseUrl, requestId);
        }
      } catch (pollError) {
        console.error(`[FalImageService] Poll exception attempt ${attempt}:`, pollError);
      }
    }

    console.error(`[FalImageService] Max poll attempts exceeded for ${requestId}`);
    return null;
  }

  private static async fetchResult(responseUrl: string, requestId: string): Promise<FalGenerateResponse | null> {
    try {
      const response = await fetch(responseUrl, {
        method: 'GET',
        headers: { 'Authorization': `Key ${this.getApiKey()}` },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[FalImageService] Result error ${response.status} for ${requestId}: ${text}`);
        return null;
      }

      const data: FalGenerateResponse = await response.json();
      if (!data.images || !Array.isArray(data.images)) {
        console.error(`[FalImageService] Result has no images for ${requestId}:`, JSON.stringify(data));
        return null;
      }

      return data;
    } catch (resultError) {
      console.error(`[FalImageService] Result exception for ${requestId}:`, resultError);
      return null;
    }
  }

  /**
   * Download image from URL as Buffer for Firebase Storage upload.
   * Note: This should be called from server-side (Server Action or API route).
   */
  static async downloadImage(imageUrl: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
