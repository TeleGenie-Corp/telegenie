import type { Metadata } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { AuthInitializer } from '@/src/components/AuthInitializer';
import { UTMCapture } from '@/src/components/UTMCapture';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const viewport = {
  themeColor: '#000B46',
};

export const metadata: Metadata = {
  title: 'TeleGenie Studio — редактор для Telegram-каналов',
  description: 'Создавайте контент для Telegram-каналов. Стратегия, генерация идей, умный редактор и публикация — всё в одном месте.',
  openGraph: {
    type: 'website',
    title: 'TeleGenie Studio — редактор для Telegram-каналов',
    description: 'Создавайте контент для Telegram-каналов. Стратегия, генерация идей, умный редактор и публикация.',
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
      <body className={`${manrope.variable} ${inter.variable} font-sans`}>
        <AuthInitializer />
        <UTMCapture />
        {children}
        <Script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js" strategy="lazyOnload" />
        <Script src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
