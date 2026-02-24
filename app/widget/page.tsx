'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

const PublicWidget = React.lazy(() => import('@/src/components/PublicWidget'));

export default function WidgetPage() {
  return (
    <div className="min-h-screen py-8 bg-slate-50 font-sans text-slate-900 flex items-center justify-center p-4">
      <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-violet-600" size={32} /></div>}>
        <PublicWidget />
        <Toaster position="top-right" richColors closeButton />
      </Suspense>
    </div>
  );
}
