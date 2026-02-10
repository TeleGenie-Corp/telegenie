import React, { useState } from 'react';
import { X, Building2, Link, Loader2 } from 'lucide-react';

interface CreateBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; channelUrl: string }) => Promise<void>;
}

import { motion, AnimatePresence } from 'framer-motion';

export const CreateBrandModal: React.FC<CreateBrandModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !channelUrl.trim()) {
      setError('Заполни все поля');
      return;
    }
    
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), channelUrl: channelUrl.trim() });
      setName('');
      setChannelUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8 relative"
          >
            
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>

            <h2 className="text-xl font-display font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Building2 className="text-violet-600 dark:text-violet-500" size={24} />
              Новый бренд
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Создай профиль для канала с позиционированием.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  Название бренда
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Мой канал, Бизнес-блог..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  <Link size={12} className="inline mr-1" /> Ссылка на канал
                </label>
                <input
                  type="text"
                  value={channelUrl}
                  onChange={e => setChannelUrl(e.target.value)}
                  placeholder="https://t.me/mychannel"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {error && (
                <div className="text-xs text-red-500 font-medium">{error}</div>
              )}

              <button
                type="submit"
                disabled={saving || !name.trim() || !channelUrl.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20 active:scale-95"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Building2 size={16} />}
                {saving ? 'Создаю...' : 'Создать бренд'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
