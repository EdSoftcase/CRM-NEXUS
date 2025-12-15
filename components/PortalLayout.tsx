
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
  Info,
  User,
  Lock,
  Save,
  Loader2
} from 'lucide-react';
import { ClientPortalTour } from './ClientPortalTour';

interface PortalLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onNavigate: (module: string) => void;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, activeModule, onNavigate }) => {
  const { currentUser, logout, currentOrganization, updateUser, changePassword } = useAuth();
  const { portalSettings, notifications, clients, markNotificationRead } = useData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Profile Edit State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
      name: currentUser?.name || '', 
      password: '', 
      confirmPassword: '' 
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const navItems = [
    { id: 'portal-dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'portal-financial', label: 'Financeiro', icon: DollarSign, hidden: !portalSettings.allowInvoiceDownload },
    { id: 'portal-proposals', label: 'Propostas', icon: FileText },
    { id: 'portal-tickets', label: 'Suporte', icon: LifeBuoy, hidden: !portalSettings.allowTicketCreation },
  ];

  const handleNavClick = (moduleId: string) => {
    onNavigate(moduleId);
    setIsMobileMenuOpen(false);
  };

  // Find current client data to match notification target
  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  // Filter notifications for this client
  const myNotifications = useMemo(() => {
      if (!currentClient) return [];
      return notifications.filter(n => n.relatedTo === currentClient.name || n.relatedTo === currentUser?.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, currentClient, currentUser]);

  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleBellClick = () => {
      setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleNotificationClick = (id: string) => {
      markNotificationRead(id);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingProfile(true);

      try {
          // 1. Update Name
          if (profileForm.name !== currentUser?.name) {
              updateUser({ name: profileForm.name });
          }

          // 2. Update Password if provided
          if (profileForm.password) {
              if (profileForm.password !== profileForm.confirmPassword) {
                  alert("As senhas não coincidem.");
                  setIsSavingProfile(false);
                  return;
              }
              if (profileForm.password.length < 6) {
                  alert("A senha deve ter no mínimo 6 caracteres.");
                  setIsSavingProfile(false);
                  return;
              }
              
              const result = await changePassword(profileForm.password);
              if (!result.success) {
                  alert("Erro ao alterar senha: " + result.error);
                  setIsSavingProfile(false);
                  return;
              }
          }

          alert("Perfil atualizado com sucesso!");
          setIsProfileModalOpen(false);
          setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
      } catch (e) {
          alert("Erro ao atualizar perfil.");
      } finally {
          setIsSavingProfile(false);
      }
  };

  // Dynamic style for primary color
  const primaryColor = portalSettings.primaryColor || '#4f46e5';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <ClientPortalTour />
      
      {/* Top Navigation Bar with Dynamic Style */}
      <header 
        className="border-b border-slate-200 sticky top-0 z-50 shadow-sm transition-colors duration-300"
        style={{ borderTop: `4px solid ${primaryColor}`, backgroundColor: '#ffffff' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo Area */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-3">
                {/* Logo with Dynamic Color */}
                <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                >
                  {currentOrganization?.name?.charAt(0) || 'N'}
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight hidden md:block">
                        {portalSettings.portalName || currentOrganization?.name || 'Portal do Cliente'}
                    </h1>
                    <span 
                        className="text-[10px] uppercase tracking-widest font-bold hidden md:block"
                        style={{ color: primaryColor }}
                    >
                        Área do Cliente
                    </span>
                </div>
              </div>
              
              {/* Desktop Nav */}
              <nav className="hidden md:ml-10 md:flex md:space-x-4">
                {navItems.filter(item => !item.hidden).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`
                        inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-slate-50' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }
                      `}
                      style={isActive ? { color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    >
                      <Icon size={16} className="mr-2" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <div className="relative">
                  <button 
                    onClick={handleBellClick}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 relative group"
                  >
                    <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
                    {unreadCount > 0 && (
                        <>
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white animate-ping" style={{ backgroundColor: primaryColor }}></span>
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: primaryColor }}></span>
                        </>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationsOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-scale-in origin-top-right">
                          <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                              <h3 className="font-bold text-sm text-slate-700">Notificações</h3>
                              {unreadCount > 0 && <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-bold">{unreadCount} novas</span>}
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                              {myNotifications.length === 0 ? (
                                  <div className="p-6 text-center text-slate-400 text-sm">
                                      Nenhuma notificação.
                                  </div>
                              ) : (
                                  myNotifications.map(notif => (
                                      <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif.id)}
                                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition ${notif.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                                      >
                                          <div className="flex items-start gap-2">
                                              <div className="mt-1 text-slate-400"><Info size={14} /></div>
                                              <div>
                                                  <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                                                  <p className="text-xs text-slate-600 leading-snug">{notif.message}</p>
                                                  <p className="text-[10px] text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  )}
              </div>
              
              {/* User Profile Trigger - Clickable now */}
              <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer group" onClick={() => setIsProfileModalOpen(true)}>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500">{currentUser?.email}</p>
                </div>
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold overflow-hidden group-hover:ring-2 ring-blue-200 transition">
                    {currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http')) ? (
                      <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentUser?.avatar}</span>
                    )}
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); logout(); }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-2"
                    title="Sair"
                >
                    <LogOut size={18} />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100"
                >
                  {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="pt-2 pb-3 space-y-1 px-4">
              {navItems.filter(item => !item.hidden).map((item) => {
                 const Icon = item.icon;
                 const isActive = activeModule === item.id;
                 return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`block w-full text-left px-3 py-3 rounded-md text-base font-medium flex items-center transition-colors ${
                      isActive
                        ? 'bg-slate-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    style={isActive ? { color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                  >
                    <Icon size={18} className="mr-3" />
                    {item.label}
                  </button>
                 )
              })}
              <div className="border-t border-slate-100 my-2 pt-2">
                  <div className="flex items-center gap-3 px-3 py-2 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                        {currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http')) ? (
                          <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span>{currentUser?.avatar}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{currentUser?.name}</p>
                        <p className="text-xs text-slate-500">{currentUser?.email}</p>
                      </div>
                  </div>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-3 py-3 text-red-600 font-medium flex items-center hover:bg-red-50 rounded-md mt-1"
                  >
                    <LogOut size={18} className="mr-3"/> Sair
                  </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs">
              <p>&copy; {new Date().getFullYear()} {currentOrganization?.name}. Todos os direitos reservados.</p>
              <p className="mt-1">Powered by SOFT-CRM Enterprise</p>
          </div>
      </footer>

      {/* PROFILE EDIT MODAL */}
      {isProfileModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2"><User size={20} className="text-blue-600"/> Meu Perfil</h3>
                      <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                          <input 
                              type="text" 
                              required
                              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={profileForm.name}
                              onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                          />
                      </div>
                      
                      <div className="border-t border-slate-100 pt-4 mt-2">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><Lock size={12}/> Alterar Senha (Opcional)</p>
                          <div className="space-y-3">
                              <div>
                                  <input 
                                      type="password" 
                                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                      placeholder="Nova Senha (min. 6 caracteres)"
                                      value={profileForm.password}
                                      onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <input 
                                      type="password" 
                                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                      placeholder="Confirme a Nova Senha"
                                      value={profileForm.confirmPassword}
                                      onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              type="button" 
                              onClick={() => setIsProfileModalOpen(false)}
                              className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit" 
                              disabled={isSavingProfile}
                              className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                          >
                              {isSavingProfile ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
