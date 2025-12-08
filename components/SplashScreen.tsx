import React from 'react';
import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  isFadingOut?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isFadingOut }) => {
  return (
    <div className={`fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden transition-opacity duration-1000 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Background Decorativo - Círculos sutis */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Animation */}
        <div className="mb-8 animate-scale-in flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4">
                <span className="text-5xl font-black text-white tracking-tighter">N</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Nexus CRM
            </h1>
        </div>

        {/* Welcome Text with Delay */}
        <div className="text-center space-y-4 animate-fade-in opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.5s' }}>
            <p className="text-lg md:text-xl text-blue-200 font-medium tracking-wide">
                Bem-vindo de volta ao CRM Nexus
            </p>
            
            {/* Loading Indicator */}
            <div className="flex justify-center mt-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
        </div>
      </div>

      {/* Footer Version */}
      <div className="absolute bottom-8 text-slate-600 text-xs font-mono animate-fade-in" style={{ animationDelay: '1s' }}>
          Carregando ambiente seguro...
      </div>
    </div>
  );
};