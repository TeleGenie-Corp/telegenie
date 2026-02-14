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
  | { name: 'login'; params: { method: string } }
  | { name: 'view_subscription_list'; params: {} }
  | { name: 'begin_checkout'; params: { plan_id: string; price: number; currency: string } }
  | { name: 'purchase_success'; params: { plan_id: string; price: number; transaction_id: string } }
  | { name: 'purchase_fail'; params: { plan_id: string; price: number; reason?: string } };

export class AnalyticsService {
  
  
  static log(event: AnalyticsEvent) {
    try {
      // Guard against SSR
      if (!analytics) return;
      
      // Cast to string to avoid overload mismatch with standard/custom events
      const params = { ...event.params };
      if (process.env.NODE_ENV === 'development') {
          (params as any).debug_mode = true;
      }
      logEvent(analytics, event.name as string, params);
      
      // Optional: Log to console in dev mode
      if (process.env.NODE_ENV === 'development') {
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

  static trackViewSubscription() {
    this.log({ name: 'view_subscription_list', params: {} });
  }

  static trackBeginCheckout(planId: string, price: number) {
    this.log({ name: 'begin_checkout', params: { plan_id: planId, price, currency: 'RUB' } });
  }

  static trackPurchaseSuccess(planId: string, price: number, transactionId: string) {
    this.log({ name: 'purchase_success', params: { plan_id: planId, price, transaction_id: transactionId } });
  }

  static trackPurchaseFail(planId: string, price: number, reason?: string) {
    this.log({ name: 'purchase_fail', params: { plan_id: planId, price, reason } });
  }
}
