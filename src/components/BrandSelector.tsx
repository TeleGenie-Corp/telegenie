import React from 'react';
import { ChevronDown, Plus, Building2 } from 'lucide-react';
import { Brand } from '../../types';

interface BrandSelectorProps {
  brands: Brand[];
  selectedBrand: Brand | null;
  onSelect: (brand: Brand) => void;
  onCreateNew: () => void;
  loading?: boolean;
}

export const BrandSelector: React.FC<BrandSelectorProps> = ({
  brands,
  selectedBrand,
  onSelect,
  onCreateNew,
  loading
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-violet-300 transition-all text-sm font-medium text-slate-700 w-full justify-between"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 size={14} className="text-violet-500 shrink-0" />
          <span className="truncate">
            {loading ? 'Загрузка...' : selectedBrand?.name || 'Выбрать бренд'}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => { onSelect(brand); setOpen(false); }}
                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-violet-50 flex items-center gap-2 transition-colors ${
                  selectedBrand?.id === brand.id ? 'bg-violet-50 text-violet-700' : 'text-slate-700'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {brand.name[0]}
                </div>
                <span className="truncate flex-1">{brand.name}</span>
                {brand.positioning && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Есть позиционирование" />}
              </button>
            ))}
            
            <button
              onClick={() => { onCreateNew(); setOpen(false); }}
              className="w-full px-3 py-2.5 text-left text-sm text-violet-600 hover:bg-violet-50 flex items-center gap-2 border-t border-slate-100 font-medium"
            >
              <Plus size={14} />
              Добавить бренд
            </button>
          </div>
        </>
      )}
    </div>
  );
};
