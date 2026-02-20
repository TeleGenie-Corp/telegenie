import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { PostProject, PostVersion, PostGoal, Idea, PostStatus } from '../types';

/**
 * Service for managing post projects (work sessions).
 * Posts are stored as subcollection: users/{userId}/posts/{postId}
 */
export class PostProjectService {
  
  private static getPostsCollection(userId: string) {
    return collection(db, 'users', userId, 'posts');
  }

  private static getPostDoc(userId: string, postId: string) {
    return doc(db, 'users', userId, 'posts', postId);
  }

  /**
   * Get all posts for a user, optionally filtered by brand.
   */
  static async getProjects(userId: string, brandId?: string): Promise<PostProject[]> {
    let q = query(this.getPostsCollection(userId), orderBy('updatedAt', 'desc'));
    if (brandId) {
      q = query(this.getPostsCollection(userId), where('brandId', '==', brandId), orderBy('updatedAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PostProject));
  }

  /**
   * Subscribe to projects for a user.
   */
  static subscribeToProjects(userId: string, callback: (projects: PostProject[]) => void): () => void {
    const q = query(this.getPostsCollection(userId), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PostProject));
        callback(projects);
    });
  }

  /**
   * Get drafts only.
   */
  static async getDrafts(userId: string, brandId?: string): Promise<PostProject[]> {
    const all = await this.getProjects(userId, brandId);
    return all.filter(p => p.status === 'draft');
  }

  /**
   * Get a single post project by ID.
   */
  static async getProject(userId: string, postId: string): Promise<PostProject | null> {
    const snap = await getDoc(this.getPostDoc(userId, postId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as PostProject;
  }

  /**
   * Create a new post project for a brand.
   */
  static async createProject(userId: string, brandId: string, goal: PostGoal = PostGoal.ENGAGE): Promise<PostProject> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const project: PostProject = {
      id,
      brandId,
      status: 'draft',
      goal,
      ideas: [],
      text: '',
      versions: [],
      createdAt: now,
      updatedAt: now
    };
    await setDoc(this.getPostDoc(userId, id), project);
    return project;
  }

  /**
   * Update a post project.
   */
  static async updateProject(
    userId: string, 
    postId: string, 
    data: Partial<Omit<PostProject, 'id' | 'brandId' | 'createdAt'>>
  ): Promise<void> {
    await updateDoc(this.getPostDoc(userId, postId), {
      ...data,
      updatedAt: Date.now()
    });
  }

  /**
   * Save current text/image as a version snapshot.
   */
  static async saveVersion(userId: string, postId: string, text: string, imageUrl?: string): Promise<void> {
    const project = await this.getProject(userId, postId);
    if (!project) return;
    
    const version: PostVersion = {
      text,
      imageUrl,
      savedAt: Date.now()
    };
    
    // Keep last 10 versions
    const versions = [...project.versions, version].slice(-10);
    await this.updateProject(userId, postId, { versions });
  }

  /**
   * Mark post as published.
   */
  static async markPublished(
    userId: string, 
    postId: string, 
    messageId?: number,
    channelInfo?: { chatId: string; username?: string; title?: string }
  ): Promise<void> {
    await this.updateProject(userId, postId, {
      status: 'published',
      publishedAt: Date.now(),
      publishedMessageId: messageId,
      publishedChannel: channelInfo
    });
  }

  /**
   * Archive a post.
   */
  static async archiveProject(userId: string, postId: string): Promise<void> {
    await this.updateProject(userId, postId, { status: 'archived' });
  }

  /**
   * Delete a post project.
   */
  static async deleteProject(userId: string, postId: string): Promise<void> {
    await deleteDoc(this.getPostDoc(userId, postId));
  }

  /**
   * Update ideas list.
   */
  static async updateIdeas(userId: string, postId: string, ideas: Idea[], selectedIdeaId?: string): Promise<void> {
    await this.updateProject(userId, postId, { ideas, selectedIdeaId });
  }

  /**
   * Update content (text + image).
   */
  static async updateContent(userId: string, postId: string, text: string, rawText?: string, imageUrl?: string | null): Promise<void> {
    const data: any = { text };
    if (rawText !== undefined) data.rawText = rawText;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    await this.updateProject(userId, postId, data);
  }
}
