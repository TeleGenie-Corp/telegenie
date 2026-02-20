import { logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { analytics } from "./firebaseConfig";

// ─── Event Type Registry ────────────────────────────────────────────────────
export type AnalyticsEvent =
  // AUTH
  | { name: 'signup'; params: { method: string; referrer?: string } }
  | { name: 'login'; params: { method: string; referrer?: string } }
  | { name: 'session_start'; params: { returning: boolean; referrer?: string } }

  // ONBOARDING / ACTIVATION FUNNEL
  | { name: 'channel_connect_start'; params: {} }
  | { name: 'channel_connect_success'; params: { channel_type: 'public' | 'private' } }
  | { name: 'channel_connect_fail'; params: { reason: string } }

  // IDEAS FUNNEL
  | { name: 'generate_ideas'; params: { topic?: string } }
  | { name: 'idea_presented'; params: { count: number; channel_url: string } }
  | { name: 'idea_selected'; params: { idea_index: number; title: string } }
  | { name: 'ideas_regenerated'; params: {} }

  // POST FUNNEL
  | { name: 'generate_post'; params: { method: 'idea' | 'scratch'; topic?: string; has_image: boolean } }
  | { name: 'post_edited_manual'; params: { edit_count_session: number } }
  | { name: 'post_edited_ai'; params: { instruction_length: number } }
  | { name: 'copy_post'; params: { length: number } }
  | { name: 'publish_telegram'; params: { channel_id?: string; has_image: boolean } }

  // WORKSPACE
  | { name: 'create_brand'; params: { name: string } }
  | { name: 'project_created'; params: {} }
  | { name: 'project_opened'; params: { status: 'draft' | 'published' } }

  // MONETIZATION
  | { name: 'paywall_hit'; params: { location: string; limit_type: 'posts' | 'brands' } }
  | { name: 'subscription_click'; params: { location: string } }
  | { name: 'view_subscription_list'; params: {} }
  | { name: 'begin_checkout'; params: { plan_id: string; price: number; currency: string } }
  | { name: 'purchase_success'; params: { plan_id: string; price: number; transaction_id: string } }
  | { name: 'purchase_fail'; params: { plan_id: string; price: number; reason?: string } }

  // ERRORS
  | { name: 'error_vpn'; params: { location?: string } }
  | { name: 'error_publish'; params: { reason: string } };

// ─── Core Logger ────────────────────────────────────────────────────────────
export class AnalyticsService {

  static log(event: AnalyticsEvent) {
    try {
      if (!analytics) return;
      const params = { ...event.params } as Record<string, any>;
      if (process.env.NODE_ENV === 'development') params.debug_mode = true;
      logEvent(analytics, event.name as string, params);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] ${event.name}`, params);
      }
    } catch (e) {
      console.warn("[Analytics] Failed to log event", e);
    }
  }

  // ─── Identity ───────────────────────────────────────────────────────────
  static identify(userId: string, properties: { plan: string; has_channel: boolean; posts_published?: number }) {
    try {
      if (!analytics) return;
      setUserId(analytics, userId);
      setUserProperties(analytics, properties as any);
    } catch (e) {
      console.warn("[Analytics] Failed to identify user", e);
    }
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  static trackSignup(method: string, referrer?: string) {
    this.log({ name: 'signup', params: { method, referrer } });
  }

  static trackLogin(method: string, referrer?: string) {
    this.log({ name: 'login', params: { method, referrer } });
  }

  static trackSessionStart(returning: boolean, referrer?: string) {
    this.log({ name: 'session_start', params: { returning, referrer } });
  }

  // ─── Channel Connect ─────────────────────────────────────────────────────
  static trackChannelConnectStart() {
    this.log({ name: 'channel_connect_start', params: {} });
  }

  static trackChannelConnectSuccess(channelType: 'public' | 'private') {
    this.log({ name: 'channel_connect_success', params: { channel_type: channelType } });
  }

  static trackChannelConnectFail(reason: string) {
    this.log({ name: 'channel_connect_fail', params: { reason } });
  }

  // ─── Ideas Funnel ────────────────────────────────────────────────────────
  static trackGenerateIdeas(topic?: string) {
    this.log({ name: 'generate_ideas', params: { topic } });
  }

  static trackIdeaPresented(count: number, channelUrl: string) {
    this.log({ name: 'idea_presented', params: { count, channel_url: channelUrl } });
  }

  static trackIdeaSelected(ideaIndex: number, title: string) {
    this.log({ name: 'idea_selected', params: { idea_index: ideaIndex, title } });
  }

  static trackIdeasRegenerated() {
    this.log({ name: 'ideas_regenerated', params: {} });
  }

  // ─── Post Funnel ─────────────────────────────────────────────────────────
  static trackGeneratePost(method: 'idea' | 'scratch', hasImage: boolean, topic?: string) {
    this.log({ name: 'generate_post', params: { method, has_image: hasImage, topic } });
  }

  static trackPostEditedManual(editCountSession: number) {
    this.log({ name: 'post_edited_manual', params: { edit_count_session: editCountSession } });
  }

  static trackPostEditedAI(instructionLength: number) {
    this.log({ name: 'post_edited_ai', params: { instruction_length: instructionLength } });
  }

  static trackCopyPost(length: number) {
    this.log({ name: 'copy_post', params: { length } });
  }

  static trackPublish(channelId?: string, hasImage?: boolean) {
    this.log({ name: 'publish_telegram', params: { channel_id: channelId, has_image: !!hasImage } });
  }

  // ─── Workspace ───────────────────────────────────────────────────────────
  static trackProjectCreated() {
    this.log({ name: 'project_created', params: {} });
  }

  static trackProjectOpened(status: 'draft' | 'published') {
    this.log({ name: 'project_opened', params: { status } });
  }

  // ─── Monetization ────────────────────────────────────────────────────────
  static trackPaywallHit(location: string, limitType: 'posts' | 'brands') {
    this.log({ name: 'paywall_hit', params: { location, limit_type: limitType } });
  }

  static trackViewSubscription() {
    this.log({ name: 'view_subscription_list', params: {} });
  }

  static trackBeginCheckout(planId: string, price: number) {
    this.log({ name: 'begin_checkout', params: { plan_id: planId, price, currency: 'RUB' } });
  }

  static trackPurchaseSuccess(planId: string, price: number, transactionId: string) {
    this.log({ name: 'purchase_success', params: { plan_id: planId, price, transaction_id: transactionId } });
    // Standard GA4 eCommerce — enables Revenue in Monetization reports
    try {
      if (analytics) {
        logEvent(analytics, 'purchase', {
          transaction_id: transactionId,
          value: price,
          currency: 'RUB',
          items: [{ item_id: planId, item_name: planId, price, quantity: 1 }],
        });
      }
    } catch (e) {
      console.warn('[Analytics] purchase ecommerce event failed', e);
    }
  }

  static trackPurchaseFail(planId: string, price: number, reason?: string) {
    this.log({ name: 'purchase_fail', params: { plan_id: planId, price, reason } });
  }

  // ─── Errors ──────────────────────────────────────────────────────────────
  static trackPublishError(reason: string) {
    this.log({ name: 'error_publish', params: { reason } });
  }
}
