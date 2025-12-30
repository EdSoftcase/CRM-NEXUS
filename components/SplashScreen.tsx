
import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface SplashScreenProps {
  isFadingOut?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isFadingOut }) => {
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    // Se demorar mais de 4 segundos, mostra o botão de escape
    const timer = setTimeout(() => setShowEscape(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden transition-opacity duration-1000 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-8 animate-scale-in flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4">
                <span className="text-5xl font-black text-white tracking-tighter">S</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                SOFT-CRM
            </h1>
        </div>

        <div className="text-center space-y-4">
            <p className="text-lg text-blue-200 font-medium tracking-wide">
                Carregando ambiente seguro...
            </p>
            
            <div className="flex justify-center mt-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>

            {showEscape && (
                <div className="mt-12 animate-fade-in flex flex-col items-center gap-4">
                    <p className="text-xs text-slate-500 max-w-xs">O banco de dados está demorando para responder.</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2"
                    >
                        <AlertCircle size={14}/> Forçar Recarregamento
                    </button>
                    <button 
                        onClick={() => { localStorage.clear(); window.location.reload(); }}
                        className="text-slate-600 hover:text-red-400 text-[10px] uppercase font-black tracking-widest"
                    >
                        Limpar Cache de Sessão
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
