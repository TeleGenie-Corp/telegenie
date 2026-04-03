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

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f2f5f5] border border-[#e8e8e8] mb-10"
          >
            <Sparkles className="text-[#9aaeb5]" size={12} />
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#758084]">Редактор для Telegram-каналов</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-7xl tracking-[-0.06rem] md:tracking-[-0.12rem] leading-[1.1] text-[#233137] mb-8 font-light"
          >
            Контент{' '}
            <span className="text-[#9aaeb5]">без напряжения</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-[#758084] max-w-xl mx-auto mb-10 leading-relaxed font-light"
          >
            TeleGenie изучает ваш канал и генерирует тексты в вашем стиле — вам остаётся только нажать «Опубликовать».
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={onLogin}
              className="px-6 py-3 bg-[#233137] text-white rounded-xl text-sm font-medium inline-flex items-center gap-2 hover:bg-[#1a2529] transition-colors active:scale-95"
            >
              Начать бесплатно
              <ArrowRight size={15} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Demo — full width */}
      <section id="demo" className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl bg-[#f9fbfb] overflow-hidden py-8">
            <PublicWidget />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-display text-3xl md:text-5xl tracking-[-0.06rem] text-[#233137] mb-4 font-light">Три шага к идеальному посту</h2>
            <p className="text-[#758084] font-light">Весь процесс автоматизирован — от идеи до публикации</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Card 1 — Brand analysis */}
            <div className="rounded-2xl bg-[#f9fbfb] border border-[#f2f2f2] p-6 flex flex-col">
              <div className="flex-1 flex items-center justify-center bg-[#f2f5f5] rounded-xl p-5 mb-8 min-h-[180px]">
                <div className="w-full text-left">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#9aaeb5]/25 flex items-center justify-center text-[10px] font-semibold text-[#233137] shrink-0">TG</div>
                    <div>
                      <div className="text-[11px] font-medium text-[#233137]">@mytech_channel</div>
                      <div className="text-[9px] text-[#758084]">12 400 подписчиков</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {['Технологии', 'Продуктивность', 'Стартапы'].map(t => (
                      <span key={t} className="text-[9px] bg-white border border-[#e8e8e8] text-[#515255] px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                  <div className="text-[9px] text-[#758084]">
                    <span className="text-[#9aaeb5] font-medium">Тон:</span> Экспертный, без воды
                  </div>
                </div>
              </div>
              <h3 className="text-base font-medium text-[#233137] mb-2">Анализ бренда</h3>
              <p className="text-sm text-[#758084] leading-relaxed font-light">Изучаем ваш канал, чтобы уловить уникальный Tone of Voice и интересы вашей аудитории.</p>
            </div>

            {/* Card 2 — In-editor writing help */}
            <div className="rounded-2xl bg-[#f9fbfb] border border-[#f2f2f2] p-6 flex flex-col">
              <div className="flex-1 flex items-center justify-center bg-[#f2f5f5] rounded-xl p-5 mb-8 min-h-[180px]">
                <div className="w-full text-left">
                  <div className="bg-white border border-[#f2f2f2] rounded-lg p-3 text-[10px] text-[#515255] leading-relaxed mb-3">
                    Рынок меняется быстрее, чем большинство успевает адаптироваться. Вот три вещи, которые помогают...
                  </div>
                  <div className="text-[9px] text-[#758084] mb-1.5 font-medium">Предложения ассистента</div>
                  <div className="flex flex-wrap gap-1">
                    {['Добавить пример', 'Сделать острее', 'Короче'].map(s => (
                      <span key={s} className="text-[9px] bg-white border border-[#e8e8e8] text-[#9aaeb5] px-2 py-1 rounded-lg cursor-default">{s} ↗</span>
                    ))}
                  </div>
                </div>
              </div>
              <h3 className="text-base font-medium text-[#233137] mb-2">Ассистент в редакторе</h3>
              <p className="text-sm text-[#758084] leading-relaxed font-light">Подсказывает, как развить мысль, сделать текст сильнее или короче — прямо в процессе написания.</p>
            </div>

            {/* Card 3 — Publishing */}
            <div className="rounded-2xl bg-[#f9fbfb] border border-[#f2f2f2] p-6 flex flex-col">
              <div className="flex-1 flex items-center justify-center bg-[#f2f5f5] rounded-xl p-5 mb-8 min-h-[180px]">
                <div className="w-full text-left">
                  <div className="flex gap-1 mb-2.5">
                    {['B', 'I', 'U'].map((f, i) => (
                      <div key={f} className={`w-5 h-5 rounded bg-white border border-[#e8e8e8] flex items-center justify-center text-[9px] text-[#758084] ${i === 0 ? 'font-bold text-[#9aaeb5]' : i === 1 ? 'italic' : 'underline'}`}>{f}</div>
                    ))}
                    <div className="flex-1" />
                    <div className="text-[9px] text-[#9aaeb5] self-center">284 симв.</div>
                  </div>
                  <div className="bg-white border border-[#f2f2f2] rounded-lg p-2.5 text-[10px] text-[#515255] leading-relaxed mb-2.5 min-h-[52px]">
                    Сегодня разберём три причины, почему большинство авторов не могут выйти на регулярный постинг...
                  </div>
                  <button className="w-full text-[10px] font-medium bg-[#233137] text-white py-1.5 rounded-lg">
                    Опубликовать в Telegram →
                  </button>
                </div>
              </div>
              <h3 className="text-base font-medium text-[#233137] mb-2">Публикация в клик</h3>
              <p className="text-sm text-[#758084] leading-relaxed font-light">Редактируйте текст и отправляйте готовый пост прямо в Telegram из нашей панели.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 bg-[#f2f5f5]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-display text-3xl md:text-5xl tracking-[-0.06rem] text-[#233137] mb-4 font-light">Прозрачные тарифы</h2>
            <p className="text-[#758084] font-light">Выберите план, который подходит вашему каналу</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`p-8 rounded-2xl flex flex-col h-full ${
                  plan.id === 'expert'
                    ? 'bg-[#233137] text-white'
                    : 'bg-white border border-[#e8e8e8]'
                }`}
              >
                {plan.id === 'expert' && (
                  <span className="bg-white/15 text-white text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-full self-start mb-4">
                    Рекомендуем
                  </span>
                )}
                <h3 className={`text-lg font-medium mb-2 ${plan.id === 'expert' ? 'text-white' : 'text-[#233137]'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className={`text-4xl font-light ${plan.id === 'expert' ? 'text-white' : 'text-[#233137]'}`}>
                    {plan.price}₽
                  </span>
                  <span className={`text-sm ${plan.id === 'expert' ? 'text-white/50' : 'text-[#7d828e]'}`}>/мес</span>
                </div>

                <ul className="space-y-3 mb-10 flex-1">
                  {plan.limits.postsPerMonth < 1000 ? (
                    <li className={`flex items-center gap-3 text-sm ${plan.id === 'expert' ? 'text-white/80' : 'text-[#515255]'}`}>
                      <MousePointer2 className={plan.id === 'expert' ? 'text-white/40' : 'text-[#9aaeb5]'} size={14} />
                      {plan.limits.postsPerMonth} постов / месяц
                    </li>
                  ) : (
                    <li className={`flex items-center gap-3 text-sm ${plan.id === 'expert' ? 'text-white' : 'text-[#233137]'}`}>
                      <Zap className={plan.id === 'expert' ? 'text-white/60' : 'text-[#9aaeb5]'} size={14} />
                      Безлимит постов
                    </li>
                  )}
                  {plan.features.map((feat, i) => (
                    <li key={i} className={`flex items-center gap-3 text-sm font-light ${plan.id === 'expert' ? 'text-white/70' : 'text-[#515255]'}`}>
                      <Shield className={plan.id === 'expert' ? 'text-white/30' : 'text-[#cddbe1]'} size={14} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onLogin}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-colors active:scale-95 ${
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
      <section className="py-32 px-6 bg-white text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="font-display text-3xl md:text-5xl tracking-[-0.06rem] leading-tight font-light text-[#233137]">
            Канал выходит регулярно,<br className="hidden md:block" /> а вы не выгораете
          </h2>
          <p className="text-[#758084] text-base max-w-md mx-auto leading-relaxed font-light">
            TeleGenie берёт на себя самую утомительную часть — вы сосредотачиваетесь на идеях.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Идеи каждый день', 'Стиль сохранён', 'Публикация в 1 клик'].map(item => (
              <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f2f5f5] border border-[#e8e8e8] text-[#758084] text-xs">
                <CheckCircle2 size={11} className="text-[#9aaeb5]" />
                {item}
              </span>
            ))}
          </div>
          <div>
            <button
              onClick={onLogin}
              className="px-6 py-3 bg-[#233137] text-white rounded-xl text-sm font-medium hover:bg-[#1a2529] transition-colors active:scale-95"
            >
              Попробовать бесплатно
            </button>
            <p className="text-[#9aaeb5] text-xs mt-4">Без карты</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};
