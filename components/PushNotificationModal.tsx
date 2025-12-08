

import React from 'react';
import { BellRing, X, CheckCircle } from 'lucide-react';

interface PushNotificationModalProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({ onEnable, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in relative border border-slate-200 dark:border-slate-700">
        
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-10"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>

        <button 
          onClick={onDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 pt-10 text-center relative z-0">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20 animate-pulse-slow">
            <BellRing size={40} />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Não perca nenhum negócio!
          </h2>
          
          <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Ative as notificações para receber alertas em tempo real sobre novos leads, tarefas urgentes e vendas fechadas pela sua equipe.
          </p>

          <div className="space-y-3">
            <button 
              onClick={onEnable}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} /> Ativar Notificações
            </button>
            
            <button 
              onClick={onDismiss}
              className="w-full bg-transparent text-slate-500 dark:text-slate-400 font-medium py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Agora não
            </button>
          </div>
          
          <p className="text-[10px] text-slate-400 mt-6">
            Você pode alterar isso a qualquer momento nas Configurações.
          </p>
        </div>
      </div>
    </div>
  );
};