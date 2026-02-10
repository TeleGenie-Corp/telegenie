import React, { useEffect, useRef } from 'react';
import { TelegramUser } from '../../types';

interface TelegramLoginProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write' | undefined;
}

export const TelegramLogin: React.FC<TelegramLoginProps> = ({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 20,
  requestAccess = 'write' // Ask for write access to allow sending messages from user name if needed later
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if script is already present to avoid duplicates
    if (containerRef.current?.querySelector('script')) return;

    // Define the global callback function
    window.TelegramLoginWidget = {
      dataOnauth: (user: TelegramUser) => {
        onAuth(user);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    if (requestAccess) {
      script.setAttribute('data-request-access', requestAccess);
    }
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    script.async = true;

    containerRef.current?.appendChild(script);

    return () => {
      // Cleanup global handler
      // @ts-ignore
      delete window.TelegramLoginWidget;
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, onAuth]);

  return <div ref={containerRef} className="flex justify-center" />;
};

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: TelegramUser) => void;
    };
  }
}
