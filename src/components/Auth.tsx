import React, { useState } from 'react';
import { auth, googleProvider } from '../../services/firebaseConfig';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  sendSignInLinkToEmail,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { Loader2, Chrome, Mail, Lock, AlertCircle } from 'lucide-react';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [authMethod, setAuthMethod] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { AnalyticsService } = await import('../../services/analyticsService');
      const { getStoredUTM } = await import('./UTMCapture');
      const utm = getStoredUTM();
      const isNew = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      if (isNew) {
        AnalyticsService.trackSignup('google', utm.source);
      } else {
        AnalyticsService.trackLogin('google', utm.source);
      }
      AnalyticsService.trackSessionStart(!isNew, utm.source);
      onLogin(result.user);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (redirErr: any) {
            setError("Не удалось выполнить вход: " + redirErr.message);
            setLoading(false);
        }
      } else {
        setError("Ошибка авторизации: " + err.message);
        setLoading(false);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (authMethod === 'magic') {
        const actionCodeSettings = {
          url: window.location.href,
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        setLinkSent(true);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const { AnalyticsService } = await import('../../services/analyticsService');
        const { getStoredUTM } = await import('./UTMCapture');
        const utm = getStoredUTM();
        AnalyticsService.trackLogin('email_password', utm.source);
        AnalyticsService.trackSessionStart(true, utm.source);
        onLogin(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' 
        ? "Неверный email или пароль" 
        : "Ошибка входа. Попробуйте другой способ.");
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in zoom-in duration-500 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={32} />
        </div>
        <h3 className="text-xl font-black uppercase text-slate-900">Проверьте почту</h3>
        <p className="text-sm text-slate-500 font-medium">
          Мы отправили ссылку для входа на <br/> <span className="text-slate-900 font-bold">{email}</span>
        </p>
        <button onClick={() => setLinkSent(false)} className="text-xs font-bold text-violet-600 hover:text-violet-700 uppercase tracking-widest mt-4">
          Вернуться назад
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-slate-200 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 hover:border-violet-200 hover:text-violet-600 transition-all shadow-sm active:scale-95 disabled:opacity-50 group relative overflow-hidden"
        >
          {loading && !showEmailAuth ? <Loader2 size={20} className="animate-spin" /> : <Chrome size={20} className="text-slate-400 group-hover:text-violet-500 transition-colors" />}
          <span className="text-sm uppercase tracking-wider relative z-10">Войти через Google</span>
        </button>

        {!showEmailAuth ? (
          <button 
            onClick={() => setShowEmailAuth(true)}
            className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-violet-600 transition-colors"
          >
            Другие способы входа
          </button>
        ) : (
          <div className="space-y-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setAuthMethod('magic')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${authMethod === 'magic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Без пароля
              </button>
              <button 
                onClick={() => setAuthMethod('password')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${authMethod === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Через пароль
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                  required
                />
              </div>

              {authMethod === 'password' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Пароль</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : authMethod === 'magic' ? <Mail size={16} /> : <Lock size={16} />}
                <span className="text-xs uppercase tracking-wider">
                  {authMethod === 'magic' ? 'Отправить ссылку' : 'Войти'}
                </span>
              </button>
            </form>

            <button 
              onClick={() => setShowEmailAuth(false)}
              className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
              Отмена
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 text-xs text-rose-600 font-bold bg-rose-50 p-4 rounded-2xl border border-rose-100 mt-4 animate-in shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}
      </div>
    );
  };
