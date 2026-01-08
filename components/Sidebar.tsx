
import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Users, LifeBuoy, Code, DollarSign, PieChart, Settings, 
  LogOut, Briefcase, X, HeartPulse, FileText, ShieldAlert, Calendar as CalendarIcon, 
  Megaphone, Workflow, Map, Trello, Moon, Sun, Target, Sword, Wrench, 
  MessageSquare, Phone, ChevronLeft, ChevronRight, Sparkles, Zap, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { GamificationWidget } from './GamificationWidget';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: string;
  onNavigate: (module: string) => void;
}

interface NavGroup {
  label: string;
  items: { id: string; label: string; icon: any; badge?: number }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeModule, onNavigate }) => {
  const { currentUser, logout } = useAuth();
  const { isSyncing, theme, toggleTheme, tickets = [], leads = [], invoices = [] } = useData();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  const navGroups: NavGroup[] = useMemo(() => [
    {
      label: 'Gestão Comercial',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'contact-center', label: 'Central de Contatos', icon: Phone },
        { id: 'inbox', label: 'Inbox', icon: MessageSquare },
        { id: 'prospecting', label: 'Prospecção', icon: Target },
        { id: 'commercial', label: 'CRM / Leads', icon: Users, badge: (leads || []).filter(l => l && l.status === 'Novo').length },
        { id: 'clients', label: 'Clientes', icon: Briefcase }, 
        { id: 'proposals', label: 'Propostas', icon: FileText },
      ]
    },
    {
      label: 'Operações & Entrega',
      items: [
        { id: 'operations', label: 'Produção', icon: Wrench },
        { id: 'projects', label: 'Projetos', icon: Trello },
        { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
        { id: 'geo-intelligence', label: 'Mapa', icon: Map },
      ]
    },
    {
      label: 'Relacionamento (CS)',
      items: [
        { id: 'customer-success', label: 'Sucesso', icon: HeartPulse },
        { id: 'retention', label: 'Retenção', icon: ShieldAlert },
      ]
    },
    {
      label: 'Backoffice & IA',
      items: [
        { id: 'finance', label: 'Financeiro', icon: DollarSign, badge: (invoices || []).filter(i => i && i.status === 'Atrasado').length },
        { id: 'support', label: 'Suporte', icon: LifeBuoy, badge: (tickets || []).filter(t => t && t.status === 'Aberto').length },
        { id: 'automation', label: 'Soft Flow', icon: Workflow },
        { id: 'marketing', label: 'Marketing', icon: Megaphone },
        { id: 'competitive-intelligence', label: 'Nexus Spy', icon: Sword },
      ]
    },
    {
      label: 'Inteligência',
      items: [
        { id: 'reports', label: 'Relatórios', icon: PieChart },
        { id: 'dev', label: 'Desenvolvimento', icon: Code },
      ]
    }
  ], [leads, invoices, tickets]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={onClose} />
      )}

      <div 
        className={`
          fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col h-[100dvh] 
          shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-slate-800/50
          md:relative md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-20' : 'w-72'}
        `}
      >
        <div className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-slate-800/40 bg-slate-950/20 backdrop-blur-md">
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 md:hidden' : 'opacity-100'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
              <span className="font-black text-lg">S</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap">SOFT-CRM</span>
          </div>
          
          <button 
            onClick={toggleCollapse}
            className="hidden md:flex p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
          >
            {isCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
          </button>

          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <p className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] animate-fade-in">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button 
                    key={item.id} 
                    onClick={() => { onNavigate(item.id); onClose(); }} 
                    title={isCollapsed ? item.label : ''}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                      ${isActive 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                        <Icon size={20} className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                        {!isCollapsed && <span className="text-sm font-bold whitespace-nowrap">{item.label}</span>}
                    </div>
                    
                    {isActive && !isCollapsed && <Zap size={12} fill="currentColor" className="text-indigo-200 animate-pulse" />}
                    
                    {item.badge && item.badge > 0 && !isActive && (
                      <span className={`
                        flex items-center justify-center rounded-full font-black text-[9px]
                        ${isCollapsed ? 'absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white border-2 border-slate-900' : 'px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30'}
                      `}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 bg-slate-950/40 border-t border-slate-800/50 shrink-0">
           {!isCollapsed && <GamificationWidget />}
           
           <div className="mt-4 space-y-1">
                <button 
                  onClick={() => { onNavigate('settings'); onClose(); }} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeModule === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}`}
                  title={isCollapsed ? "Configurações" : ""}
                >
                  <Settings size={20} className="shrink-0" /> {!isCollapsed && "Configurações"}
                </button>
                
                <button 
                  onClick={toggleTheme} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-xl text-sm font-bold transition-all"
                  title={isCollapsed ? (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro') : ""}
                >
                  {theme === 'dark' ? <Sun size={20} className="shrink-0"/> : <Moon size={20} className="shrink-0"/>} {!isCollapsed && (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro')}
                </button>
                
                <button 
                  onClick={() => setIsLogoutModalOpen(true)} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all"
                  title={isCollapsed ? "Sair" : ""}
                >
                  <LogOut size={20} className="shrink-0" /> {!isCollapsed && "Sair"}
                </button>
           </div>

           {!isCollapsed && currentUser && (
             <div className="mt-4 p-3 bg-slate-800/30 rounded-2xl border border-slate-700/30 flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-lg border border-indigo-400/30 shrink-0">
                  {currentUser.avatar || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">{currentUser.name}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{currentUser.role}</p>
                </div>
             </div>
           )}
        </div>

        <div className="h-10 bg-black/40 border-t border-white/5 flex items-center justify-between px-4 text-[9px] text-slate-600 select-none shrink-0">
            <div className="flex items-center gap-2">
                {isSyncing ? (
                  <RefreshCw size={10} className="animate-spin text-indigo-400"/>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                )}
                {!isCollapsed && <span>{isSyncing ? 'SYNC' : 'CLOUD'}</span>}
            </div>
            {!isCollapsed && <span>V46.6</span>}
        </div>
      </div>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <LogOut size={40} className="text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Sair do Sistema?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Sua sessão será encerrada e seus dados locais sincronizados.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancelar</button>
                        <button onClick={async () => { setIsLogoutModalOpen(false); await logout(); }} className="flex-[1.5] py-4 rounded-2xl bg-slate-900 dark:bg-red-600 text-white font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition shadow-xl">Confirmar Saída</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};
