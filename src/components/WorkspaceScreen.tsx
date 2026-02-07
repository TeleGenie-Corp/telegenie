import React, { useState, useEffect } from 'react';
import { FileText, Building2, Plus, Clock, Check, Archive, ArrowRight, Settings, Trash2, ChevronRight, UserCircle, Wand2 } from 'lucide-react';
import { Brand, PostProject, PostGoal } from '../../types';

interface WorkspaceScreenProps {
  brands: Brand[];
  posts: PostProject[];
  onSelectPost: (post: PostProject) => void;
  onCreatePost: (brandId: string) => void;
  onCreateBrand: () => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brandId: string) => void;
  onOpenPositioning: (brand: Brand) => void;
  loading?: boolean;
}

const statusConfig = {
  draft: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Черновик' },
  published: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Опубликован' },
  archived: { icon: Archive, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Архив' }
};

export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({
  brands,
  posts,
  onSelectPost,
  onCreatePost,
  onCreateBrand,
  onEditBrand,
  onDeleteBrand,
  onOpenPositioning,
  loading
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    brands.length === 1 ? brands[0].id : null
  );

  useEffect(() => {
      if (!selectedBrandId && brands.length > 0) {
          setSelectedBrandId(brands[0].id);
      }
  }, [brands]);

  const filteredPosts = selectedBrandId 
    ? posts.filter(p => p.brandId === selectedBrandId)
    : posts;

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-black text-slate-900">Рабочее пространство</h1>
          <p className="text-slate-500 text-sm mt-1">Выбери бренд и пост для работы</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Brands Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Building2 size={14} /> Бренды
              </h2>
              <button 
                onClick={onCreateBrand}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                <Plus size={12} /> Добавить
              </button>
            </div>

            <div className="space-y-2">
              {brands.map(brand => (
                <div
                  key={brand.id}
                  onClick={() => setSelectedBrandId(brand.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all group ${
                    selectedBrandId === brand.id
                      ? 'bg-white border-violet-300 ring-4 ring-violet-50 shadow-xl shadow-violet-100/50'
                      : 'bg-white border-slate-200 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors ${
                       selectedBrandId === brand.id ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600'
                    }`}>
                      {brand.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate transition-colors ${selectedBrandId === brand.id ? 'text-violet-900' : 'text-slate-900'}`}>{brand.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{brand.channelUrl}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {brand.positioning && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium border border-emerald-100">
                            Позиционирование ✓
                          </span>
                        )}
                        {brand.linkedChannel && (
                          <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full font-medium border border-sky-100">
                            Подключён
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditBrand(brand); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {brands.length === 0 && (
                <button
                  onClick={onCreateBrand}
                  className="w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all"
                >
                  <Building2 size={24} className="mx-auto text-slate-300 mb-2" />
                  <div className="text-sm font-medium text-slate-500">Создай первый бренд</div>
                  <div className="text-xs text-slate-400 mt-1">Добавь канал и позиционирование</div>
                </button>
              )}
            </div>
          </div>

          {/* Posts Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* BRAND POSITIONING CARD */}
            {selectedBrand && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group hover:border-violet-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
                                 <UserCircle size={20} />
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-900 text-sm">Стратегия бренда</h3>
                                 <p className="text-[10px] text-slate-500">Главные смыслы и ToV</p>
                             </div>
                        </div>
                        <button 
                            onClick={() => onOpenPositioning(selectedBrand)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-violet-50 text-slate-600 hover:text-violet-600 rounded-lg text-xs font-bold transition-all border border-slate-100 hover:border-violet-100"
                        >
                            <Wand2 size={14} />
                            Настроить
                        </button>
                    </div>
                    
                    {selectedBrand.positioning ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                           {selectedBrand.positioning}
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-center">
                            <p className="text-xs text-slate-500 mb-2">Стратегия еще не сформулирована</p>
                            <button 
                                onClick={() => onOpenPositioning(selectedBrand)}
                                className="text-xs font-bold text-violet-600 hover:underline"
                            >
                                Создать с AI
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <FileText size={14} /> 
                {selectedBrand ? `Посты: ${selectedBrand.name}` : 'Все посты'}
              </h2>
              {selectedBrandId && (
                <button 
                  onClick={() => onCreatePost(selectedBrandId)}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                  <Plus size={12} /> Новый пост
                </button>
              )}
            </div>

            {!selectedBrandId && brands.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <ChevronRight size={32} className="mx-auto text-slate-300 mb-3 rotate-180" />
                <div className="text-sm font-medium text-slate-500">Выбери бренд слева</div>
                <div className="text-xs text-slate-400 mt-1">чтобы увидеть посты</div>
              </div>
            ) : filteredPosts.length === 0 && selectedBrandId ? (
              <button
                onClick={() => onCreatePost(selectedBrandId)}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all"
              >
                <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                <div className="text-sm font-medium text-slate-500">Нет постов</div>
                <div className="text-xs text-slate-400 mt-1">Создай первый пост для этого бренда</div>
              </button>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPosts.map(post => {
                  const status = statusConfig[post.status];
                  const StatusIcon = status.icon;
                  const preview = post.text?.replace(/<[^>]+>/g, '').slice(0, 100) || post.point || 'Пустой черновик';
                  const brand = brands.find(b => b.id === post.brandId);
                  
                  return (
                    <div
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${status.bg} ${status.color} flex items-center justify-center shrink-0`}>
                          <StatusIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 line-clamp-2">{preview}</div>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                            <span className={`${status.color} font-medium`}>{status.label}</span>
                            <span>·</span>
                            <span>{new Date(post.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                            {!selectedBrandId && brand && (
                              <>
                                <span>·</span>
                                <span className="truncate">{brand.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
