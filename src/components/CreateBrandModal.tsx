import React, { useState } from 'react';
import { X, Building2, Link, Loader2 } from 'lucide-react';

interface CreateBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; channelUrl: string }) => Promise<void>;
}

export const CreateBrandModal: React.FC<CreateBrandModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-display font-black text-slate-900 mb-2 flex items-center gap-2">
          <Building2 className="text-violet-600" size={24} />
          Новый бренд
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Создай профиль для канала с позиционированием.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              Название бренда
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Мой канал, Бизнес-блог..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              <Link size={12} className="inline mr-1" /> Ссылка на канал
            </label>
            <input
              type="text"
              value={channelUrl}
              onChange={e => setChannelUrl(e.target.value)}
              placeholder="https://t.me/mychannel"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 font-medium">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim() || !channelUrl.trim()}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Building2 size={16} />}
            {saving ? 'Создаю...' : 'Создать бренд'}
          </button>
        </form>
      </div>
    </div>
  );
};
