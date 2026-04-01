import React from 'react';
import Link from 'next/link';
import { Sparkles, Globe, ArrowLeft, Zap, Wrench, Bug, Palette } from 'lucide-react';
import { changelog, ChangelogTag } from '@/src/data/changelog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Что нового — TeleGenie',
  description: 'История обновлений TeleGenie: новые функции, улучшения и исправления.',
  openGraph: {
    title: 'Что нового — TeleGenie',
    description: 'История обновлений TeleGenie: новые функции, улучшения и исправления.',
  },
};

const tagConfig: Record<ChangelogTag, { label: string; className: string; Icon: React.FC<{ size?: number }> }> = {
  'новое':      { label: 'Новое',      className: 'bg-violet-100 text-violet-700',  Icon: ({ size }) => <Sparkles size={size} /> },
  'улучшение':  { label: 'Улучшение',  className: 'bg-blue-100 text-blue-700',      Icon: ({ size }) => <Zap size={size} /> },
  'исправлено': { label: 'Исправлено', className: 'bg-amber-100 text-amber-700',    Icon: ({ size }) => <Bug size={size} /> },
  'дизайн':     { label: 'Дизайн',     className: 'bg-fuchsia-100 text-fuchsia-700', Icon: ({ size }) => <Palette size={size} /> },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-200">
              <Globe className="text-white" size={15} />
            </div>
            <span className="font-display font-black text-lg tracking-tight text-slate-900">
              TeleGenie<span className="text-violet-600">.</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            На главную
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-widest mb-6">
          <Sparkles size={11} />
          Changelog
        </div>
        <h1 className="text-4xl font-display font-black tracking-tight text-slate-900 mb-3">
          Что нового
        </h1>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          Все обновления TeleGenie — коротко и по делу.
        </p>
      </div>

      {/* Entries */}
      <div className="max-w-3xl mx-auto px-6 pb-24">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 hidden sm:block" />

          <div className="space-y-16">
            {changelog.map((entry, index) => (
              <div key={entry.version} className="relative sm:pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm hidden sm:block ${
                  index === 0 ? 'bg-violet-600' : 'bg-slate-300'
                }`} />

                {/* Date + version */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {formatDate(entry.date)}
                  </span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    v{entry.version}
                  </span>
                  {index === 0 && (
                    <span className="text-[10px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Актуально
                    </span>
                  )}
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 pb-4 border-b border-slate-50">
                    <h2 className="text-xl font-black text-slate-900 mb-1">{entry.title}</h2>
                    {entry.summary && (
                      <p className="text-sm text-slate-500 leading-relaxed">{entry.summary}</p>
                    )}
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {entry.items.map((item, i) => {
                      const cfg = tagConfig[item.tag];
                      return (
                        <li key={i} className="flex items-start gap-3 px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 mt-0.5 ${cfg.className}`}>
                            <cfg.Icon size={9} />
                            {cfg.label}
                          </span>
                          <span className="text-sm text-slate-700 leading-relaxed">{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-slate-100 bg-white py-12 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 font-medium">
            Есть идея или нашёл баг?
          </p>
          <a
            href="mailto:nenashev.studio@gmail.com"
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all active:scale-95"
          >
            Написать в поддержку
          </a>
        </div>
      </div>
    </div>
  );
}
