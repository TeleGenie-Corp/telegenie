'use server';

import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/src/lib/firebaseAdmin';
import { FalImageService } from '@/services/falImageService';
import { GeminiService } from '@/services/geminiService';
import { CostCalculator } from '@/services/costCalculator';
import { ChannelStrategy, buildImageTextPrompt, normalizeImageModel } from '@/types';

/**
 * Server Action: Загружает изображение с fal.ai URL в Firebase Storage.
 */
export async function uploadFalImageToStorage(
  imageUrl: string,
  userId: string,
  postId: string
): Promise<{ success: boolean; storageUrl?: string; error?: string }> {
  try {
    const imageData = await FalImageService.downloadImage(imageUrl);
    const storage = getStorage(adminApp).bucket();
    const timestamp = Date.now();
    const filePath = `posts/${userId}/${postId}_${timestamp}.webp`;
    const file = storage.file(filePath);

    await file.save(imageData, {
      metadata: {
        contentType: 'image/webp',
        metadata: {
          source: 'fal.ai',
          uploadedAt: timestamp.toString(),
        },
      },
    });

    const [downloadUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5, // 5 years
    });

    return { success: true, storageUrl: downloadUrl };
  } catch (error: any) {
    console.error('[uploadFalImageToStorage]', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

/**
 * Server Action: Генерирует промпт и изображения через fal.ai.
 * Если fal.ai недоступен — fallback на Gemini image generation (1 изображение).
 */
export async function generatePostImagesAction(
  postText: string,
  strategy: ChannelStrategy,
  userId: string
) {
  try {
    if (!process.env.FAL_API_KEY) {
      console.error('[generatePostImagesAction] FAL_API_KEY is missing or empty');
    }

    const selectedModel = normalizeImageModel(strategy.imageModel);

    // Step 1: Generate English image prompt
    const { prompt: imagePrompt, usage: promptUsage } = await GeminiService.generateImagePrompt(
      postText,
      strategy
    );

    const textPrompt = buildImageTextPrompt(postText, strategy.imageTextPrompt);

    // Step 2: Generate 2 images via fal.ai
    let images: string[] = [];
    let genUsage: any = CostCalculator.createFalImageUsageMetadata(0, 'fallback');

    const falResult = await FalImageService.generateImages(imagePrompt, {
      count: 2,
      model: selectedModel,
      textPrompt: strategy.imageTextEnabled ? textPrompt : undefined,
    });

    if (falResult && falResult.images.length > 0) {
      images = falResult.images.map((img) => img.url);
      genUsage = falResult.usage;
    } else {
      console.warn('[generatePostImagesAction] fal.ai failed, falling back to Gemini image generation');
      const geminiResult = await GeminiService.generateImage(imagePrompt);
      if (geminiResult.imageUrl) {
        images = [geminiResult.imageUrl];
        genUsage = geminiResult.usage ?? CostCalculator.createFalImageUsageMetadata(1, 'gemini-fallback');
      } else {
        console.error('[generatePostImagesAction] Both fal.ai and Gemini image generation failed');
        return {
          success: false,
          error: 'Image generation failed on all providers (fal.ai + Gemini fallback)',
        };
      }
    }

    let storageUrl: string | undefined;
    if (images[0]) {
      const uploadResult = await uploadFalImageToStorage(images[0], userId, `post-${Date.now()}`);
      if (uploadResult.success) {
        storageUrl = uploadResult.storageUrl;
      }
    }

    return {
      success: true,
      images,
      storageUrl,
      imagePrompt,
      usage: {
        ...genUsage,
        estimatedCostUsd: promptUsage.estimatedCostUsd + genUsage.estimatedCostUsd,
      },
    };
  } catch (error: any) {
    console.error('[generatePostImagesAction]', error);
    return {
      success: false,
      error: error.message || 'Image generation failed',
    };
  }
}

/**
 * Server Action: Перегенерация изображений с тем же промптом, новые seed.
 * Fallback на Gemini-генерацию, если fal.ai недоступен.
 */
export async function regeneratePostImagesAction(
  imagePrompt: string,
  userId: string,
  postId: string,
  options?: { model?: string; textPrompt?: string; textEnabled?: boolean }
) {
  try {
    let images: string[] = [];
    let usage: any = CostCalculator.createFalImageUsageMetadata(0, 'fallback');

    const falResult = await FalImageService.generateImages(imagePrompt, {
      count: 2,
      model: normalizeImageModel(options?.model),
      textPrompt: options?.textEnabled ? buildImageTextPrompt(undefined, options?.textPrompt) : undefined,
    });

    if (falResult && falResult.images.length > 0) {
      images = falResult.images.map((img) => img.url);
      usage = falResult.usage;
    } else {
      console.warn('[regeneratePostImagesAction] fal.ai failed, falling back to Gemini');
      const geminiResult = await GeminiService.generateImage(imagePrompt);
      if (geminiResult.imageUrl) {
        images = [geminiResult.imageUrl];
        usage = geminiResult.usage ?? CostCalculator.createFalImageUsageMetadata(1, 'gemini-fallback');
      } else {
        return {
          success: false,
          error: 'Regeneration failed on all providers',
        };
      }
    }

    // Upload first image
    let storageUrl: string | undefined;
    if (images[0]) {
      const uploadResult = await uploadFalImageToStorage(images[0], userId, postId);
      if (uploadResult.success) {
        storageUrl = uploadResult.storageUrl;
      }
    }

    return {
      success: true,
      images,
      storageUrl,
      usage,
    };
  } catch (error: any) {
    console.error('[regeneratePostImagesAction]', error);
    return {
      success: false,
      error: error.message || 'Regeneration failed',
    };
  }
}
