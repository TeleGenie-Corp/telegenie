import React, { useState } from 'react';
import { auth, googleProvider } from '../../services/firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { Loader2, Chrome } from 'lucide-react';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
          Добро пожаловать
        </h2>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Войдите для продолжения
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-slate-200 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 hover:border-violet-200 hover:text-violet-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Chrome size={20} />}
          <span className="text-sm uppercase tracking-wider">Войти через Google</span>
        </button>

        {error && (
          <div className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
