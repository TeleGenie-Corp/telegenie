'use client';

import { useEffect } from 'react';

const UTM_KEY = 'tg_utm';

export interface StoredUTM {
  source?: string;   // utm_source  — кто привёл (pavel, misha, google_ads)
  medium?: string;   // utm_medium  — канал (referral, cpc, email)
  campaign?: string; // utm_campaign — кампания (team, launch, black_friday)
  capturedAt: number;
}

/** Читает UTM из URL и сохраняет в localStorage при ПЕРВОМ визите. */
export function UTMCapture() {
  useEffect(() => {
    try {
      // Если attribution уже есть — не перезаписывать
      if (localStorage.getItem(UTM_KEY)) return;

      const p = new URLSearchParams(window.location.search);
      const source = p.get('utm_source') || undefined;
      const medium = p.get('utm_medium') || undefined;
      const campaign = p.get('utm_campaign') || undefined;

      if (source || medium || campaign) {
        const utm: StoredUTM = { source, medium, campaign, capturedAt: Date.now() };
        localStorage.setItem(UTM_KEY, JSON.stringify(utm));
        if (process.env.NODE_ENV === 'development') {
          console.log('[UTM] Captured attribution:', utm);
        }
      }
    } catch { /* ignore */ }
  }, []);

  return null;
}

/** Возвращает сохранённый UTM или пустой объект. */
export function getStoredUTM(): Partial<StoredUTM> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
