import React from 'react';
import { FileText, Plus, Clock, Check, Archive } from 'lucide-react';
import { PostProject } from '../../types';

interface PostsListProps {
  posts: PostProject[];
  selectedPostId: string | null;
  onSelect: (post: PostProject) => void;
  onCreateNew: () => void;
  loading?: boolean;
}

const statusIcons = {
  draft: <Clock size={12} className="text-amber-500" />,
  published: <Check size={12} className="text-emerald-500" />,
  archived: <Archive size={12} className="text-slate-400" />
};

const statusLabels = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив'
};

export const PostsList: React.FC<PostsListProps> = ({
  posts,
  selectedPostId,
  onSelect,
  onCreateNew,
  loading
}) => {
  const drafts = posts.filter(p => p.status === 'draft');
  const published = posts.filter(p => p.status === 'published');

  const renderPost = (post: PostProject) => {
    const preview = post.text?.replace(/<[^>]+>/g, '').slice(0, 60) || post.point || 'Пустой черновик';
    const isSelected = post.id === selectedPostId;
    
    return (
      <button
        key={post.id}
        onClick={() => onSelect(post)}
        className={`w-full p-3 text-left rounded-xl transition-all ${
          isSelected 
            ? 'bg-violet-100 border-violet-300 ring-2 ring-violet-200' 
            : 'bg-white border-slate-200 hover:border-violet-200 hover:bg-violet-50/50'
        } border`}
      >
        <div className="flex items-start gap-2">
          <FileText size={14} className={isSelected ? 'text-violet-600' : 'text-slate-400'} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-900 truncate">{preview}</div>
            <div className="flex items-center gap-1.5 mt-1">
              {statusIcons[post.status]}
              <span className="text-[10px] text-slate-500">{statusLabels[post.status]}</span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="text-[10px] text-slate-400">
                {new Date(post.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* New Post Button */}
      <button
        onClick={onCreateNew}
        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Новый пост
      </button>

      {loading ? (
        <div className="text-center text-xs text-slate-400 py-4">Загрузка...</div>
      ) : (
        <>
          {/* Drafts */}
          {drafts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Черновики ({drafts.length})</h4>
              {drafts.map(renderPost)}
            </div>
          )}

          {/* Published */}
          {published.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Опубликованные ({published.length})</h4>
              {published.slice(0, 3).map(renderPost)}
            </div>
          )}

          {posts.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-4">
              Нет постов. Создайте первый!
            </div>
          )}
        </>
      )}
    </div>
  );
};
