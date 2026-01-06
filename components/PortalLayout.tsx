
import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  LayoutDashboard, 
  DollarSign, 
  LifeBuoy, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  User,
  Settings,
  ChevronRight,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { ClientPortalTour } from './ClientPortalTour';

interface PortalLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onNavigate: (module: string) => void;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, activeModule, onNavigate }) => {
  const { currentUser, logout, currentOrganization } = useAuth();
  const { portalSettings, notifications, clients, markNotificationRead } = useData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'portal-dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'portal-financial', label: 'Financeiro', icon: DollarSign },
    { id: 'portal-solutions', label: 'Soluções', icon: ShoppingBag }, // Nova Aba
    { id: 'portal-proposals', label: 'Contratos', icon: FileText },
    { id: 'portal-tickets', label: 'Suporte', icon: LifeBuoy },
  ];

  const handleNavClick = (moduleId: string) => {
    onNavigate(moduleId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col md:flex-row">
      <ClientPortalTour />
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">S</div>
            <span className="font-bold text-slate-900">Portal Softpark</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
        </button>
      </header>

      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex flex-col w-72 bg-slate-900 text-white sticky top-0 h-screen transition-all duration-300`}>
        <div className="p-8">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="font-black text-xl">S</span>
                </div>
                <div>
                    <h1 className="font-black text-lg tracking-tighter uppercase leading-none">Softpark</h1>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Enterprise Portal</span>
                </div>
            </div>

            <nav className="space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                                isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon size={20} />
                            {item.label}
                            {isActive && <ChevronRight size={16} className="ml-auto" />}
                        </button>
                    );
                })}
            </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
            <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {currentUser?.avatar || 'U'}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-black truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{currentUser?.email}</p>
                </div>
            </div>
            <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 text-sm font-bold transition-colors">
                <LogOut size={18} /> Sair do Portal
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50 relative custom-scrollbar">
        <header className="hidden md:flex h-20 bg-white/80 backdrop-blur-md border-b px-10 items-center justify-between sticky top-0 z-40">
            <h2 className="font-bold text-slate-800 uppercase tracking-widest text-xs">
                {navItems.find(i => i.id === activeModule)?.label || 'Painel'}
            </h2>
            <div className="flex items-center gap-6">
                <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <Bell size={20} />
                </button>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="text-right">
                    <p className="text-xs font-black text-slate-900 uppercase">Status do Sistema</p>
                    <p className="text-[10px] text-emerald-500 font-bold flex items-center justify-end gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> OPERACIONAL
                    </p>
                </div>
            </div>
        </header>

        <div className="p-6 md:p-10 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
        </div>
      </main>

      {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-slate-900 z-[60] p-6 flex flex-col text-white animate-fade-in">
              <div className="flex justify-between items-center mb-10">
                  <span className="font-black text-xl uppercase tracking-tighter">Menu</span>
                  <button onClick={() => setIsMobileMenuOpen(false)}><X size={32}/></button>
              </div>
              <div className="space-y-4">
                  {navItems.map(item => (
                      <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full p-5 rounded-2xl flex items-center gap-4 text-lg font-bold ${activeModule === item.id ? 'bg-indigo-600' : 'bg-white/5'}`}>
                          <item.icon size={24}/> {item.label}
                      </button>
                  ))}
                  <button onClick={logout} className="w-full p-5 rounded-2xl flex items-center gap-4 text-red-400 font-bold bg-red-500/10 mt-10">
                      <LogOut size={24}/> Sair
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
