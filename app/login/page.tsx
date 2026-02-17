'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPage } from '@/src/components/AuthPage';
import { useAuthStore } from '@/src/stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-slate-50">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
              </div>
          </div>
      );
  }

  // Pass dummy onLogin, actual logic handled by store updates and useEffect above
  return <AuthPage onLogin={() => {}} />;
}
