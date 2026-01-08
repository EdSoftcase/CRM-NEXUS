import React, { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Fix: Use React.Component with explicit generic types <ErrorBoundaryProps, ErrorBoundaryState> to fix Property 'props' and 'state' not found errors.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state and props properties to resolve Property 'state' and 'props' does not exist on type 'ErrorBoundary' errors.
  state: ErrorBoundaryState;
  props: ErrorBoundaryProps;

  // Fix: Explicitly initialize state property to resolve Property 'state' does not exist on type 'ErrorBoundary' errors.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Soft-CRM Error:", error, errorInfo);
  }

  render() {
    // Fix: Access state via this.state correctly after ensuring inheritance is typed.
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mb-6 border border-red-500/50">
             <span className="text-red-500 font-black text-4xl">!</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Erro de Inicialização</h1>
          <p className="text-slate-400 max-w-md text-sm mb-8">O sistema encontrou uma falha ao carregar os módulos. Tente limpar o cache.</p>
          <div className="flex gap-3">
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">Recarregar</button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-6 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Limpar Cache</button>
          </div>
        </div>
      );
    }
    // Fix: Access children from typed this.props.
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
