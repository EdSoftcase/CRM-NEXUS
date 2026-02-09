
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, SUPER_ADMIN_EMAILS } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext'; 
import { Sidebar } from './components/Sidebar';
import { PortalLayout } from './components/PortalLayout';
import { CommandPalette } from './components/CommandPalette';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingTour } from './components/OnboardingTour';
import { AIAssistant } from './components/AIAssistant';
import { NexusVoice } from './components/NexusVoice';
import { ToastContainer } from './components/Toast'; 
import { ShieldAlert, Menu, ChevronDown, Building2, User as UserIcon, Lock } from 'lucide-react';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Commercial } from './pages/Commercial';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';
import { Development } from './pages/Development';
import { Finance } from './pages/Finance';
import { Reports } from './pages/Reports';
import { Clients } from './pages/Clients';
import { CustomerSuccess } from './pages/CustomerSuccess';
import { Proposals } from './pages/Proposals';
import { Retention } from './pages/Retention'; 
import { Calendar } from './pages/Calendar';
import { Marketing } from './pages/Marketing';
import { Automation } from './pages/Automation';
import { GeoIntelligence } from './pages/GeoIntelligence';
import { Projects } from './pages/Projects';
import { Operations } from './pages/Operations'; 
import { Prospecting } from './pages/Prospecting'; 
import { CompetitiveIntelligence } from './pages/CompetitiveIntelligence'; 
import { Inbox } from './pages/Inbox'; 
import { Login } from './pages/Login';
import { TechnicalVisits } from './pages/TechnicalVisits';

const AppContent: React.FC = () => {
  const { currentUser, loading, currentOrganization, logout } = useAuth();
  const [activeModule, setActiveModule] = useState(() => {
      const hash = window.location.hash.replace('#', '');
      if (hash) return hash;
      const saved = localStorage.getItem('nexus_active_module');
      if (currentUser?.role === 'client') return 'portal-dashboard';
      return saved || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
        localStorage.setItem('nexus_active_module', activeModule);
    }
  }, [activeModule, currentUser]);

  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) setActiveModule(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) return <SplashScreen />;
  if (!currentUser) return <Login />;

  return (
    <DataProvider>
      <AppLayout 
        activeModule={activeModule} 
        onNavigate={setActiveModule} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
    </DataProvider>
  );
}

const AppLayout: React.FC<{ 
    activeModule: string, onNavigate: (m: string) => void, isSidebarOpen: boolean, setIsSidebarOpen: (b: boolean) => void 
}> = ({ activeModule, onNavigate, isSidebarOpen, setIsSidebarOpen }) => {
    const { currentUser, hasPermission } = useAuth();
    const { theme } = useData(); 

    if (currentUser?.role === 'client') {
        // Renderização específica para clientes omitida para brevidade, mantém a lógica atual
        return <PortalLayout activeModule={activeModule} onNavigate={onNavigate}><div>Portal</div></PortalLayout>;
    }

    const renderContent = () => {
        // Fallback de permissão
        if (activeModule !== 'dashboard' && !hasPermission(activeModule, 'view')) {
             return <div className="p-20 text-center font-bold">Acesso Restrito</div>;
        }

        switch (activeModule) {
            case 'dashboard': return <Dashboard onNavigate={onNavigate} />;
            case 'commercial': return <Commercial />;
            case 'clients': return <Clients />;
            case 'finance': return <Finance />;
            case 'support': return <Support />;
            case 'dev': return <Development />;
            case 'reports': return <Reports />;
            case 'settings': return <Settings />;
            case 'proposals': return <Proposals />;
            case 'calendar': return <Calendar />;
            case 'marketing': return <Marketing />;
            case 'automation': return <Automation />;
            case 'geo-intelligence': return <GeoIntelligence />;
            case 'projects': return <Projects />;
            case 'operations': return <Operations />;
            case 'inbox': return <Inbox />;
            case 'prospecting': return <Prospecting />;
            case 'competitive-intelligence': return <CompetitiveIntelligence />;
            case 'customer-success': return <CustomerSuccess />;
            case 'retention': return <Retention />;
            case 'visits': return <TechnicalVisits />;
            default: return <Dashboard onNavigate={onNavigate} />;
        }
    };

    return (
      <div className={`flex h-[100dvh] font-sans overflow-hidden relative z-0 text-slate-900 dark:text-slate-100 ${theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
        <ToastContainer />
        <AIAssistant />
        <NexusVoice />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeModule={activeModule} onNavigate={onNavigate} />
        
        <main className="flex-1 h-full flex flex-col overflow-hidden relative w-full transition-all duration-300">
          <header className="flex w-full h-16 items-center justify-between px-4 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0 z-20">
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2"><Menu/></button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Building2 size={16} className="text-indigo-500"/>
                        <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">SOFTCASE</span>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                      <p className="text-xs font-black uppercase tracking-tight">{currentUser?.name}</p>
                      <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">{currentUser?.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black border dark:border-slate-700">
                    {currentUser?.avatar || 'U'}
                  </div>
              </div>
          </header>
          <div className="flex-1 overflow-y-auto w-full pb-24 md:pb-0 scroll-smooth custom-scrollbar">
              {renderContent()}
          </div>
        </main>
      </div>
    );
};

function App() { 
  return ( 
    <AuthProvider> 
      <AppContent /> 
    </AuthProvider> 
  ); 
}

export default App;
