import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { CommandPalette } from '../components/CommandPalette';
import { OnboardingTour } from '../components/OnboardingTour';
import { AIAssistant } from '../components/AIAssistant';
import { NexusVoice } from '../components/NexusVoice';
import { useAuth } from '../context/AuthContext';
import { Menu, Lock, AlertTriangle, LogOut } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser, currentOrganization, logout, loading } = useAuth();
  
  // License Warning Logic
  const [showLicenseWarning, setShowLicenseWarning] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
      if (currentOrganization?.licenseExpiresAt) {
          const today = new Date();
          const expireDate = new Date(currentOrganization.licenseExpiresAt);
          const diffTime = expireDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays);
          if (diffDays <= 5 && diffDays >= 0) {
              setShowLicenseWarning(true);
          }
      }
  }, [currentOrganization]);

  // Blocking Screen for Expired License
  if (!loading && currentUser && daysRemaining !== null && daysRemaining < 0) {
      return (
          <div className="fixed inset-0 z-[9000] bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-red-600 rounded-full p-6 mb-6 shadow-2xl shadow-red-500/20 animate-pulse-slow">
                  <Lock size={64} className="text-white"/>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Acesso Bloqueado</h1>
              <p className="text-slate-300 text-center max-w-md mb-8">
                  A licença de uso da organização <strong>{currentOrganization?.name}</strong> expirou. 
                  Entre em contato com o administrador do sistema para regularizar o acesso.
              </p>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center w-full max-w-sm">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Empresa</p>
                  <p className="text-white font-bold text-lg mb-4">{currentOrganization?.name}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Vencimento</p>
                  <p className="text-red-400 font-mono font-bold">
                      {currentOrganization?.licenseExpiresAt ? new Date(currentOrganization.licenseExpiresAt).toLocaleDateString() : 'N/A'}
                  </p>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                  <button onClick={() => window.location.reload()} className="text-slate-500 hover:text-white text-sm underline">Tentar novamente</button>
                  <button onClick={logout} className="flex items-center gap-2 text-white bg-slate-800 px-6 py-2 rounded-lg hover:bg-slate-700 transition font-medium border border-slate-700"><LogOut size={16}/> Sair / Trocar Conta</button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden relative z-0 animate-fade-in text-slate-900 dark:text-slate-100">
      <CommandPalette />
      <OnboardingTour />
      <AIAssistant />
      <NexusVoice />
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative w-full transition-colors duration-300">
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 z-10">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded"><Menu size={24} /></button>
            <span className="font-bold text-lg">Nexus CRM</span>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">{currentUser?.avatar}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full pb-24 md:pb-0 scroll-smooth">
            <Outlet />
        </div>
      </main>

      {showLicenseWarning && (
          <div className="fixed inset-0 z-[8000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border-t-8 border-amber-500">
                  <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                          <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full text-amber-600 dark:text-amber-400 shrink-0"><AlertTriangle size={32} /></div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Atenção: Licença Expirando</h2>
                              <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm leading-relaxed">Sua licença expira em <strong className="text-amber-600 dark:text-amber-400">{daysRemaining} dias</strong>.</p>
                              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">Após esta data, o acesso será bloqueado.</p>
                          </div>
                      </div>
                      <button onClick={() => setShowLicenseWarning(false)} className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition">Estou ciente</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};