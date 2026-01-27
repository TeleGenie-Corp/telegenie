import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { UserProfile } from '../types';

export class UserService {
  private static COLLECTION_NAME = 'users';

  /**
   * Syncs user profile with Firestore. 
   * Initializes balance to $1000 if user is new.
   */
  static async syncProfile(userId: string): Promise<UserProfile> {
    const docRef = doc(db, this.COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }

    // New user initialization
    const newProfile: UserProfile = {
      userId,
      savedStrategies: [],
      generationHistory: [],
      balance: 1000, // Initial credits
      createdAt: Date.now()
    };

    await setDoc(docRef, newProfile);
    return newProfile;
  }

  /**
   * Deducts credits from user balance.
   */
  static async deductCredits(userId: string, amount: number): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, userId);
    await updateDoc(docRef, {
      balance: increment(-amount)
    });
  }

  /**
   * Updates user history and balance in one go if needed, 
   * but for now we'll stick to simple methods.
   */
  static async updateProfile(profile: UserProfile): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, profile.userId);
    await setDoc(docRef, profile, { merge: true });
  }
}
