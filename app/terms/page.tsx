'use client';

import React from 'react';
import { SiteFooter } from '@/src/components/SiteFooter';
import { AppHeader } from '@/src/components/AppHeader';
import { useAuthStore } from '@/src/stores/authStore';
import { useUIStore } from '@/src/stores/uiStore';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-8">Пользовательское соглашение (Оферта)</h1>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">1. Общие положения</h2>
            <p className="text-slate-600 leading-relaxed">
              Настоящее Соглашение является публичной офертой ИП Ненашев Павел Сергеевич (далее — Исполнитель) и определяет условия использования сервиса TeleGenie Studio (далее — Сервис).
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold text-slate-900">2. Предмет соглашения</h2>
            <p className="text-slate-600 leading-relaxed">
              Исполнитель предоставляет Пользователю доступ к функциональным возможностям Сервиса для анализа и генерации контента в Telegram на условиях платной подписки.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold text-slate-900">3. Стоимость услуг и порядок оплаты</h2>
            <p className="text-slate-600 leading-relaxed">
              Актуальная стоимость тарифных планов указана на главной странице Сервиса. Оплата производится банковскими картами через сертифицированного платежного провайдера.
            </p>
            <p className="text-slate-600 leading-relaxed font-bold">
              Подписки продлеваются автоматически в конце каждого расчетного периода, если автопродление не было отключено пользователем в личном кабинете.
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h2 className="text-xl font-bold text-slate-900">4. Отмена подписки и возврат средств</h2>
            <p className="text-slate-600 leading-relaxed">
              Пользователь вправе в любой момент отключить автопродление. Подписка при этом остается активной до конца оплаченного периода. Возврат средств за уже оплаченный период не производится, если иное не предусмотрено законодательством РФ.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Реквизиты</p>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              ИП Ненашев Павел Сергеевич<br />
              ИНН: 745115499703<br />
              Email: nenashev.studio@gmail.com
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
