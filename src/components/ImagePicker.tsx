import React from 'react';
import { RefreshCw, Image as ImageIcon } from 'lucide-react';

interface ImagePickerProps {
  imageUrl: string | undefined;
  imageUrlOptions: string[] | undefined;
  imagePrompt: string | undefined;
  onSelectImage: (url: string) => void;
  onRegenerate: () => void;
  regenerating?: boolean;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  imageUrl,
  imageUrlOptions,
  onSelectImage,
  onRegenerate,
  regenerating = false,
}) => {
  const options = imageUrlOptions?.length ? imageUrlOptions : imageUrl ? [imageUrl] : [];

  if (options.length === 0) return null;

  return (
    <div className="space-y-2 mt-3 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImageIcon size={12} className="text-[#9aaeb5]" />
          <span className="text-[10px] uppercase tracking-widest text-[#9aaeb5] font-medium">Выбери изображение</span>
        </div>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1 text-[10px] text-[#758084] hover:text-[#233137] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={10} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Генерация...' : 'Сгенерировать ещё'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            onClick={() => onSelectImage(url)}
            className={`relative rounded-lg overflow-hidden border transition-all ${
              imageUrl === url
                ? 'ring-2 ring-violet-500 border-violet-500'
                : 'border-[#e8e8e8] hover:border-[#aec2c9] opacity-80 hover:opacity-100'
            }`}
          >
            <img
              src={url}
              alt={`Вариант ${idx + 1}`}
              className="w-full h-24 object-cover"
              loading="lazy"
            />
            {imageUrl === url && (
              <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
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
