import React from 'react';
import Link from 'next/link';
import { Mail, Globe } from 'lucide-react';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand & Contacts */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <Globe className="text-white" size={18} />
              </div>
              <span className="font-display font-black text-xl tracking-tight text-slate-900">
                TeleGenie<span className="text-violet-600">.</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Ваш персональный ИИ-ассистент для управления и роста Telegram-каналов. 
              От стратегии до публикации за считанные минуты.
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <Mail size={14} className="text-violet-500" />
                <a href="mailto:nenashev.studio@gmail.com" className="hover:text-violet-600 transition-colors">
                  nenashev.studio@gmail.com
                </a>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                ИП Ненашев Павел Сергеевич<br />
                ИНН: 745115499703<br />
                Адрес: г. Санкт-Петербург, пр-д 1-й Предпортовый, д. 15, стр. 1, 373
              </p>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Продукт</h4>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li><Link href="/" className="hover:text-violet-600 transition-colors">Главная</Link></li>
              <li><Link href="/contacts" className="hover:text-violet-600 transition-colors">Контакты</Link></li>
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-violet-600 transition-colors">Тарифы</button></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Юридическая информация</h4>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li><Link href="/terms" className="hover:text-violet-600 transition-colors">Пользовательское соглашение</Link></li>
              <li><Link href="/privacy" className="hover:text-violet-600 transition-colors">Политика конфиденциальности</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Payments & Copyright */}
        <div className="pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} TeleGenie Studio. Все права защищены.
          </p>
          
          {/* Payment Icons */}
          <div className="flex items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Visa */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" alt="Visa" className="h-4" />
            {/* Mastercard */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
            {/* MIR */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b9/Mir-logo.svg" alt="MIR" className="h-5" />
            {/* YooKassa */}
            <img src="https://static.yoomoney.ru/files-front/kassa/yookassa_logo_blue_eng.svg" alt="YooKassa" className="h-6" />
          </div>
        </div>
      </div>
    </footer>
  );
};
