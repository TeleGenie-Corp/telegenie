import React from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="bg-[#f2f5f5] py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand & Contacts */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#233137] flex items-center justify-center text-white text-[10px] font-semibold">
                TG
              </div>
              <span className="font-display text-base font-medium text-[#233137]">TeleGenie</span>
            </div>
            <p className="text-sm text-[#758084] max-w-sm leading-relaxed font-light">
              Редактор для управления и роста Telegram-каналов.
              От стратегии до публикации за считанные минуты.
            </p>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-sm text-[#758084]">
                <Mail size={13} className="text-[#9aaeb5]" />
                <a href="mailto:nenashev.studio@gmail.com" className="hover:text-[#233137] transition-colors">
                  nenashev.studio@gmail.com
                </a>
              </div>
              <p className="text-[10px] text-[#9aaeb5] uppercase tracking-widest leading-loose">
                ИП Ненашев Павел Сергеевич · ИНН: 745115499703
              </p>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-widest text-[#9aaeb5]">Продукт</h4>
            <ul className="space-y-3 text-sm text-[#758084] font-light">
              <li><Link href="/" className="hover:text-[#233137] transition-colors">Главная</Link></li>
              <li><Link href="/contacts" className="hover:text-[#233137] transition-colors">Контакты</Link></li>
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-[#233137] transition-colors">Тарифы</button></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-widest text-[#9aaeb5]">Юридическая информация</h4>
            <ul className="space-y-3 text-sm text-[#758084] font-light">
              <li><Link href="/terms" className="hover:text-[#233137] transition-colors">Пользовательское соглашение</Link></li>
              <li><Link href="/privacy" className="hover:text-[#233137] transition-colors">Политика конфиденциальности</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#e8e8e8] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="text-xs text-[#9aaeb5]">
              © {new Date().getFullYear()} TeleGenie Studio. Все права защищены.
            </p>
            <span className="text-[#cddbe1] hidden sm:inline">·</span>
            <a href="https://t.me/sphera_spb" target="_blank" rel="noopener noreferrer" className="text-xs text-[#9aaeb5] hover:text-[#233137] transition-colors">
              При поддержке Сферы
            </a>
          </div>

          <div className="flex items-center gap-6 opacity-40 grayscale">
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" alt="Visa" className="h-4" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b9/Mir-logo.svg" alt="MIR" className="h-5" />
            <img src="https://static.yoomoney.ru/files-front/kassa/yookassa_logo_blue_eng.svg" alt="YooKassa" className="h-6" />
          </div>
        </div>
      </div>
    </footer>
  );
};
