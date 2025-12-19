
import React, { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
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

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state and props to resolve TS errors regarding missing properties on type 'ErrorBoundary'
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    // Fix: Accessing state which is now explicitly declared above
    if (this.state.hasError) {
      return (
        <div style={{padding: 20, fontFamily: 'sans-serif', backgroundColor: '#fef2f2', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h1 style={{color: '#991b1b'}}>Algo deu errado</h1>
          <p style={{color: '#7f1d1d', maxWidth: 600, textAlign: 'center'}}>Ocorreu um erro inesperado na aplicação. Tente recarregar a página.</p>
          <pre style={{backgroundColor: '#fff', padding: 15, borderRadius: 8, overflow: 'auto', maxWidth: '80%', fontSize: 12, border: '1px solid #fca5a5'}}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{marginTop: 20, padding: '10px 20px', backgroundColor: '#b91c1c', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold'}}
          >
            Limpar Cache e Recarregar
          </button>
        </div>
      );
    }

    // Fix: Accessing props which is now explicitly declared above
    return this.props.children || null; 
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

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
