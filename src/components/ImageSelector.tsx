'use client';

import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface ImageSelectorProps {
  images: string[];
  selectedUrl?: string | null;
  onSelect: (url: string) => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  images,
  selectedUrl,
  onSelect,
  onRegenerate,
  isRegenerating = false,
}) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Выберите изображение
        </span>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-md transition-all disabled:opacity-50"
        >
          {isRegenerating ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
          Сгенерировать ещё
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {images.map((url, index) => (
          <button
            key={`${url}-${index}`}
            onClick={() => onSelect(url)}
            className={`relative rounded-lg overflow-hidden border-2 transition-all group ${
              selectedUrl === url
                ? 'border-violet-500 ring-2 ring-violet-200'
                : 'border-transparent hover:border-slate-300'
            }`}
          >
            <img
              src={url}
              alt={`Вариант ${index + 1}`}
              className="w-full h-24 object-cover"
              loading="lazy"
            />
            {selectedUrl === url && (
              <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center">
                <div className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Выбрано
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
