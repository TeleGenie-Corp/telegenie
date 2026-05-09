import { UsageMetadata } from '../types';
import { CostCalculator } from './costCalculator';

export interface FalImageResult {
  url: string;
  width: number;
  height: number;
}

export interface FalGenerateResponse {
  images?: FalImageResult[];
  request_id?: string;
  status?: string;
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
}

export class FalImageService {
  private static readonly API_BASE = 'https://queue.fal.run';
  private static readonly MODEL_DEV = 'fal-ai/flux/dev';
  private static readonly MODEL_SCHNELL = 'fal-ai/flux/schnell';
  private static readonly TIMEOUT_MS = 120_000; // 2 minutes for sync
  private static readonly POLL_INTERVAL_MS = 3_000; // 3 seconds
  private static readonly MAX_POLL_ATTEMPTS = 40; // ~2 minutes

  private static getApiKey(): string {
    const key = process.env.FAL_API_KEY;
    if (!key) throw new Error('FAL_API_KEY_MISSING');
    return key;
  }

  /**
   * Generate images using fal.ai flux/dev with different seeds.
   * Falls back to flux/schnell on failure.
   * Each image is generated as a separate call so failure of one doesn't kill all.
   */
  static async generateImages(
    prompt: string,
    options: FalImageGenerationOptions = {}
  ): Promise<{ images: FalImageResult[]; usage: UsageMetadata; rawResponses: unknown[] }> {
    const { count = 2, imageSize = 'square_hd', enableSafetyChecker = true } = options;

    // Generate unique seeds for each image
    const seeds = Array.from({ length: count }, () => Math.floor(Math.random() * 2_147_483_647));

    const rawResponses: unknown[] = [];

    try {
      const results = await Promise.all(
        seeds.map((seed) => this.generateSingle(prompt, seed, imageSize, enableSafetyChecker, this.MODEL_DEV))
      );

      results.forEach(r => rawResponses.push(r));

      const images = results
        .filter((r): r is FalGenerateResponse => r !== null)
        .flatMap((r) => r.images ?? [])
        .filter((img): img is FalImageResult => !!img && typeof img.url === 'string' && img.url.length > 0);

      if (images.length === 0) {
        throw new Error('No valid images generated from flux/dev');
      }

      const usage = CostCalculator.createFalImageUsageMetadata(images.length, 'flux-dev');
      return { images, usage, rawResponses };
    } catch (error) {
      console.warn('[FalImageService] flux/dev failed, falling back to flux/schnell:', error);

      // Fallback to schnell
      try {
        const results = await Promise.all(
          seeds.map((seed) => this.generateSingle(prompt, seed, imageSize, enableSafetyChecker, this.MODEL_SCHNELL))
        );

        results.forEach(r => rawResponses.push(r));

        const images = results
          .filter((r): r is FalGenerateResponse => r !== null)
          .flatMap((r) => r.images ?? [])
          .filter((img): img is FalImageResult => !!img && typeof img.url === 'string' && img.url.length > 0);

        if (images.length === 0) {
          throw new Error('No valid images generated even with fallback');
        }

        const usage = CostCalculator.createFalImageUsageMetadata(images.length, 'flux-schnell');
        return { images, usage, rawResponses };
      } catch (fallbackError) {
        console.error('[FalImageService] Both models failed:', fallbackError);
        throw fallbackError;
      }
    }
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
    model: string
  ): Promise<FalGenerateResponse | null> {
    const url = `${this.API_BASE}/${model}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          seed,
          image_size: imageSize,
          enable_safety_checker: enableSafetyChecker,
          num_images: 1,
          sync_mode: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FalImageService] HTTP ${response.status} from ${model}: ${errorText}`);
        throw new Error(`fal.ai API error ${response.status}: ${errorText}`);
      }

      const data: FalGenerateResponse = await response.json();

      // If the API returned an async request_id, poll for result
      if (data.request_id && !data.images) {
        console.log(`[FalImageService] Got request_id=${data.request_id}, polling...`);
        return await this.pollForResult(data.request_id);
      }

      // Validate the response has proper images array
      if (!data.images || !Array.isArray(data.images)) {
        console.error(`[FalImageService] Unexpected response structure from ${model}:`, JSON.stringify(data));
        return null;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        console.error(`[FalImageService] Timeout generating with ${model}`);
      } else {
        console.error(`[FalImageService] Error generating with ${model}:`, error);
      }
      return null;
    }
  }

  /**
   * Poll fal.ai queue API for async request result.
   */
  private static async pollForResult(requestId: string): Promise<FalGenerateResponse | null> {
    const statusUrl = `https://queue.fal.run/f/requests/${requestId}`;

    for (let attempt = 0; attempt < this.MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL_MS));

      try {
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: { 'Authorization': `Key ${this.getApiKey()}` },
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`[FalImageService] Poll error ${response.status}: ${text}`);
          continue;
        }

        const data: FalGenerateResponse = await response.json();

        if (data.status === 'FAILED') {
          console.error(`[FalImageService] Request ${requestId} failed`);
          return null;
        }

        if (data.status === 'COMPLETED' || data.images) {
          if (data.images && Array.isArray(data.images)) {
            return data;
          }
          console.error(`[FalImageService] Completed but no images for ${requestId}:`, JSON.stringify(data));
          return null;
        }

        // Otherwise still IN_PROGRESS or similar — keep polling
      } catch (pollError) {
        console.error(`[FalImageService] Poll exception attempt ${attempt}:`, pollError);
      }
    }

    console.error(`[FalImageService] Max poll attempts exceeded for ${requestId}`);
    return null;
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
