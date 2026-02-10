import React from 'react';
import { Loader2 } from 'lucide-react';
import { PipelineState } from '../../types';

export const GenerationLoading: React.FC<{ state: PipelineState }> = ({ state }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-12">
      <div className="relative">
        <div className="absolute inset-0 bg-violet-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
        <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center relative z-10 border border-slate-100">
          <Loader2 size={40} className="text-violet-600 animate-spin" />
        </div>
      </div>
      
      <div className="text-center space-y-2 max-w-sm">
        <h3 className="text-xl font-bold text-slate-900">Creating Content</h3>
        <p className="text-slate-500 font-medium animate-pulse">{state.stage === 'idle' ? 'Initializing...' : state.stage === 'generating_content' ? 'Constructing narrative...' : state.stage === 'polishing' ? 'Applying finishing touches...' : 'Validating output...'}</p>
      </div>

      <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div 
          className="h-full bg-violet-600 transition-all duration-500 ease-out"
          style={{ width: `${state.progress}%` }}
        ></div>
      </div>
    </div>
  );
};
