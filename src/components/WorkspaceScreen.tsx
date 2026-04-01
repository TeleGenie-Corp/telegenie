import React, { useState, useEffect } from 'react';
import { FileText, Radio, Plus, Clock, Check, Archive, ArrowRight, Settings, Trash2, ChevronRight } from 'lucide-react';
import { Brand, PostProject } from '../../types';

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
  draft:     { icon: Clock,   color: 'text-amber-500',  bg: 'bg-amber-50',  label: 'Черновик' },
  published: { icon: Check,   color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Опубликован' },
  archived:  { icon: Archive, color: 'text-slate-400',  bg: 'bg-slate-50',  label: 'Архив' },
};

export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({
  brands, posts, onSelectPost, onCreatePost, onCreateBrand,
  onEditBrand, onDeleteBrand, onOpenPositioning, loading
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    brands.length === 1 ? brands[0].id : null
  );

  useEffect(() => {
    if (!selectedBrandId && brands.length > 0) setSelectedBrandId(brands[0].id);
  }, [brands]);

  const filteredPosts = selectedBrandId ? posts.filter(p => p.brandId === selectedBrandId) : posts;
  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 font-sans custom-scrollbar">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-black text-slate-900">Рабочее пространство</h1>
          <p className="text-slate-500 text-sm mt-1">Выбери канал и пост для работы</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* === SOURCES COLUMN === */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Radio size={13} /> Источники
              </h2>
              <button onClick={onCreateBrand} className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                <Plus size={12} /> Добавить
              </button>
            </div>

            <div className="space-y-2">
              {brands.map(brand => {
                const analyzed = !!brand.analyzedChannel;
                const pillars  = brand.analyzedChannel?.contentPillars;
                const isSelected = selectedBrandId === brand.id;

                return (
                  <div
                    key={brand.id}
                    onClick={() => setSelectedBrandId(brand.id)}
                    className={`rounded-2xl cursor-pointer transition-all group ${
                      isSelected
                        ? 'bg-white shadow-xl shadow-violet-100/50 ring-4 ring-violet-50'
                        : 'bg-white shadow-sm hover:shadow-lg hover:shadow-violet-50 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Channel header */}
                    <div className="flex items-center gap-3 p-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                        isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600'
                      }`}>
                        {brand.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm truncate ${isSelected ? 'text-violet-900' : 'text-slate-900'}`}>{brand.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{brand.channelUrl}</div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={e => { e.stopPropagation(); onEditBrand(brand); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                          <Settings size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); onDeleteBrand(brand.id); }} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Channel analysis inline */}
                    {isSelected && analyzed && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
                        {(pillars?.length ?? 0) > 0 && (
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Темы</div>
                            <div className="flex flex-wrap gap-1">
                              {pillars!.map(p => (
                                <span key={p} className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-md font-medium">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {brand.analyzedChannel?.toneOfVoice && (
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Стиль</div>
                            <p className="text-[9px] text-slate-600 leading-relaxed line-clamp-3">{brand.analyzedChannel.toneOfVoice}</p>
                          </div>
                        )}
                        {(brand.analyzedChannel?.forbiddenPhrases?.length ?? 0) > 0 && (
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-rose-400 mb-1.5">Избегать</div>
                            <div className="flex flex-wrap gap-1">
                              {brand.analyzedChannel!.forbiddenPhrases!.slice(0, 4).map(p => (
                                <span key={p} className="text-[9px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-md font-medium">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Not yet analyzed */}
                    {isSelected && !analyzed && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-50">
                        <p className="text-[9px] text-slate-400">Стиль будет проанализирован при первой генерации поста</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {brands.length === 0 && (
                <button
                  onClick={onCreateBrand}
                  className="w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all"
                >
                  <Radio size={24} className="mx-auto text-slate-300 mb-2" />
                  <div className="text-sm font-medium text-slate-500">Добавь первый канал</div>
                  <div className="text-xs text-slate-400 mt-1">ИИ изучит стиль и тематику</div>
                </button>
              )}
            </div>
          </div>

          {/* === POSTS COLUMN === */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <FileText size={13} />
                {selectedBrand ? selectedBrand.name : 'Посты'}
              </h2>
              {selectedBrandId && (
                <button
                  onClick={() => onCreatePost(selectedBrandId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  <Plus size={12} /> Новый пост
                </button>
              )}
            </div>

            {!selectedBrandId && brands.length > 0 ? (
              <div className="bg-white shadow-sm rounded-2xl p-8 text-center">
                <ChevronRight size={32} className="mx-auto text-slate-300 mb-3 rotate-180" />
                <div className="text-sm font-medium text-slate-500">Выбери канал слева</div>
                <div className="text-xs text-slate-400 mt-1">чтобы увидеть посты</div>
              </div>
            ) : filteredPosts.length === 0 && selectedBrandId ? (
              <button
                onClick={() => onCreatePost(selectedBrandId)}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-violet-300 hover:bg-violet-50/50 transition-all"
              >
                <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                <div className="text-sm font-medium text-slate-500">Нет постов</div>
                <div className="text-xs text-slate-400 mt-1">Напиши первый пост для этого канала</div>
              </button>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPosts.map(post => {
                  const status = statusConfig[post.status];
                  const StatusIcon = status.icon;
                  const preview = post.text?.replace(/<[^>]+>/g, '').slice(0, 120) || post.point || 'Новый черновик';
                  const brand = brands.find(b => b.id === post.brandId);

                  return (
                    <div
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      className="bg-white shadow-sm rounded-2xl p-4 hover:shadow-lg hover:shadow-violet-100 cursor-pointer transition-all group hover:-translate-y-0.5"
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
                              <><span>·</span><span className="truncate">{brand.name}</span></>
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

        {/* Footer */}
        <div className="mt-12 pb-4 text-center">
          <a href="https://t.me/sphera_spb" target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-400 hover:text-violet-600 font-medium transition-colors">
            При поддержке Сферы
          </a>
        </div>

      </div>
    </div>
  );
};
