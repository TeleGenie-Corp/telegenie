import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Zap, Bug, Palette } from 'lucide-react';
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
  'новое':      { label: 'Новое',      className: 'bg-[#233137] text-white',            Icon: ({ size }) => <Sparkles size={size} /> },
  'улучшение':  { label: 'Улучшение',  className: 'bg-[#f2f5f5] text-[#758084]',        Icon: ({ size }) => <Zap size={size} /> },
  'исправлено': { label: 'Исправлено', className: 'bg-[#f2f5f5] text-[#758084]',        Icon: ({ size }) => <Bug size={size} /> },
  'дизайн':     { label: 'Дизайн',     className: 'bg-[#9aaeb5]/15 text-[#758084]',     Icon: ({ size }) => <Palette size={size} /> },
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
    <div className="min-h-screen bg-[#f2f5f5] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#f2f2f2] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-light text-lg tracking-tight text-[#233137]">
              TeleGenie
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#9aaeb5] hover:text-[#233137] font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            На главную
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-10">
        <p className="text-xs uppercase tracking-widest text-[#9aaeb5] font-medium mb-5">Changelog</p>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tight text-[#233137] mb-3">
          Что нового
        </h1>
        <p className="text-[#9aaeb5] text-base leading-relaxed">
          Все обновления TeleGenie — коротко и по делу.
        </p>
      </div>

      {/* Entries */}
      <div className="max-w-3xl mx-auto px-6 pb-24">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#e8e8e8] hidden sm:block" />

          <div className="space-y-14">
            {changelog.map((entry, index) => (
              <div key={entry.version} className="relative sm:pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#f2f5f5] hidden sm:block ${
                  index === 0 ? 'bg-[#233137]' : 'bg-[#cddbe1]'
                }`} />

                {/* Date + version */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs uppercase tracking-widest text-[#9aaeb5] font-medium">
                    {formatDate(entry.date)}
                  </span>
                  <span className="text-[10px] font-medium bg-white text-[#9aaeb5] px-2 py-0.5 rounded-md border border-[#f2f2f2]">
                    v{entry.version}
                  </span>
                  {index === 0 && (
                    <span className="text-[10px] font-medium bg-[#233137] text-white px-2.5 py-0.5 rounded-md uppercase tracking-widest">
                      Актуально
                    </span>
                  )}
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-[#f2f2f2] overflow-hidden">
                  <div className="p-6 pb-4 border-b border-[#f2f2f2]">
                    <h2 className="text-lg font-semibold text-[#233137] mb-1">{entry.title}</h2>
                    {entry.summary && (
                      <p className="text-sm text-[#9aaeb5] leading-relaxed">{entry.summary}</p>
                    )}
                  </div>
                  <ul className="divide-y divide-[#f9fbfb]">
                    {entry.items.map((item, i) => {
                      const cfg = tagConfig[item.tag];
                      return (
                        <li key={i} className="flex items-start gap-3 px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider shrink-0 mt-0.5 ${cfg.className}`}>
                            <cfg.Icon size={9} />
                            {cfg.label}
                          </span>
                          <span className="text-sm text-[#758084] leading-relaxed">{item.text}</span>
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
      <div className="border-t border-[#f2f2f2] bg-white py-12 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#9aaeb5]">
            Есть идея или нашёл баг?
          </p>
          <a
            href="mailto:nenashev.studio@gmail.com"
            className="px-5 py-2.5 bg-[#233137] hover:bg-[#1a2529] text-white rounded-xl text-sm font-medium transition-colors active:scale-95"
          >
            Написать в поддержку
          </a>
        </div>
      </div>
    </div>
  );
}
