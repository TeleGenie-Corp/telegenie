'use server';

import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/src/lib/firebaseAdmin';
import { FalImageService } from '@/services/falImageService';
import { GeminiService } from '@/services/geminiService';
import { ChannelStrategy, buildImageTextPrompt, normalizeImageModel } from '@/types';

function getImageFileMetadata(imageData: Buffer): { extension: string; contentType: string } {
  if (
    imageData.length >= 8 &&
    imageData[0] === 0x89 &&
    imageData[1] === 0x50 &&
    imageData[2] === 0x4e &&
    imageData[3] === 0x47
  ) {
    return { extension: 'png', contentType: 'image/png' };
  }

  if (imageData.length >= 3 && imageData[0] === 0xff && imageData[1] === 0xd8 && imageData[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' };
  }

  if (
    imageData.length >= 12 &&
    imageData.subarray(0, 4).toString('ascii') === 'RIFF' &&
    imageData.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extension: 'webp', contentType: 'image/webp' };
  }

  return { extension: 'png', contentType: 'image/png' };
}

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
    const { extension, contentType } = getImageFileMetadata(imageData);
    const storage = getStorage(adminApp).bucket();
    const timestamp = Date.now();
    const filePath = `posts/${userId}/${postId}_${timestamp}.${extension}`;
    const file = storage.file(filePath);
    const downloadToken = randomUUID();

    await file.save(imageData, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          source: 'fal.ai',
          uploadedAt: timestamp.toString(),
        },
      },
    });

    const downloadUrl =
      `https://firebasestorage.googleapis.com/v0/b/${storage.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

    return { success: true, storageUrl: downloadUrl };
  } catch (error: any) {
    console.error('[uploadFalImageToStorage]', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

async function uploadGeneratedImagesToStorage(
  imageUrls: string[],
  userId: string,
  postId: string
): Promise<string[]> {
  const uploads = await Promise.all(
    imageUrls.map((imageUrl, index) =>
      uploadFalImageToStorage(imageUrl, userId, `${postId}-${index + 1}`)
    )
  );

  const storageUrls = uploads
    .map((result) => result.storageUrl)
    .filter((url): url is string => Boolean(url));

  if (storageUrls.length === 0 && imageUrls.length > 0) {
    throw new Error('Generated images could not be uploaded to storage');
  }

  return storageUrls;
}

/**
 * Server Action: Генерирует промпт и изображения через fal.ai.
 * Если выбранная модель недоступна, FalImageService пробует свои fal.ai fallback endpoints.
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
    const falResult = await FalImageService.generateImages(imagePrompt, {
      count: 2,
      model: selectedModel,
      textPrompt: strategy.imageTextEnabled ? textPrompt : undefined,
    });

    const generatedImages = falResult.images.map((img) => img.url);
    const genUsage = falResult.usage;
    const postId = `post-${Date.now()}`;
    const images = await uploadGeneratedImagesToStorage(generatedImages, userId, postId);

    const storageUrl = images[0];

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
 * Server Action: Перегенерация изображений.
 * If post text + strategy are provided, rebuilds the visual prompt first so brand voice changes apply.
 * FalImageService сам пробует резервные fal.ai endpoints, если выбранная модель недоступна.
 */
export async function regeneratePostImagesAction(
  imagePrompt: string,
  userId: string,
  postId: string,
  options?: {
    model?: string;
    textPrompt?: string;
    textEnabled?: boolean;
    postText?: string;
    strategy?: ChannelStrategy;
  }
) {
  try {
    let promptForGeneration = imagePrompt;
    let promptUsage;

    if (options?.postText && options.strategy) {
      const promptResult = await GeminiService.generateImagePrompt(options.postText, options.strategy);
      promptForGeneration = promptResult.prompt;
      promptUsage = promptResult.usage;
    }

    const falResult = await FalImageService.generateImages(promptForGeneration, {
      count: 2,
      model: normalizeImageModel(options?.model),
      textPrompt: options?.textEnabled ? buildImageTextPrompt(undefined, options?.textPrompt) : undefined,
    });

    const generatedImages = falResult.images.map((img) => img.url);
    const usage = falResult.usage;
    const images = await uploadGeneratedImagesToStorage(generatedImages, userId, postId);

    const storageUrl = images[0];

    return {
      success: true,
      images,
      storageUrl,
      imagePrompt: promptForGeneration,
      usage: promptUsage
        ? {
            ...usage,
            estimatedCostUsd: promptUsage.estimatedCostUsd + usage.estimatedCostUsd,
          }
        : usage,
    };
  } catch (error: any) {
    console.error('[regeneratePostImagesAction]', error);
    return {
      success: false,
      error: error.message || 'Regeneration failed',
    };
  }
}
