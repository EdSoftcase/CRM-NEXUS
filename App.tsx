
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext'; 
import { Sidebar } from './components/Sidebar';
import { PortalLayout } from './components/PortalLayout';
import { CommandPalette } from './components/CommandPalette';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingTour } from './components/OnboardingTour';
import { AIAssistant } from './components/AIAssistant';
import { NexusVoice } from './components/NexusVoice';
import { ToastContainer } from './components/Toast'; 
import { PushNotificationModal } from './components/PushNotificationModal'; 
import { Menu, Lock, AlertTriangle, LogOut } from 'lucide-react';

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
  const { togglePushNotifications, pushEnabled } = useData(); 
  
  // STATE PERSISTENCE
  const [activeModule, setActiveModule] = useState(() => {
      return localStorage.getItem('nexus_active_module') || 'dashboard';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Push Notification Modal Logic
  const [showPushModal, setShowPushModal] = useState(false);
  const [hasCheckedPush, setHasCheckedPush] = useState(false);

  // License Warning Logic
  const [showLicenseWarning, setShowLicenseWarning] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Force Splash Screen to fade out
    const fadeTimer = setTimeout(() => setIsFadingOut(true), 2500);
    const removeTimer = setTimeout(() => setShowSplash(false), 3500);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  // STATE PERSISTENCE: Save activeModule to localStorage
  useEffect(() => {
      if (activeModule) {
          localStorage.setItem('nexus_active_module', activeModule);
      }
  }, [activeModule]);

  // Check for Push Notification Prompt on Load
  useEffect(() => {
    if (currentUser && !loading && 'Notification' in window && !hasCheckedPush) {
        const isBlocked = Notification.permission === 'denied';
        if (!pushEnabled && !isBlocked) {
            const timer = setTimeout(() => setShowPushModal(true), 1500); 
            return () => clearTimeout(timer);
        }
        setHasCheckedPush(true);
    }
  }, [currentUser, loading, pushEnabled, hasCheckedPush]);

  const handleEnablePush = async () => {
      await togglePushNotifications();
      setShowPushModal(false);
  };

  const handleDismissPush = () => {
      setShowPushModal(false);
  };

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

  if (loading) {
      return null; 
  }

  // --- UNAUTHENTICATED STATE ---
  if (!currentUser) {
      return (
        <>
          {showSplash && <SplashScreen isFadingOut={isFadingOut} />}
          <Login />
        </>
      );
  }

  // --- BLOCKED LICENSE STATE ---
  if (daysRemaining !== null && daysRemaining < 0) {
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

  // --- CLIENT PORTAL LAYOUT ---
  if (currentUser.role === 'client') {
      return (
        <PortalLayout activeModule={activeModule} onNavigate={setActiveModule}>
            <ToastContainer /> 
            {activeModule === 'portal-dashboard' && <ClientDashboard onNavigate={setActiveModule} />}
            {activeModule === 'portal-financial' && <ClientFinancial />}
            {activeModule === 'portal-proposals' && <ClientProposals />}
            {activeModule === 'portal-tickets' && <ClientSupport />}
        </PortalLayout>
      );
  }

  // --- ADMIN / STAFF LAYOUT ---
  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden relative z-0 animate-fade-in text-slate-900 dark:text-slate-100">
      {showSplash && <SplashScreen isFadingOut={isFadingOut} />}
      
      <ToastContainer />
      <CommandPalette onNavigate={setActiveModule} />
      <OnboardingTour />
      <AIAssistant />
      <NexusVoice />
      
      {showPushModal && (
          <PushNotificationModal 
              onEnable={handleEnablePush} 
              onDismiss={handleDismissPush} 
          />
      )}
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeModule={activeModule} 
        onNavigate={setActiveModule} 
      />
      
      <main className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative w-full transition-colors duration-300">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 z-10 shadow-md">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded"><Menu size={24} /></button>
            <span className="font-bold text-lg">Nexus CRM</span>
            
            {/* User Avatar - Mobile Right */}
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden border border-slate-600 shadow-sm">
                {currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http')) ? (
                    <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span>{currentUser?.avatar || 'U'}</span>
                )}
            </div>
        </div>

        {/* Desktop Top Bar - User Profile */}
        <div className="hidden md:flex absolute top-4 right-8 z-30 pointer-events-none">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 py-1.5 px-3 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 transition-colors pointer-events-auto">
                <div className="text-right leading-tight">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{currentUser?.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                     {currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http')) ? (
                        <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{currentUser?.avatar || 'U'}</span>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full pb-24 md:pb-0 scroll-smooth">
            {activeModule === 'dashboard' && <Dashboard onNavigate={setActiveModule} />}
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
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
