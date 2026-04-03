import React from 'react';
import { Sparkles, Zap, Shield, MousePointer2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { motion } from 'framer-motion';
import { PLANS } from '../constants/plans';
import { PublicWidget } from './PublicWidget';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-[#f2f5f5] flex flex-col font-sans">

      {/* Hero — white bg */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f2f5f5] border border-[#e8e8e8] mb-8"
          >
            <Sparkles className="text-[#9aaeb5]" size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#758084]">Редактор для Telegram-каналов</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-7xl tracking-[-0.06rem] md:tracking-[-0.12rem] leading-[1.1] text-[#233137] mb-6 font-light"
          >
            Контент{' '}
            <span className="text-[#9aaeb5]">
              без напряжения
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#515255] max-w-2xl mx-auto mb-6 leading-relaxed"
          >
            TeleGenie изучает ваш канал и генерирует идеи и тексты в вашем стиле — вам остаётся только нажать «Опубликовать».
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={onLogin}
              className="px-8 py-5 bg-[#233137] text-white rounded-2xl font-medium text-base flex items-center gap-3 hover:bg-[#1a2529] transition-colors active:scale-95"
            >
              Начать бесплатно
              <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-white border-t border-[#f2f2f2]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl tracking-[-0.06rem] text-[#233137] mb-4 font-light">Три шага к идеальному посту</h2>
            <p className="text-[#515255]">Весь процесс автоматизирован — от идеи до публикации</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Card 1 — Brand analysis mockup */}
            <div className="p-8 rounded-3xl bg-[#f9fbfb] border border-[#f2f2f2]">
              <div className="bg-[#f2f5f5] border border-[#e8e8e8] rounded-2xl p-4 mb-6 text-left">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#9aaeb5]/25 flex items-center justify-center text-[11px] font-bold text-[#233137] shrink-0">TG</div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#233137]">@mytech_channel</div>
                    <div className="text-[10px] text-[#758084]">12 400 подписчиков</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['Технологии', 'Продуктивность', 'Стартапы'].map(t => (
                    <span key={t} className="text-[9px] bg-white border border-[#e8e8e8] text-[#515255] px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
                <div className="text-[10px] text-[#758084]">
                  <span className="text-[#9aaeb5] font-semibold">Тон:</span> Экспертный, без воды
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#233137] mb-3">Анализ бренда</h3>
              <p className="text-[#515255] leading-relaxed">Изучаем ваш канал, чтобы уловить уникальный Tone of Voice и интересы вашей аудитории.</p>
            </div>

            {/* Card 2 — Idea generation mockup */}
            <div className="p-8 rounded-3xl bg-[#f9fbfb] border border-[#f2f2f2]">
              <div className="bg-[#f2f5f5] border border-[#e8e8e8] rounded-2xl p-4 mb-6 text-left space-y-2">
                {[
                  '5 ошибок в промптинге, которые мешают вам...',
                  'Почему большинство команд сливают бюджет на...',
                  'Как мы сократили время на подготовку поста до...',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-white border border-[#f2f2f2] rounded-xl px-3 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9aaeb5] mt-1.5 shrink-0" />
                    <span className="text-[10px] text-[#233137] leading-tight">{text}</span>
                  </div>
                ))}
              </div>
              <h3 className="text-lg font-semibold text-[#233137] mb-3">Генерация идей</h3>
              <p className="text-[#515255] leading-relaxed">Получайте десятки релевантных тем и заголовков, адаптированных под вашу стратегию роста.</p>
            </div>

            {/* Card 3 — Publishing mockup */}
            <div className="p-8 rounded-3xl bg-[#f9fbfb] border border-[#f2f2f2]">
              <div className="bg-[#f2f5f5] border border-[#e8e8e8] rounded-2xl p-4 mb-6 text-left">
                <div className="flex gap-1.5 mb-2.5">
                  <div className="w-5 h-5 rounded bg-white border border-[#e8e8e8] flex items-center justify-center text-[9px] font-bold text-[#9aaeb5]">B</div>
                  <div className="w-5 h-5 rounded bg-white border border-[#e8e8e8] flex items-center justify-center text-[9px] italic text-[#758084]">I</div>
                  <div className="w-5 h-5 rounded bg-white border border-[#e8e8e8] flex items-center justify-center text-[9px] underline text-[#758084]">U</div>
                  <div className="flex-1" />
                  <div className="text-[9px] text-[#9aaeb5] font-medium self-center">284 симв.</div>
                </div>
                <div className="bg-white border border-[#f2f2f2] rounded-xl p-3 text-[10px] text-[#515255] leading-relaxed mb-3 min-h-[52px]">
                  Сегодня разберём три причины, почему большинство авторов не могут выйти на регулярный постинг...
                </div>
                <button className="w-full text-[11px] font-semibold bg-[#233137] text-white py-2 rounded-xl">
                  Опубликовать в Telegram →
                </button>
              </div>
              <h3 className="text-lg font-semibold text-[#233137] mb-3">Публикация в клик</h3>
              <p className="text-[#515255] leading-relaxed">Редактируйте текст и отправляйте готовый пост прямо в Telegram из нашей панели.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6 bg-[#f2f5f5]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl tracking-[-0.05rem] text-[#233137] mb-3 font-normal">Убедитесь сами</h2>
            <p className="text-[#515255]">Введите ссылку на любой Telegram-канал — проанализируем его и придумаем идеи прямо сейчас</p>
          </div>
          <div className="rounded-[32px] bg-white border border-[#f2f2f2] shadow-sm overflow-hidden py-8">
            <PublicWidget />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white border-t border-[#f2f2f2]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl tracking-[-0.06rem] text-[#233137] mb-4 font-light">Прозрачные тарифы</h2>
            <p className="text-[#515255]">Выберите план, который подходит вашему каналу</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`p-8 rounded-3xl flex flex-col h-full ${
                  plan.id === 'expert'
                    ? 'bg-[#233137] text-white'
                    : 'bg-[#f9fbfb] border border-[#f2f2f2]'
                }`}
              >
                {plan.id === 'expert' && (
                  <span className="bg-white/15 text-white text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full self-start mb-4">
                    Рекомендуем
                  </span>
                )}
                <h3 className={`text-xl font-semibold mb-2 ${plan.id === 'expert' ? 'text-white' : 'text-[#233137]'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className={`text-4xl font-semibold ${plan.id === 'expert' ? 'text-white' : 'text-[#233137]'}`}>
                    {plan.price}₽
                  </span>
                  <span className={`font-medium ${plan.id === 'expert' ? 'text-white/50' : 'text-[#7d828e]'}`}>/мес</span>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.limits.postsPerMonth < 1000 ? (
                    <li className={`flex items-center gap-3 text-sm ${plan.id === 'expert' ? 'text-white/80' : 'text-[#515255]'}`}>
                      <MousePointer2 className={plan.id === 'expert' ? 'text-white/40' : 'text-[#9aaeb5]'} size={16} />
                      {plan.limits.postsPerMonth} постов / месяц
                    </li>
                  ) : (
                    <li className={`flex items-center gap-3 text-sm font-semibold ${plan.id === 'expert' ? 'text-white' : 'text-[#233137]'}`}>
                      <Zap className={plan.id === 'expert' ? 'text-white/60' : 'text-[#9aaeb5]'} size={16} />
                      Безлимит постов
                    </li>
                  )}
                  {plan.features.map((feat, i) => (
                    <li key={i} className={`flex items-center gap-3 text-sm ${plan.id === 'expert' ? 'text-white/70' : 'text-[#515255]'}`}>
                      <Shield className={plan.id === 'expert' ? 'text-white/30' : 'text-[#cddbe1]'} size={16} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onLogin}
                  className={`w-full py-4 rounded-xl font-semibold uppercase tracking-widest text-xs transition-colors active:scale-95 ${
                    plan.id === 'expert'
                      ? 'bg-white text-[#233137] hover:bg-[#f2f5f5]'
                      : 'bg-[#233137] text-white hover:bg-[#1a2529]'
                  }`}
                >
                  {plan.id === 'free' ? 'Начать бесплатно' : 'Выбрать тариф'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-white border-t border-[#f2f2f2] text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="font-display text-3xl md:text-5xl tracking-[-0.06rem] leading-tight font-light text-[#233137]">
            Канал выходит регулярно,<br className="hidden md:block" /> а вы не выгораете
          </h2>
          <p className="text-[#515255] text-lg max-w-xl mx-auto leading-relaxed">
            TeleGenie берёт на себя самую утомительную часть — вы сосредотачиваетесь на идеях.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Идеи каждый день', 'Стиль сохранён', 'Публикация в 1 клик'].map(item => (
              <span key={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f2f5f5] border border-[#e8e8e8] text-[#515255] text-xs font-medium">
                <CheckCircle2 size={13} className="text-[#9aaeb5]" />
                {item}
              </span>
            ))}
          </div>
          <div>
            <button
              onClick={onLogin}
              className="px-10 py-4 bg-[#233137] text-white rounded-2xl font-medium text-base hover:bg-[#1a2529] transition-colors active:scale-95"
            >
              Попробовать бесплатно
            </button>
            <p className="text-[#9aaeb5] text-xs mt-3">Без карты</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};
