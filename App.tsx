
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

// Client Portal Pages
import { ClientDashboard } from './pages/portal/ClientDashboard';
import { ClientFinancial } from './pages/portal/ClientFinancial';
import { ClientProposals } from './pages/portal/ClientProposals';
import { ClientSupport } from './pages/portal/ClientSupport';
import { ClientSolutions } from './pages/portal/ClientSolutions';

const AppContent: React.FC = () => {
  const { currentUser, loading, currentOrganization, logout } = useAuth();
  const [activeModule, setActiveModule] = useState(() => {
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

  if (loading) return <SplashScreen />;
  if (!currentUser) return <Login />;

  const isSuperAdmin = currentUser.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
  const isOrgPending = currentOrganization?.status === 'pending';

  if (isOrgPending && !isSuperAdmin) {
      return (
          <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
              <ShieldAlert size={64} className="text-amber-500 mb-6 animate-pulse"/>
              <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Acesso sob Análise</h2>
              <p className="text-slate-400 mb-8 max-w-md font-medium">Olá {currentUser.name}, o ambiente da <strong>{currentOrganization?.name}</strong> está sendo provisionado e aguarda liberação do administrador Master.</p>
              <div className="flex gap-4">
                  <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-slate-950 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl">Verificar Status</button>
                  <button onClick={logout} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-xs tracking-widest">Sair</button>
              </div>
          </div>
      );
  }

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
    const { currentUser, currentOrganization, hasPermission } = useAuth();
    const { theme } = useData(); 
    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

    if (currentUser?.role === 'client') {
        return (
          <PortalLayout activeModule={activeModule} onNavigate={onNavigate}>
              {activeModule === 'portal-dashboard' && <ClientDashboard onNavigate={onNavigate} />}
              {activeModule === 'portal-financial' && <ClientFinancial />}
              {activeModule === 'portal-solutions' && <ClientSolutions />}
              {activeModule === 'portal-proposals' && <ClientProposals />}
              {activeModule === 'portal-tickets' && <ClientSupport />}
          </PortalLayout>
        );
    }

    // TRAVA DE SEGURANÇA: Verifica se o usuário tem permissão para o módulo ativo
    // O Dashboard agora é livre, a restrição de dados acontece dentro do componente
    const isDashboard = activeModule === 'dashboard';
    const hasAccess = isDashboard || hasPermission(activeModule, 'view');

    const renderContent = () => {
        if (!hasAccess) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6 text-red-500">
                        <Lock size={40}/>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Acesso Restrito</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">Seu cargo ({currentUser?.role}) não possui autorização para acessar este módulo. Entre em contato com o administrador.</p>
                    <button 
                        onClick={() => onNavigate('dashboard')}
                        className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 uppercase text-xs tracking-widest"
                    >
                        Voltar ao Dashboard
                    </button>
                </div>
            );
        }

        switch (activeModule) {
            case 'dashboard': return <Dashboard onNavigate={onNavigate} />;
            case 'contact-center': return <Dashboard onNavigate={onNavigate} viewMode="contact-center" />;
            case 'commercial': return <Commercial />;
            case 'inbox': return <Inbox />;
            case 'prospecting': return <Prospecting />;
            case 'competitive-intelligence': return <CompetitiveIntelligence />;
            case 'marketing': return <Marketing />;
            case 'clients': return <Clients />;
            case 'finance': return <Finance />;
            case 'support': return <Support />;
            case 'dev': return <Development />;
            case 'reports': return <Reports />;
            case 'settings': return <Settings />;
            case 'customer-success': return <CustomerSuccess />;
            case 'proposals': return <Proposals />;
            case 'retention': return <Retention />;
            case 'calendar': return <Calendar />;
            case 'automation': return <Automation />;
            case 'geo-intelligence': return <GeoIntelligence />;
            case 'projects': return <Projects />;
            case 'operations': return <Operations />;
            default: return <Dashboard onNavigate={onNavigate} />;
        }
    };

    return (
      <div className={`flex h-[100dvh] font-sans overflow-hidden relative z-0 text-slate-900 dark:text-slate-100 ${theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
        <ToastContainer />
        <CommandPalette onNavigate={onNavigate} />
        <OnboardingTour />
        <AIAssistant />
        <NexusVoice />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeModule={activeModule} onNavigate={onNavigate} />
        
        <main className="flex-1 h-full flex flex-col overflow-hidden relative w-full transition-all duration-300">
          <header className="flex w-full h-16 items-center justify-between px-4 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0 z-20">
              <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                  
                  <div className="relative">
                    <button 
                        onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all group shadow-sm"
                    >
                        <Building2 size={16} className="text-indigo-500"/>
                        <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px] md:max-w-xs">
                            {currentOrganization?.name || 'SOFTCASE'}
                        </span>
                        {currentUser?.isGroupManager && <ChevronDown size={14} className={`text-slate-400 group-hover:text-indigo-500 transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`}/>}
                    </button>
                  </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                      <p className="text-xs font-black uppercase tracking-tight">{currentUser?.name}</p>
                      <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">{currentUser?.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black border dark:border-slate-700 text-slate-500 dark:text-slate-300 shadow-inner">
                    {currentUser?.avatar || <UserIcon size={20}/>}
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
