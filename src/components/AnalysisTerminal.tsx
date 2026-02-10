import React, { useState, useEffect } from 'react';

export const AnalysisTerminal: React.FC<{ analyzing: boolean }> = ({ analyzing }) => {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    if (!analyzing) { setLogs([]); return; }
    const steps = [
      "Connecting to Telegram Gateway...",
      "Resolving channel DNS...",
      "Extracting public metadata...",
      "Analyzing Tone of Voice...",
      "Identifying topics...",
      "Calibrating model...",
      "Finalizing strategy..."
    ];
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < steps.length) {
        setLogs(prev => [...prev, steps[currentIndex]]);
        currentIndex++;
      }
    }, 800);
    return () => clearInterval(interval);
  }, [analyzing]);

  if (!analyzing && logs.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-xl p-3 font-mono text-[9px] text-green-400 border border-slate-800 shadow-inner mt-4 h-32 overflow-y-auto custom-scrollbar">
      {logs.map((log, i) => (
        <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300 mb-1">
          <span className="opacity-50 mr-2">{new Date().toLocaleTimeString().split(' ')[0]}</span>
          <span className="text-violet-400 mr-2">{'>'}</span>
          {log}
        </div>
      ))}
      {analyzing && (
        <div className="mt-1 animate-pulse">
           <span className="text-violet-400 mr-2">{'>'}</span>
           <span className="w-2 h-4 bg-green-400 inline-block align-middle"></span>
        </div>
      )}
    </div>
  );
};
