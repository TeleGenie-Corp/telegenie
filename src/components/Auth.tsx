import React, { useState } from 'react';
import { auth, googleProvider } from '../../services/firebaseConfig';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Loader2, Mail, Lock, ArrowRight, Chrome } from 'lucide-react';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let result;
      if (isLogin) {
        result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        result = await createUserWithEmailAndPassword(auth, email, password);
      }
      onLogin(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
          {isLogin ? 'Welcome Back' : 'Join Studio'}
        </h2>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {isLogin ? 'Sign in to continue' : 'Create your account'}
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-slate-200 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 hover:border-violet-200 hover:text-violet-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Chrome size={20} />}
          <span className="text-sm uppercase tracking-wider">Continue with Google</span>
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-300 font-black uppercase tracking-widest">Or</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl focus:border-violet-500 outline-none transition-all font-medium text-slate-700 text-sm placeholder:text-slate-400"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl focus:border-violet-500 outline-none transition-all font-medium text-slate-700 text-sm placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-violet-600 active:scale-95 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-violet-600 transition-colors"
        >
          {isLogin ? 'Don\'t have an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};
