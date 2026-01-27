import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from './firebaseConfig';

const storage = getStorage(app);

// WebP quality (0.0 - 1.0). 0.85 gives ~30% size reduction with minimal quality loss.
const WEBP_QUALITY = 0.85;

export class ImageStorageService {
  /**
   * Converts a base64 PNG to WebP format using Canvas API.
   * Returns a Blob with reduced file size (~25-35% smaller).
   */
  private static async convertToWebP(base64Data: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert to WebP'));
            }
          },
          'image/webp',
          WEBP_QUALITY
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image for conversion'));
      img.src = base64Data;
    });
  }

  /**
   * Uploads a base64 image to Firebase Storage as WebP.
   * Converts PNG to WebP for ~30% size reduction before upload.
   */
  static async uploadBase64Image(
    base64Data: string,
    userId: string,
    postId: string
  ): Promise<string> {
    if (!base64Data.startsWith('data:')) {
      throw new Error('Invalid base64 image format');
    }

    // Convert PNG to WebP (smaller file size)
    const webpBlob = await this.convertToWebP(base64Data);
    
    // Log size reduction for monitoring
    const originalSize = Math.round(base64Data.length * 0.75 / 1024); // Approximate original KB
    const webpSize = Math.round(webpBlob.size / 1024);
    console.log(`[ImageStorage] Converted: ${originalSize}KB PNG → ${webpSize}KB WebP (${Math.round((1 - webpSize/originalSize) * 100)}% reduction)`);

    // Create storage reference with organized path
    const timestamp = Date.now();
    const storagePath = `posts/${userId}/${postId}_${timestamp}.webp`;
    const storageRef = ref(storage, storagePath);

    // Upload WebP and get download URL
    await uploadBytes(storageRef, webpBlob, {
      contentType: 'image/webp',
      customMetadata: {
        originalFormat: 'png',
        quality: WEBP_QUALITY.toString()
      }
    });
    
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  }

  /**
   * Checks if a string is a base64 data URL (needs upload) vs regular URL.
   */
  static isBase64DataUrl(str: string): boolean {
    return str.startsWith('data:');
  }
}
