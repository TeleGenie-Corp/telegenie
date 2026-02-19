'use client';

import React from 'react';
import { SiteFooter } from '@/src/components/SiteFooter';
import { AppHeader } from '@/src/components/AppHeader';
import { useAuthStore } from '@/src/stores/authStore';
import { useUIStore } from '@/src/stores/uiStore';
import Link from 'next/link';
import { ChevronLeft, Mail, MapPin, FileText } from 'lucide-react';

export default function ContactsPage() {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const logout = useAuthStore(s => s.logout);
  const openSubscription = useUIStore(s => s.openSubscription);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader
        viewMode="workspace"
        user={user}
        profile={profile}
        currentBrand={null}
        darkMode={false}
        showMobileSidebar={false}
        onBackToWorkspace={() => window.location.href = '/'}
        onToggleDarkMode={() => {}}
        onLogout={logout}
        onToggleMobileSidebar={() => {}}
        onOpenSubscription={openSubscription}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-violet-600 transition-colors mb-8 group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Назад на главную
        </Link>

        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-12">Контактная информация</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Техническая поддержка</h3>
              <a href="mailto:nenashev.studio@gmail.com" className="text-xl font-bold text-slate-900 hover:text-violet-600 transition-colors leading-none">
                nenashev.studio@gmail.com
              </a>
              <p className="text-sm text-slate-500 mt-2 font-medium">Мы отвечаем в течение 24 часов</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Юридическое лицо</h3>
              <p className="text-base font-bold text-slate-900 leading-tight">
                ИП Ненашев Павел Сергеевич
              </p>
              <p className="text-sm text-slate-500 mt-1 font-medium">ИНН: 745115499703</p>
              <p className="text-sm text-slate-500 mt-1 font-medium">Адрес: г. Санкт-Петербург, пр-д 1-й Предпортовый, д. 15, стр. 1, 373</p>
            </div>
          </div>
        </div>

        <div className="mt-12 p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl text-white shadow-xl">
          <h2 className="text-2xl font-black tracking-tight mb-4">Для экспертов и авторов</h2>
          <p className="text-slate-300 font-medium leading-relaxed mb-6">
            Если вы хотите интегрировать наш AI-ассистент в вашу команду или обсудить индивидуальные условия сотрудничества, пожалуйста, свяжитесь с нами по электронной почте.
          </p>
          <a 
            href="mailto:nenashev.studio@gmail.com" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20 active:scale-95"
          >
            Связаться с основателем
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
