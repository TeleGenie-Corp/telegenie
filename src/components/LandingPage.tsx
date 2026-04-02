import React from 'react';
import { Sparkles, Zap, Target, Send, Shield, MousePointer2, ArrowRight, CheckCircle2, Clock, TrendingDown } from 'lucide-react';
import { SiteFooter } from './SiteFooter';
import { motion } from 'framer-motion';
import { listContainer, listItem } from '@/src/animationTokens';
import { PLANS } from '../constants/plans';
import { PublicWidget } from './PublicWidget';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-violet-100 selection:text-violet-900">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-400/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-fuchsia-400/10 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-8"
          >
            <Sparkles className="text-violet-600" size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Редактор для Telegram-каналов</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-black tracking-tight text-slate-900 mb-6 leading-[1.1]"
          >
            Ваш канал растёт —<br />
            а контент занимает <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">15 минут</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-6 font-medium leading-relaxed"
          >
            Большинство авторов тратят часы на придумывание тем и написание постов. TeleGenie изучает ваш канал и генерирует идеи и тексты в вашем стиле — вам остаётся только нажать «Опубликовать».
          </motion.p>

          {/* Pain points */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            {[
              { icon: Clock, text: 'Не знаете о чём писать сегодня' },
              { icon: TrendingDown, text: 'Канал молчит неделями' },
              { icon: Zap, text: 'Нет времени на контент' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                <Icon size={13} />
                {text}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={onLogin}
              className="px-8 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95 group"
            >
              Начать бесплатно
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:border-violet-200 hover:text-violet-600 transition-all active:scale-95"
            >
              Посмотреть демо ↓
            </button>
          </motion.div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-10 px-6 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Telegram-каналов' },
              { value: '10 000+', label: 'Постов создано' },
              { value: '3×', label: 'Чаще публикации' },
              { value: '15 мин', label: 'На пост вместо 2 часов' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">Три шага к идеальному посту</h2>
            <p className="text-slate-500 font-medium">Весь процесс автоматизирован — от идеи до публикации</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: Target, 
                title: 'Анализ бренда', 
                desc: 'Изучаем ваш канал, чтобы уловить уникальный Tone of Voice и интересы вашей аудитории.',
                color: 'bg-violet-100 text-violet-600'
              },
              { 
                icon: Sparkles, 
                title: 'Генерация идей', 
                desc: 'Получайте десятки релевантных тем и заголовков, адаптированных под вашу стратегию роста.',
                color: 'bg-emerald-100 text-emerald-600'
              },
              { 
                icon: Send, 
                title: 'Публикация в клик', 
                desc: 'Редактируйте текст и отправляйте готовый пост прямо в Telegram из нашей панели.',
                color: 'bg-blue-100 text-blue-600'
              },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl border border-slate-100 hover:border-violet-200 hover:shadow-xl transition-all group">
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed italic">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-3">Убедитесь сами</h2>
            <p className="text-slate-500 font-medium">Введите ссылку на любой Telegram-канал — проанализируем его и придумаем идеи прямо сейчас</p>
          </div>
          <div className="rounded-[40px] border border-slate-100 bg-white shadow-2xl overflow-hidden py-8 ring-1 ring-slate-200/50">
            <PublicWidget />
          </div>
        </div>
      </section>

      {/* Pricing Section (Compliance Requirement) */}
      <section id="pricing" className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">Прозрачные тарифы</h2>
            <p className="text-slate-500 font-medium">Выберите план, который подходит вашему каналу</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`p-8 rounded-3xl border-2 flex flex-col h-full bg-white transition-all hover:shadow-2xl ${plan.id === 'expert' ? 'border-violet-600 shadow-xl scale-105 z-10' : 'border-slate-100'}`}>
                {plan.id === 'expert' && <span className="bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full self-start mb-4">Рекомендуем</span>}
                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-slate-900">{plan.price}₽</span>
                  <span className="text-slate-400 font-medium">/мес</span>
                </div>
                
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.limits.postsPerMonth < 1000 ? (
                    <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                        <MousePointer2 className="text-violet-500" size={16} />
                        {plan.limits.postsPerMonth} постов / месяц
                    </li>
                  ) : (
                    <li className="flex items-center gap-3 text-sm text-slate-900 font-black">
                        <Zap className="text-amber-500" size={16} />
                        Безлимит постов
                    </li>
                  )}
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <Shield className="text-slate-300" size={16} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={onLogin}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 ${plan.id === 'expert' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {plan.id === 'free' ? 'Начать бесплатно' : 'Выбрать тариф'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — Success state (StoryBrand: what life looks like after) */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto rounded-[40px] bg-slate-900 p-12 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Представьте: канал выходит<br className="hidden md:block" /> регулярно, а вы не выгораете
            </h2>
            <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
              Авторы с TeleGenie публикуют в 3× чаще — и тратят на это меньше времени, чем раньше.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              {[
                'Идеи каждый день',
                'Стиль сохранён',
                'Публикация в 1 клик',
              ].map(item => (
                <span key={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-xs font-bold border border-white/10">
                  <CheckCircle2 size={13} className="text-violet-400" />
                  {item}
                </span>
              ))}
            </div>
            <button
              onClick={onLogin}
              className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-violet-50 transition-all shadow-xl active:scale-95"
            >
              Попробовать TeleGenie бесплатно
            </button>
            <p className="text-white/30 text-xs">Бесплатный план — без карты</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};
