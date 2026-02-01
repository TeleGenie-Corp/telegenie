import { 
  GenerationInput, 
  GenerationResult, 
  GenerationCosts,
  PipelineState,
  Post,
  UsageMetadata
} from '../types';
import { GeminiService } from './geminiService';

type ProgressCallback = (state: PipelineState) => void;

/**
 * PostGenerationService - Formalized pipeline for post creation.
 * 
 * Single entry point for all post generation operations with:
 * - Typed inputs/outputs
 * - Progress tracking
 * - Cost estimation
 * - Error handling
 */
export class PostGenerationService {
  
  /**
   * Main entry point: Generate a post from idea + strategy.
   */
  static async generate(
    input: GenerationInput,
    onProgress?: ProgressCallback
  ): Promise<GenerationResult> {
    const startedAt = Date.now();
    const errors: string[] = [];
    const costs: GenerationCosts = {
      analysis: input.strategy.analysisUsage?.estimatedCostUsd || 0,
      ideas: input.idea.usage?.estimatedCostUsd || 0,
      content: 0,
      polishing: 0,
      image: 0,
      total: 0
    };

    // Helper to emit progress
    const emit = (stage: PipelineState['stage'], progress: number, currentTask?: string) => {
      onProgress?.({ stage, progress, currentTask });
    };

    try {
      // === VALIDATION ===
      emit('validating', 5, 'Проверка входных данных...');
      const validation = this.validate(input);
      if (!validation.valid) {
        return this.fail(errors.concat(validation.errors), costs, startedAt);
      }

      // === GENERATE CONTENT ===
      emit('generating_content', 20, 'Генерация текста поста...');
      const contentResult = await GeminiService.generatePostContent(input.idea, input.strategy);
      costs.content = contentResult.usage?.estimatedCostUsd || 0;

      if (!contentResult.text) {
        errors.push('Не удалось сгенерировать текст');
        return this.fail(errors, costs, startedAt);
      }

      // === POLISHING STAGE ===
      emit('polishing', 35, 'Форматирование текста...');
      const { TextPolishingService } = await import('./textPolishingService');
      const polishedResult = await TextPolishingService.polishAndFormat(
        contentResult.text,
        input.strategy
      );
      costs.polishing = polishedResult.usage?.estimatedCostUsd || 0;

      // === GENERATE IMAGE (optional) ===
      let imageUrl: string | undefined;
      let imageUsage: UsageMetadata | undefined;

      if (input.config.withImage) {
        emit('generating_image', 50, 'Генерация изображения...');
        const imageResult = await GeminiService.generateImage(input.idea.title);
        costs.image = imageResult.usage?.estimatedCostUsd || 0;
        imageUsage = imageResult.usage || undefined;

        // === UPLOAD IMAGE ===
        if (imageResult.imageUrl?.startsWith('data:')) {
          emit('uploading', 75, 'Загрузка изображения в хранилище...');
          try {
            const { ImageStorageService } = await import('./imageStorageService');
            imageUrl = await ImageStorageService.uploadBase64Image(
              imageResult.imageUrl,
              input.userId,
              `post-${Date.now()}`
            );
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            // Keep base64 for display, but don't fail the pipeline
            imageUrl = imageResult.imageUrl;
          }
        } else {
          imageUrl = imageResult.imageUrl || undefined;
        }
      }

      // === BUILD POST ===
      emit('completed', 100, 'Готово!');
      
      const post: Post = {
        id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        text: polishedResult.formattedText,
        rawText: contentResult.text, // Keep original for editor reset
        imageUrl,
        generating: false,
        timestamp: Date.now(),
        usage: contentResult.usage,
        polishingUsage: polishedResult.usage,
        imageUsage,
        analysisUsage: input.strategy.analysisUsage,
        ideasUsage: input.idea.usage
      };

      costs.total = costs.analysis + costs.ideas + costs.content + costs.polishing + costs.image;

      return {
        success: true,
        post,
        costs,
        errors: [],
        timing: {
          startedAt,
          completedAt: Date.now(),
          durationMs: Date.now() - startedAt
        }
      };

    } catch (error: any) {
      console.error('[PostGenerationService] Pipeline error:', error);
      errors.push(error?.message || 'Неизвестная ошибка');
      emit('failed', 0, 'Ошибка генерации');
      return this.fail(errors, costs, startedAt);
    }
  }

  /**
   * Validate inputs before processing.
   */
  static validate(input: GenerationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.idea) {
      errors.push('Не выбрана идея для поста');
    }
    if (!input.strategy) {
      errors.push('Не задана стратегия');
    }
    if (!input.userId) {
      errors.push('Пользователь не авторизован');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Estimate cost without running the pipeline.
   */
  static estimateCost(input: GenerationInput): number {
    // Base estimates (conservative)
    const CONTENT_ESTIMATE = 0.002;  // ~2000 tokens at Flash pricing
    const POLISHING_ESTIMATE = 0.001; // ~1000 tokens for formatting
    const IMAGE_ESTIMATE = 0.04;     // Image generation cost

    let total = 0;
    total += input.strategy.analysisUsage?.estimatedCostUsd || 0;
    total += input.idea.usage?.estimatedCostUsd || 0;
    total += CONTENT_ESTIMATE;
    total += POLISHING_ESTIMATE;
    
    if (input.config.withImage) {
      total += IMAGE_ESTIMATE;
    }

    return total;
  }

  /**
   * Build a failure result.
   */
  private static fail(
    errors: string[], 
    costs: GenerationCosts, 
    startedAt: number
  ): GenerationResult {
    costs.total = costs.analysis + costs.ideas + costs.content + costs.image;
    return {
      success: false,
      costs,
      errors,
      timing: {
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt
      }
    };
  }
}
