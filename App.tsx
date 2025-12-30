
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
import { Badge } from './components/Widgets';
import { LogOut, ShieldAlert, Clock, Menu } from 'lucide-react';

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

const AppContent: React.FC = () => {
  const { currentUser, loading, currentOrganization, logout } = useAuth();
  const [activeModule, setActiveModule] = useState(() => localStorage.getItem('nexus_active_module') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // DISJUNTOR LOCAL: Garante saída da Splash após 7s não importa o que aconteça
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('nexus_active_module', activeModule);
  }, [activeModule]);

  if (loading && !forceReady) return <SplashScreen isFadingOut={false} />;
  if (!currentUser) return <Login />;

  const userEmail = currentUser.email?.toLowerCase().trim();
  const isSuperAdmin = userEmail && SUPER_ADMIN_EMAILS.includes(userEmail);
  const isOrgPending = currentOrganization?.status === 'pending';

  if (isOrgPending && !isSuperAdmin) {
      return (
          <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
              <ShieldAlert size={64} className="text-indigo-500 mb-6"/>
              <h2 className="text-2xl font-black mb-4">Acesso sob Análise</h2>
              <p className="text-slate-400 mb-8 max-w-md">Olá {currentUser.name}, seu ambiente aguarda liberação do administrador Master.</p>
              <div className="flex gap-4">
                  <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 rounded-xl font-bold">Verificar</button>
                  <button onClick={logout} className="px-6 py-2 bg-slate-800 rounded-xl font-bold">Sair</button>
              </div>
          </div>
      );
  }

  return (
    <DataProvider>
      <AppLayout activeModule={activeModule} onNavigate={setActiveModule} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
    </DataProvider>
  );
}

const AppLayout: React.FC<{ 
    activeModule: string, onNavigate: (m: string) => void, isSidebarOpen: boolean, setIsSidebarOpen: (b: boolean) => void 
}> = ({ activeModule, onNavigate, isSidebarOpen, setIsSidebarOpen }) => {
    const { currentUser, currentOrganization } = useAuth();
    const { theme } = useData(); 
    const isSuperAdmin = currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase());

    if (currentUser?.role === 'client') {
        return (
          <PortalLayout activeModule={activeModule} onNavigate={onNavigate}>
              {activeModule === 'portal-dashboard' && <ClientDashboard onNavigate={onNavigate} />}
              {activeModule === 'portal-financial' && <ClientFinancial />}
              {activeModule === 'portal-proposals' && <ClientProposals />}
              {activeModule === 'portal-tickets' && <ClientSupport />}
          </PortalLayout>
        );
    }

    return (
      <div className={`flex h-[100dvh] font-sans overflow-hidden relative z-0 text-slate-900 dark:text-slate-100 ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
        <ToastContainer />
        <CommandPalette onNavigate={onNavigate} />
        <OnboardingTour />
        <AIAssistant />
        <NexusVoice />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeModule={activeModule} onNavigate={onNavigate} />
        <main className="flex-1 h-full flex flex-col overflow-hidden relative w-full">
          <header className="flex w-full h-16 items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0 z-20">
              <div className="flex items-center gap-2">
                  <Badge color="blue">{currentOrganization?.name || 'SOFT-CRM'}</Badge>
              </div>
              <div className="flex items-center gap-3">
                  {isSuperAdmin && <Badge color="purple">MASTER ACCESS</Badge>}
                  <div className="text-right">
                      <p className="text-xs font-bold">{currentUser?.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{currentUser?.role}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold">{currentUser?.avatar}</div>
              </div>
          </header>
          <div className="flex-1 overflow-y-auto w-full pb-24 md:pb-0">
              {activeModule === 'dashboard' && <Dashboard onNavigate={onNavigate} />}
              {activeModule === 'contact-center' && <Dashboard onNavigate={onNavigate} viewMode="contact-center" />} 
              {activeModule === 'commercial' && <Commercial />}
              {activeModule === 'inbox' && <Inbox />} 
              {activeModule === 'prospecting' && <Prospecting />} 
              {activeModule === 'competitive-intelligence' && <CompetitiveIntelligence />} 
              {activeModule === 'marketing' && <Marketing />}
              {activeModule === 'clients' && <Clients />}
              {activeModule === 'finance' && <Finance />}
              {activeModule === 'support' && <Support />}
              {activeModule === 'dev' && <Development />}
              {activeModule === 'reports' && <Reports />}
              {activeModule === 'settings' && <Settings />}
              {activeModule === 'customer-success' && <CustomerSuccess />}
              {activeModule === 'proposals' && <Proposals />}
              {activeModule === 'retention' && <Retention />}
              {activeModule === 'calendar' && <Calendar />}
              {activeModule === 'automation' && <Automation />}
              {activeModule === 'geo-intelligence' && <GeoIntelligence />}
              {activeModule === 'projects' && <Projects />}
              {activeModule === 'operations' && <Operations />}
          </div>
        </main>
      </div>
    );
};

function App() { return ( <AuthProvider> <AppContent /> </AuthProvider> ); }
export default App;
