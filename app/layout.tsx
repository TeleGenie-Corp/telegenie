import type { Metadata } from 'next';
import { Manrope, Unbounded } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { AuthInitializer } from '@/src/components/AuthInitializer';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  weight: ['400', '700', '900'],
});

export const viewport = {
  themeColor: '#000B46',
};

export const metadata: Metadata = {
  title: 'TeleGenie Studio — ИИ-ассистент для Telegram',
  description: 'Создавайте контент для Telegram-каналов с помощью ИИ. Стратегия, генерация идей, умный редактор и публикация — всё в одном месте.',
  openGraph: {
    type: 'website',
    title: 'TeleGenie Studio — ИИ-ассистент для Telegram',
    description: 'Создавайте контент для Telegram-каналов с помощью ИИ. Стратегия, генерация идей, умный редактор и публикация.',
    url: 'https://telegenie.app',
    siteName: 'TeleGenie Studio',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head />
      <body className={`${manrope.variable} ${unbounded.variable} font-sans`}>
        <AuthInitializer />
        {children}
        <Script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
