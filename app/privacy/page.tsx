'use client';

import React from 'react';
import { SiteFooter } from '@/src/components/SiteFooter';
import { AppHeader } from '@/src/components/AppHeader';
import { useAuthStore } from '@/src/stores/authStore';
import { useUIStore } from '@/src/stores/uiStore';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
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

        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100 prose prose-slate max-w-none">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Политика конфиденциальности</h1>
          </div>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">1. Какие данные мы собираем</h2>
            <p className="text-slate-600 leading-relaxed">
              Мы собираем только те данные, которые необходимы для работы сервиса: адрес электронной почты, информацию о профиле при входе через Google, а также текст и параметры контента, который вы создаете в редакторе.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold text-slate-900">2. Как мы используем данные</h2>
            <p className="text-slate-600 leading-relaxed">
              Ваши данные используются исключительно для:
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-2">
              <li>Обеспечения доступа к личному кабинету и сохраненным проектам.</li>
              <li>Обработки платежей через сервис ЮKassa.</li>
              <li>Улучшения качества работы нашего ИИ-ассистента.</li>
            </ul>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold text-slate-900">3. Передача данных третьим лицам</h2>
            <p className="text-slate-600 leading-relaxed">
              Мы не передаем ваши личные данные третьим лицам, за исключением случаев, необходимых для обработки платежей (ЮKassa) или выполнения требований законодательства РФ. Текстовые данные для генерации обрабатываются через API Google Gemini в обезличенном виде.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold text-slate-900">4. Безопасность</h2>
            <p className="text-slate-600 leading-relaxed">
              Мы используем современные методы шифрования и безопасные протоколы (HTTPS) для защиты вашей информации. Вся финансовая информация обрабатывается на стороне платежного шлюза и не хранится в нашей базе данных.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-100 italic text-slate-400 text-sm">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
