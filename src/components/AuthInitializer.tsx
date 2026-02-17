'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function AuthInitializer() {
  const init = useAuthStore(s => s.init);

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, [init]);

  return null;
}
