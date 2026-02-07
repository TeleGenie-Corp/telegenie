import { logEvent } from "firebase/analytics";
import { analytics } from "./firebaseConfig";

// Define supported event names and their parameters
export type AnalyticsEvent = 
  | { name: 'generate_post'; params: { method: 'idea' | 'scratch', topic?: string } }
  | { name: 'generate_ideas'; params: { topic?: string } }
  | { name: 'copy_post'; params: { length: number } }
  | { name: 'publish_telegram'; params: { channel_id?: string } }
  | { name: 'create_brand'; params: { name: string } }
  | { name: 'subscription_click'; params: { location: string } }
  | { name: 'error_vpn'; params: { location?: string } }
  | { name: 'login'; params: { method: string } };

export class AnalyticsService {
  
  static log(event: AnalyticsEvent) {
    try {
      // Cast to string to avoid overload mismatch with standard/custom events
      const params = { ...event.params };
      if (import.meta.env.DEV) {
          (params as any).debug_mode = true;
      }
      logEvent(analytics, event.name as string, params);
      
      // Optional: Log to console in dev mode
      if (import.meta.env.DEV) {
        console.log(`[Analytics] ${event.name}`, params);
      }
    } catch (e) {
      console.warn("[Analytics] Failed to log event", e);
    }
  }

  static trackGeneratePost(method: 'idea' | 'scratch', topic?: string) {
    this.log({ name: 'generate_post', params: { method, topic } });
  }

  static trackGenerateIdeas(topic?: string) {
    this.log({ name: 'generate_ideas', params: { topic } });
  }

  static trackPublish(channelId?: string) {
    this.log({ name: 'publish_telegram', params: { channel_id: channelId } });
  }
}
