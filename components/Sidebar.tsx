
import React, { useState } from 'react';
import { LayoutDashboard, Users, LifeBuoy, Code, DollarSign, PieChart, Settings, LogOut, Briefcase, X, HeartPulse, FileText, ShieldAlert, RefreshCw, Calendar as CalendarIcon, Megaphone, Workflow, Map, Trello, Moon, Sun, Target, Sword, Wrench, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getSupabaseConfig } from '../services/supabaseClient';
import { GamificationWidget } from './GamificationWidget';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: string;
  onNavigate: (module: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'inbox', label: 'Inbox Unificado', icon: MessageSquare }, // NEW ITEM
  { id: 'prospecting', label: 'Prospecção IA', icon: Target },
  { id: 'competitive-intelligence', label: 'Nexus Spy (CI)', icon: Sword },
  { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
  { id: 'marketing', label: 'Marketing Hub', icon: Megaphone },
  { id: 'commercial', label: 'Comercial', icon: Users },
  { id: 'proposals', label: 'Propostas', icon: FileText },
  { id: 'operations', label: 'Produção / Instalação', icon: Wrench }, 
  { id: 'clients', label: 'Carteira de Clientes', icon: Briefcase },
  { id: 'geo-intelligence', label: 'Mapa Inteligente', icon: Map },
  { id: 'projects', label: 'Gestão de Projetos', icon: Trello },
  { id: 'customer-success', label: 'Sucesso do Cliente', icon: HeartPulse },
  { id: 'retention', label: 'Retenção', icon: ShieldAlert },
  { id: 'automation', label: 'Nexus Flow', icon: Workflow }, 
  { id: 'finance', label: 'Financeiro', icon: DollarSign }, 
  { id: 'support', label: 'Suporte', icon: LifeBuoy },
  { id: 'dev', label: 'Desenvolvimento', icon: Code },
  { id: 'reports', label: 'Relatórios', icon: PieChart },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeModule, onNavigate }) => {
  const { currentUser, hasPermission, logout } = useAuth();
  const { isSyncing, refreshData, lastSyncTime, theme, toggleTheme } = useData();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const { url } = getSupabaseConfig();
  const hasCredentials = !!url;

  const handleLogoutClick = () => {
      setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
      logout();
      setIsLogoutModalOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 flex flex-col h-[100dvh] shadow-2xl transition-transform duration-300 ease-in-out border-r border-slate-800/50
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Logo */}
        <div className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <span className="font-black text-lg">N</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Nexus CRM</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        {/* User Profile Compact */}
        <div className="p-4 shrink-0">
           <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition group cursor-default">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 border-2 border-slate-600 group-hover:border-blue-500 transition-colors overflow-hidden">
                  {currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http')) ? (
                      <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                      <span>{currentUser?.avatar || 'U'}</span>
                  )}
              </div>
              <div className="overflow-hidden flex-1">
                  <p className="text-sm font-semibold text-white truncate">{currentUser?.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${hasCredentials ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide truncate">{currentUser?.role}</p>
                  </div>
              </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar pb-4">
          <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menu Principal</p>
          {navItems.map((item) => {
            // Permission check logic
            if (item.id !== 'dashboard' && item.id !== 'calendar' && item.id !== 'inbox' && item.id !== 'prospecting' && item.id !== 'competitive-intelligence' && !hasPermission(item.id)) return null;
            
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                    <span className="text-sm font-medium">{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="px-3 pt-2 pb-0 bg-slate-900 border-t border-slate-800/50 shrink-0">
           <GamificationWidget />

           <div className="space-y-1 mt-2 mb-2">
                <button 
                    onClick={() => { onNavigate('settings'); onClose(); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeModule === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                    <Settings size={18} /> Configurações
                </button>
                
                <button 
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg text-sm font-medium transition-colors"
                >
                    {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </button>

                <button 
                    type="button"
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                >
                    <LogOut size={18} /> Sair
                </button>
           </div>
        </div>

        {/* Minimal Status Bar (Footer) */}
        <div className="h-8 bg-black/30 border-t border-black/20 flex items-center justify-between px-4 text-[10px] text-slate-500 select-none shrink-0">
            <div className="flex items-center gap-2">
                {isSyncing ? (
                    <span className="flex items-center gap-1.5 text-blue-400">
                        <RefreshCw size={10} className="animate-spin"/> Sincronizando...
                    </span>
                ) : hasCredentials ? (
                    <span className="flex items-center gap-1.5 text-emerald-500/80" title="Conectado ao Supabase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Online
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-slate-500" title="Modo Offline / Local">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Offline
                    </span>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <span className="opacity-50">
                    {lastSyncTime ? lastSyncTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                </span>
                <button 
                    onClick={() => refreshData()}
                    disabled={isSyncing}
                    className="hover:text-white transition disabled:opacity-30"
                    title="Forçar Sincronização"
                >
                    <RefreshCw size={10}/>
                </button>
            </div>
        </div>
      </div>

      {/* CONFIRM LOGOUT MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border-t-4 border-slate-900 dark:border-slate-600">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogOut size={32} className="text-red-600 dark:text-red-400 ml-1" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Deseja realmente sair?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Você será desconectado do sistema e redirecionado para a tela de login.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsLogoutModalOpen(false)}
                            className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            Não, voltar
                        </button>
                        <button 
                            onClick={confirmLogout}
                            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition shadow-lg shadow-red-500/20"
                        >
                            Sim, sair
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};
