import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Auth } from './Auth';
import { Sparkles, Moon, Sun } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

// Animation variants
const cubicBezier = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.8, 
      ease: cubicBezier,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: cubicBezier } 
  }
};

interface AuthPageProps {
  onLogin: (user: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const darkMode = useUIStore(s => s.darkMode);
  const toggleDarkMode = useUIStore(s => s.toggleDarkMode);

  // Check if current darkMode state aligns with system preference or local storage
  // Note: user preference is king, stored in local storage
  
  const [isClient, setIsClient] = useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null; // Avoid hydration mismatch for theme toggles

  return (
    <div className={`fixed inset-0 overflow-hidden flex items-center justify-center font-sans transition-colors duration-500 ${!darkMode ? 'bg-slate-50' : 'bg-[#0a0e1a]'}`}>
      
      {/* BACKGROUND LAYERS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Light Mode Gradient */}
           <div className={`absolute inset-0 bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/30 transition-opacity duration-1000 ${darkMode ? 'opacity-0' : 'opacity-100'}`} />
           
           {/* Dark Mode Gradient */}
           <div className={`absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0a0e1a] to-[#1e1b4b] transition-opacity duration-1000 ${darkMode ? 'opacity-100' : 'opacity-0'}`} />
           
           {/* Accent Orbs */}
           <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-3xl transition-opacity duration-1000 ${
               darkMode ? 'bg-violet-900/20' : 'bg-violet-200/40'
           }`} />
           <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl transition-opacity duration-1000 ${
               darkMode ? 'bg-fuchsia-900/20' : 'bg-fuchsia-200/30'
           }`} />
      </div>

      {/* THEME TOGGLE */}
      <div className="absolute top-6 right-6 z-30">
        <button 
          onClick={toggleDarkMode}
          className={`p-3 rounded-full transition-all duration-300 active:scale-95 ${
            darkMode 
              ? 'bg-slate-800/80 text-violet-300 hover:text-white hover:bg-slate-700 backdrop-blur border border-slate-700' 
              : 'bg-white/80 text-slate-500 hover:text-violet-600 hover:bg-white shadow-sm backdrop-blur border border-white'
          }`}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-sm px-4"
      >
        {/* BRAND HEADER */}
        <motion.div variants={itemVariants} className="text-center mb-10 space-y-4">
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-violet-500/30 group cursor-default">
                <Sparkles className="text-white w-8 h-8 relative z-10 transition-transform duration-500 group-hover:rotate-12" strokeWidth={1.5} />
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            </div>
            
            <div className="space-y-1">
                <h1 className={`font-display text-3xl font-black uppercase tracking-tighter transition-colors duration-500 ${
                    darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                TeleGenie <span className={`text-lg font-bold ml-1 transition-colors duration-500 ${
                    darkMode ? 'text-violet-400' : 'text-violet-600'
                }`}>Studio</span>
                </h1>
                <p className={`text-sm font-medium tracking-wide transition-colors duration-500 uppercase ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                    AI-Powered Content Engine
                </p>
            </div>
        </motion.div>

        {/* AUTH CARD */}
        <motion.div 
            variants={itemVariants}
            className={`
                relative overflow-hidden rounded-3xl backdrop-blur-xl border transition-all duration-500 group
                ${darkMode 
                    ? 'bg-slate-900/60 border-slate-700/50 shadow-2xl shadow-black/50 hover:border-slate-600/50' 
                    : 'bg-white/70 border-white/60 shadow-2xl shadow-violet-500/10 hover:border-white/80'
                }
            `}
        >
            <div className="relative z-10 p-6 sm:p-8">
                <Auth onLogin={onLogin} />
            </div>
            
            {/* Subtle Gradient Overlay */}
            <div className={`absolute inset-0 pointer-events-none bg-gradient-to-tr from-violet-500/5 to-fuchsia-500/5 transition-opacity duration-500 ${darkMode ? 'opacity-20' : 'opacity-0'}`} />
        </motion.div>
        
        {/* FOOTER */}
        <motion.p variants={itemVariants} className={`text-center mt-8 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${
            darkMode ? 'text-slate-600' : 'text-slate-400'
        }`}>
            &copy; {new Date().getFullYear()} TeleGenie Systems
        </motion.p>
      </motion.div>
    </div>
  );
};
