import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Brand, LinkedChannel, ChannelInfo } from '../types';

/**
 * Service for managing user brands (channel + positioning).
 * Brands are stored as subcollection: users/{userId}/brands/{brandId}
 */
export class BrandService {
  
  private static getBrandsCollection(userId: string) {
    return collection(db, 'users', userId, 'brands');
  }

  private static getBrandDoc(userId: string, brandId: string) {
    return doc(db, 'users', userId, 'brands', brandId);
  }

  /**
   * Get all brands for a user.
   */
  static async getBrands(userId: string): Promise<Brand[]> {
    const q = query(this.getBrandsCollection(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Brand));
  }

  /**
   * Subscribe to brands for a user.
   */
  static subscribeToBrands(userId: string, callback: (brands: Brand[]) => void): () => void {
    const q = query(this.getBrandsCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const brands = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Brand));
      callback(brands);
    });
  }

  /**
   * Get a single brand by ID.
   */
  static async getBrand(userId: string, brandId: string): Promise<Brand | null> {
    const snap = await getDoc(this.getBrandDoc(userId, brandId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Brand;
  }

  /**
   * Create a new brand.
   */
  static async createBrand(
    userId: string, 
    data: { name: string; channelUrl: string; linkedChannel?: LinkedChannel; positioning?: string }
  ): Promise<Brand> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    // Build brand object, excluding undefined fields (Firestore rejects undefined)
    const brand: Record<string, any> = {
      id,
      name: data.name,
      channelUrl: data.channelUrl,
      createdAt: now,
      updatedAt: now
    };
    
    if (data.linkedChannel) brand.linkedChannel = data.linkedChannel;
    if (data.positioning) brand.positioning = data.positioning;
    
    await setDoc(this.getBrandDoc(userId, id), brand);
    return brand as Brand;
  }

  /**
   * Update an existing brand.
   */
  static async updateBrand(
    userId: string, 
    brandId: string, 
    data: Partial<Omit<Brand, 'id' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(this.getBrandDoc(userId, brandId), {
      ...data,
      updatedAt: Date.now()
    });
  }

  /**
   * Update brand positioning.
   */
  static async updatePositioning(userId: string, brandId: string, positioning: string): Promise<void> {
    await this.updateBrand(userId, brandId, { positioning });
  }

  /**
   * Update linked channel config.
   */
  static async updateLinkedChannel(userId: string, brandId: string, linkedChannel: LinkedChannel): Promise<void> {
    await this.updateBrand(userId, brandId, { linkedChannel });
  }

  /**
   * Cache channel analysis result.
   */
  static async cacheAnalysis(userId: string, brandId: string, analyzedChannel: ChannelInfo): Promise<void> {
    await this.updateBrand(userId, brandId, { analyzedChannel });
  }

  /**
   * Delete a brand.
   */
  static async deleteBrand(userId: string, brandId: string): Promise<void> {
    await deleteDoc(this.getBrandDoc(userId, brandId));
  }
}
