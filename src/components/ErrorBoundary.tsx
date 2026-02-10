import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-rose-500 blur-2xl opacity-15 animate-pulse rounded-full scale-150"></div>
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-xl">
              <AlertCircle size={36} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {this.props.fallbackTitle || 'Что-то пошло не так'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Произошла ошибка в этом разделе. Остальное приложение работает.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 text-left text-xs bg-slate-100 rounded-xl p-4 max-w-md overflow-auto text-rose-600 font-mono">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
          >
            <RefreshCw size={14} />
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
