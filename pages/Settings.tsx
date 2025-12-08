
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { UserCircle, Shield, Activity, Lock, Edit2, Trash2, Plus, Package, X, Save, Mail, Database, CheckCircle, RefreshCw, BarChart2,  UploadCloud, ShieldCheck, Code, Copy,  Building2, Key, Globe, Users, AlertTriangle, Monitor, Palette, Search, Calendar, Unlock, Loader2, Bell, Zap, QrCode, Server, Wifi, WifiOff, MessageCircle, Cpu, Radio, Power, ExternalLink, Clock, ListChecks, Hourglass, Camera, Settings2, Link2, CalendarCheck, CalendarDays, CheckSquare, Type, Hash, List as ListIcon, AlignLeft, ArrowRightLeft } from 'lucide-react';
import { SectionTitle, Badge } from '../components/Widgets';
import { Role, User, Product, PermissionAction, PortalSettings, Organization, CustomFieldDefinition, WebhookConfig, TriggerType } from '../types';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, getSupabase } from '../services/supabaseClient';
import { checkBridgeStatus, getBridgeQR, configureBridgeSMTP } from '../services/bridgeService';
import { MOCK_ORGANIZATIONS } from '../constants';

const ROLE_NAMES: Record<string, string> = {
    admin: 'Administrador',
    executive: 'Diretoria/Executivo',
    sales: 'Comercial (Sales)',
    support: 'Suporte (N1/N2)',
    dev: 'Desenvolvedor',
    finance: 'Financeiro',
    client: 'Cliente Externo (Portal)'
};

const MODULE_NAMES: Record<string, string> = {
    dashboard: 'Visão Geral',
    inbox: 'Inbox Unificado',
    prospecting: 'Prospecção IA',
    'competitive-intelligence': 'Nexus Spy',
    calendar: 'Agenda',
    marketing: 'Marketing',
    commercial: 'Comercial',
    proposals: 'Propostas',
    operations: 'Operações',
    clients: 'Carteira de Clientes',
    'geo-intelligence': 'Mapa Inteligente',
    projects: 'Projetos',
    'customer-success': 'Sucesso do Cliente',
    retention: 'Retenção',
    automation: 'Nexus Flow',
    finance: 'Financeiro',
    support: 'Suporte',
    dev: 'Desenvolvimento',
    reports: 'Relatórios',
    settings: 'Configurações',
    portal: 'Portal do Cliente'
};

const SUPER_ADMIN_EMAILS = ['superadmin@nexus.com', 'edson.softcase@gmail.com'];

export const Settings: React.FC = () => {
  const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, permissionMatrix, updatePermission, sendRecoveryInvite } = useAuth();
  
  const { leads, clients, tickets, invoices, issues, syncLocalToCloud, isSyncing, refreshData, products, addProduct, updateProduct, removeProduct, activities, portalSettings, updatePortalSettings, campaigns, workflows, marketingContents, projects, notifications, pushEnabled, togglePushNotifications, competitors, marketTrends, prospectingHistory, disqualifiedProspects, customFields, addCustomField, deleteCustomField, webhooks, addWebhook, deleteWebhook, updateWebhook, restoreDefaults } = useData();
  
  const { data: logs, isLoading: isLogsLoading, isError: isLogsError } = useAuditLogs();

  // STATE PERSISTENCE
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'permissions' | 'audit' | 'integrations' | 'products' | 'saas_admin' | 'portal_config' | 'bridge' | 'custom_fields' | 'webhooks'>(() => {
      return (sessionStorage.getItem('nexus_settings_tab') as any) || 'profile';
  });

  const [logSearch, setLogSearch] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const isSuperAdmin = currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email);

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription' });
  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productDeleteReason, setProductDeleteReason] = useState('');

  // Team Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });
  const [isDeleteMemberModalOpen, setIsDeleteMemberModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

  // SaaS Modal State
  const [newTenantForm, setNewTenantForm] = useState({ name: '', slug: '', adminEmail: '', plan: 'Standard', adminPassword: '' });
  const [generatedTenantData, setGeneratedTenantData] = useState<{ id: string, sql: string, steps: string, welcomeMessage: string } | null>(null);
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [saasOrgs, setSaasOrgs] = useState<Organization[]>([]);
  const [loadingSaas, setLoadingSaas] = useState(false);

  // Integrations State
  const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<''>('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  
  // Sync Stats State
  const [syncStats, setSyncStats] = useState<{label: string, local: number, remote: number | string, status: 'synced'|'diff'|'error'}[]>([]);
  const [isCheckingSync, setIsCheckingSync] = useState(false);

  // Portal State
  const [portalForm, setPortalForm] = useState<PortalSettings>(portalSettings);

  // Notification Permission
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
      'Notification' in window ? Notification.permission : 'default'
  );

  // Bridge State
  const [bridgeStatus, setBridgeStatus] = useState<{whatsapp: string, smtp: string}>({ whatsapp: 'OFFLINE', smtp: 'OFFLINE' });
  const [bridgeQr, setBridgeQr] = useState<string | null>(null);
  const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: 587, user: '', pass: '' });
  const [loadingBridge, setLoadingBridge] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  // Calendar State
  const [calendarSync, setCalendarSync] = useState<{google: boolean, outlook: boolean}>(() => {
      const saved = localStorage.getItem('nexus_calendar_sync');
      return saved ? JSON.parse(saved) : { google: false, outlook: false };
  });

  // Custom Fields & Webhooks State
  const [newFieldForm, setNewFieldForm] = useState<Partial<CustomFieldDefinition>>({ type: 'text', module: 'leads', required: false });
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  const [newWebhookForm, setNewWebhookForm] = useState<Partial<WebhookConfig>>({ triggerEvent: 'lead_created', method: 'POST', active: true });
  
  // Profile
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '', avatar: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permissions
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('sales');

  // --- EFFECTS ---
  useEffect(() => {
      if (currentUser) {
          setProfileForm(prev => ({
              ...prev,
              name: currentUser.name || '',
              email: currentUser.email || '',
              phone: currentUser.phone || '',
              cpf: currentUser.cpf || '',
              avatar: currentUser.avatar || ''
          }));
      }
  }, [currentUser]);

  useEffect(() => {
      sessionStorage.setItem('nexus_settings_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
      setPortalForm(portalSettings);
  }, [portalSettings]);

  // Fetch Data on Tab Change
  useEffect(() => {
      if (activeTab === 'saas_admin' && isSuperAdmin) {
          fetchSaasOrgs();
      }
      if (activeTab === 'bridge') {
          fetchBridgeStatus(); 
      }
      if (activeTab === 'integrations') {
          const config = getSupabaseConfig();
          setSupabaseForm({ url: config.url || '', key: config.key || '' });
          
          // If we have config, check status and sync
          if (config.url && config.key) {
              setConnectionStatus('success'); // Optimistic until check fails
              handleCheckSync();
          }
      }
  }, [activeTab, isSuperAdmin]);

  useEffect(() => {
      if ('permissions' in navigator && 'query' in navigator.permissions) {
          navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
              setPermissionStatus(Notification.permission);
              permissionStatus.onchange = () => {
                  setPermissionStatus(Notification.permission);
              };
          });
      } else if ('Notification' in window) {
          setPermissionStatus(Notification.permission);
      }
  }, [pushEnabled]);

  // --- HANDLERS ---

  const fetchBridgeStatus = async (manual: boolean = false) => {
      if (!bridgeStatus.whatsapp && manual) setLoadingBridge(true);
      setBridgeError(null);
      try {
          const status = await checkBridgeStatus();
          setBridgeStatus(status);
          if (status.whatsapp === 'QR_READY') {
              const qrData = await getBridgeQR();
              if (qrData?.qrImage) setBridgeQr(qrData.qrImage);
          } else if (status.whatsapp === 'READY') {
              setBridgeQr(null);
          }
      } catch (e: any) {
          setBridgeError(e.message || "Falha na conexão");
          setBridgeStatus({ whatsapp: 'OFFLINE', smtp: 'OFFLINE' });
          if (manual) alert(`Erro de Conexão: ${e.message}`);
      } finally {
          setLoadingBridge(false);
      }
  };

  const handleManualBridgeCheck = async () => { setLoadingBridge(true); await fetchBridgeStatus(true); setLoadingBridge(false); };
  const handleSaveSmtp = async (e: React.FormEvent) => { e.preventDefault(); setLoadingBridge(true); try { await configureBridgeSMTP(smtpForm); alert('SMTP Configurado!'); fetchBridgeStatus(); } catch (e: any) { alert(`Erro: ${e.message}`); } finally { setLoadingBridge(false); } };

  const fetchSaasOrgs = async () => { setLoadingSaas(true); const supabase = getSupabase(); if (supabase) { const { data } = await supabase.from('organizations').select('*'); setSaasOrgs(data as Organization[] || MOCK_ORGANIZATIONS); } else { setSaasOrgs(MOCK_ORGANIZATIONS); } setLoadingSaas(false); };
  const handleCreateTenant = async (e: React.FormEvent) => { e.preventDefault(); const id = `org-${Date.now()}`; setGeneratedTenantData({ id, sql: `INSERT INTO organizations (id, name, slug, subscription_status) VALUES ('${id}', '${newTenantForm.name}', '${newTenantForm.slug}', 'active');`, steps: "Execute o SQL no Supabase para criar o tenant.", welcomeMessage: "Organização criada." }); setIsNewTenantModalOpen(false); };

  const handleSaveSupabase = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      setConnectionStatus('testing'); 
      setStatusMessage('');
      
      saveSupabaseConfig(supabaseForm.url, supabaseForm.key); 
      
      const result = await testSupabaseConnection(); 
      
      if (result.success) { 
          setConnectionStatus('success'); 
          setStatusMessage(result.message as any); 
          
          // Auto-refresh data and check sync
          handleForceUpdate();
          
          // Reload to apply new client globally
          setTimeout(() => window.location.reload(), 2000); 
      } else { 
          setConnectionStatus('error'); 
          setStatusMessage(result.message as any); 
      } 
  };
  const handleGenerateSchema = () => { setShowSqlModal(true); };

  const handleCheckSync = async () => {
      setIsCheckingSync(true);
      const supabase = getSupabase();
      
      if (!supabase) {
          setIsCheckingSync(false);
          return;
      }

      const tables = [
          { name: 'leads', local: leads.length, label: 'Leads (Comercial)' },
          { name: 'clients', local: clients.length, label: 'Clientes' },
          { name: 'tickets', local: tickets.length, label: 'Chamados' },
          { name: 'invoices', local: invoices.length, label: 'Faturas' },
          { name: 'activities', local: activities.length, label: 'Atividades' },
          { name: 'products', local: products.length, label: 'Produtos' },
          { name: 'projects', local: projects.length, label: 'Projetos' },
          { name: 'competitors', local: competitors.length, label: 'Concorrentes (Spy)' },
          { name: 'market_trends', local: marketTrends.length, label: 'Tendências (Spy)' }
      ];

      const stats = [];

      for (const t of tables) {
          try {
              // Fetch count only (HEAD request)
              const { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
              
              const remoteCount = error ? -1 : (count || 0);
              const status = error ? 'error' : (t.local === remoteCount ? 'synced' : 'diff');

              stats.push({
                  label: t.label,
                  local: t.local,
                  remote: remoteCount === -1 ? 'Erro' : remoteCount,
                  status: status as any
              });
          } catch (e) {
              stats.push({ label: t.label, local: t.local, remote: 'Erro', status: 'error' });
          }
      }

      setSyncStats(stats);
      setIsCheckingSync(false);
  };

  const handleForceUpdate = async () => {
      await refreshData(); // Pulls from cloud
      await handleCheckSync(); // Re-checks stats
  };

  const compressImage = (file: File): Promise<string> => { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target?.result as string; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 400; canvas.height = 400; ctx?.drawImage(img, 0, 0, 400, 400); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; }; }); };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setIsCompressing(true); const base64 = await compressImage(file); setProfileForm(prev => ({...prev, avatar: base64})); setIsCompressing(false); } };

  const handleUpdateProfile = (e: React.FormEvent) => { e.preventDefault(); updateUser(profileForm); setIsEditingProfile(false); };
  const handleAddMember = async (e: React.FormEvent) => { e.preventDefault(); await addTeamMember(newMember.name, newMember.email, newMember.role); setIsTeamModalOpen(false); setNewMember({ name: '', email: '', role: 'sales' }); };
  const handleDeleteMember = async () => { if (memberToDelete) { await adminDeleteUser(memberToDelete.id); setIsDeleteMemberModalOpen(false); setMemberToDelete(null); } };
  
  const handleSaveProduct = (e: React.FormEvent) => { e.preventDefault(); if (editingProductId) { updateProduct(currentUser!, { ...newProduct, id: editingProductId } as Product); } else { addProduct(currentUser!, { ...newProduct, id: `PROD-${Date.now()}` } as Product); } setIsProductModalOpen(false); setEditingProductId(null); setNewProduct({ active: true, category: 'Subscription' }); };
  const handleDeleteProduct = () => { if (productToDelete) { removeProduct(currentUser!, productToDelete.id, productDeleteReason); setIsDeleteProductModalOpen(false); setProductToDelete(null); } };
  const handleEditProduct = (prod: Product) => { setEditingProductId(prod.id); setNewProduct(prod); setIsProductModalOpen(true); };

  const handleSavePortal = () => { updatePortalSettings(currentUser!, portalForm); alert('Configurações do portal salvas!'); };
  
  const toggleCalendar = (type: 'google' | 'outlook') => { setCalendarSync(prev => { const newState = { ...prev, [type]: !prev[type] }; localStorage.setItem('nexus_calendar_sync', JSON.stringify(newState)); return newState; }); };

  // --- CUSTOM FIELD HANDLERS ---
  const generateSlug = (text: string) => { return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_'); };
  const handleLabelChange = (val: string) => { setNewFieldForm(prev => ({ ...prev, label: val, key: generateSlug(val) })); };
  
  const handleCreateCustomField = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!newFieldForm.label || !newFieldForm.key) return; 
      const field: CustomFieldDefinition = { 
          id: `cf-${Date.now()}`, 
          label: newFieldForm.label, 
          key: newFieldForm.key, 
          type: newFieldForm.type || 'text', 
          module: newFieldForm.module || 'leads', 
          required: newFieldForm.required || false, 
          options: newFieldForm.type === 'select' ? fieldOptionsInput.split(',').map(s => s.trim()).filter(s => s) : undefined, 
          organizationId: currentOrganization?.id 
      }; 
      addCustomField(field); 
      setNewFieldForm({ type: 'text', module: 'leads', required: false, label: '', key: '' }); 
      setFieldOptionsInput(''); 
  };

  const handleCreateWebhook = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!newWebhookForm.name || !newWebhookForm.url) return; 
      const hook: WebhookConfig = { 
          id: `wh-${Date.now()}`, 
          name: newWebhookForm.name, 
          url: newWebhookForm.url, 
          triggerEvent: newWebhookForm.triggerEvent || 'lead_created', 
          method: newWebhookForm.method || 'POST', 
          active: newWebhookForm.active !== undefined ? newWebhookForm.active : true, 
          organizationId: currentOrganization?.id 
      }; 
      addWebhook(hook); 
      setNewWebhookForm({ triggerEvent: 'lead_created', method: 'POST', active: true, name: '', url: '' }); 
  };
  
  const handleTestWebhook = async (hook: WebhookConfig) => { 
      try { 
          const payload = { test: true, timestamp: new Date().toISOString(), trigger: hook.triggerEvent }; 
          await fetch(hook.url, { method: hook.method, headers: { 'Content-Type': 'application/json' }, body: hook.method === 'POST' ? JSON.stringify(payload) : undefined }); 
          alert(`Teste disparado para ${hook.url}`); 
      } catch (e: any) { 
          alert(`Erro ao testar: ${e.message}`); 
      } 
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor size={32} className="text-slate-600 dark:text-slate-400" /> Configurações & Governança
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie sua organização, equipe e integrações.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        {/* Sidebar Menu */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 shrink-0">
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <UserCircle size={18} /> Perfil </button>
          <button onClick={() => setActiveTab('team')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'team' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Users size={18} /> Equipe </button>
          <button onClick={() => setActiveTab('permissions')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'permissions' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Shield size={18} /> Permissões </button>
          <button onClick={() => setActiveTab('custom_fields')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'custom_fields' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Settings2 size={18} /> Campos Personalizados </button>
          <button onClick={() => setActiveTab('webhooks')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'webhooks' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Link2 size={18} /> Webhooks & API </button>
          <button onClick={() => setActiveTab('audit')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'audit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Activity size={18} /> Auditoria & Tarefas </button>
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Package size={18} /> Produtos </button>
          <button onClick={() => setActiveTab('portal_config')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'portal_config' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Globe size={18} /> Portal do Cliente </button>
          <button onClick={() => setActiveTab('bridge')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'bridge' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Server size={18} /> Nexus Bridge </button>
          <button onClick={() => setActiveTab('integrations')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'integrations' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}> <Database size={18} /> Dados & Integrações </button>
          {isSuperAdmin && (
              <button onClick={() => setActiveTab('saas_admin')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'saas_admin' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}> <Building2 size={18} /> SaaS Admin </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
                <div className="max-w-2xl animate-fade-in">
                    <SectionTitle title="Meu Perfil" subtitle="Gerencie suas informações pessoais e de acesso." />
                    <form onSubmit={handleUpdateProfile} className="space-y-6 mt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-2xl font-bold text-slate-600 dark:text-slate-300 overflow-hidden relative group">
                                {profileForm.avatar && (profileForm.avatar.startsWith('data:') || profileForm.avatar.startsWith('http')) ? (
                                    <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{profileForm.avatar || 'U'}</span>
                                )}
                                {isEditingProfile && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        {isCompressing ? <Loader2 className="animate-spin text-white"/> : <Camera className="text-white" size={24} />}
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            <div>
                                {isEditingProfile ? (
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">{isCompressing ? 'Processando...' : 'Alterar foto'}</button>
                                ) : (
                                    <span className="text-sm text-slate-400 cursor-not-allowed">Alterar foto</span>
                                )}
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label><input type="text" disabled={!isEditingProfile} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-60" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail</label><input type="email" disabled className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed" value={profileForm.email} /></div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                            {isEditingProfile ? (
                                <>
                                    <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">Salvar Alterações</button>
                                </>
                            ) : (
                                <button type="button" onClick={() => setIsEditingProfile(true)} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 flex items-center gap-2"><Edit2 size={16}/> Editar Perfil</button>
                            )}
                        </div>
                    </form>
                    <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                        <SectionTitle title="Notificações" subtitle="Preferências de alerta do sistema." />
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${pushEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}><Bell size={20} /></div>
                                <div><p className="font-bold text-sm text-slate-800 dark:text-white">Notificações Push</p><p className="text-xs text-slate-500 dark:text-slate-400">{pushEnabled ? 'Ativado neste dispositivo.' : 'Desativado ou bloqueado.'} {permissionStatus === 'denied' && <span className="text-red-500 ml-1">(Bloqueado pelo navegador)</span>}</p></div>
                            </div>
                            <button onClick={togglePushNotifications} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${pushEnabled ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{pushEnabled ? 'Desativar' : 'Ativar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <SectionTitle title="Membros da Equipe" subtitle="Gerencie quem tem acesso à organização." />
                        <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus size={18}/> Convidar Membro</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs">
                                <tr>
                                    <th className="p-4">Nome</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Função</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {usersList.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {user.avatar?.startsWith('http') ? <img src={user.avatar} className="w-full h-full rounded-full object-cover"/> : user.avatar}
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-white">{user.name}</span>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                                        <td className="p-4"><Badge color="blue">{ROLE_NAMES[user.role] || user.role}</Badge></td>
                                        <td className="p-4 text-center"><Badge color="green">Ativo</Badge></td>
                                        <td className="p-4 text-center">
                                            {user.id !== currentUser?.id && (
                                                <button 
                                                    onClick={() => { setMemberToDelete(user); setIsDeleteMemberModalOpen(true); }}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PERMISSIONS TAB */}
            {activeTab === 'permissions' && (
                <div>
                    <SectionTitle title="Matriz de Permissões" subtitle="Controle granular de acesso por função (RBAC)." />
                    
                    <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                        {Object.keys(ROLE_NAMES).filter(r => r !== 'client').map((role) => (
                            <button
                                key={role}
                                onClick={() => setSelectedRoleForPerms(role as Role)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${selectedRoleForPerms === role ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                {ROLE_NAMES[role]}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs">
                                <tr>
                                    <th className="p-4">Módulo</th>
                                    <th className="p-4 text-center">Visualizar</th>
                                    <th className="p-4 text-center">Criar</th>
                                    <th className="p-4 text-center">Editar</th>
                                    <th className="p-4 text-center">Excluir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {Object.keys(MODULE_NAMES).map(moduleKey => {
                                    const perms = permissionMatrix[selectedRoleForPerms]?.[moduleKey] || { view: false, create: false, edit: false, delete: false };
                                    return (
                                        <tr key={moduleKey} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{MODULE_NAMES[moduleKey]}</td>
                                            {['view', 'create', 'edit', 'delete'].map(action => (
                                                <td key={action} className="p-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={perms[action as PermissionAction]}
                                                        onChange={(e) => updatePermission(selectedRoleForPerms, moduleKey, action as PermissionAction, e.target.checked)}
                                                        disabled={selectedRoleForPerms === 'admin'} // Admin always has full access
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && (
                <div>
                    <SectionTitle title="Logs de Auditoria" subtitle="Rastreabilidade de todas as ações no sistema." />
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="Buscar nos logs..." 
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={logSearch}
                                onChange={(e) => setLogSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm flex flex-col h-[500px]">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left text-xs md:text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3">Data/Hora</th>
                                        <th className="p-3">Usuário</th>
                                        <th className="p-3">Ação</th>
                                        <th className="p-3">Módulo</th>
                                        <th className="p-3">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {logs?.filter(l => JSON.stringify(l).toLowerCase().includes(logSearch.toLowerCase())).map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{log.userName}</td>
                                            <td className="p-3"><Badge>{log.action}</Badge></td>
                                            <td className="p-3 text-slate-600 dark:text-slate-300">{log.module}</td>
                                            <td className="p-3 text-slate-500 dark:text-slate-400 truncate max-w-xs" title={log.details}>{log.details}</td>
                                        </tr>
                                    ))}
                                    {(!logs || logs.length === 0) && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum log registrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <SectionTitle title="Catálogo de Produtos" subtitle="Gerencie serviços e itens faturáveis." />
                        <button onClick={() => { setIsProductModalOpen(true); setEditingProductId(null); setNewProduct({ active: true, category: 'Subscription' }); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition"><Plus size={18}/> Novo Produto</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {products.map(prod => (
                            <div key={prod.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition group relative">
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => handleEditProduct(prod)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600"><Edit2 size={14}/></button>
                                    <button onClick={() => { setProductToDelete(prod); setIsDeleteProductModalOpen(true); }} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"><Trash2 size={14}/></button>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <Badge color={prod.category === 'Subscription' ? 'blue' : prod.category === 'Service' ? 'purple' : 'green'}>{prod.category}</Badge>
                                    {!prod.active && <span className="text-xs font-bold text-red-500">Inativo</span>}
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{prod.name}</h3>
                                <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 my-2">R$ {prod.price.toLocaleString()}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{prod.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PORTAL CONFIG TAB */}
            {activeTab === 'portal_config' && (
                <div className="max-w-4xl">
                    <SectionTitle title="Personalização do Portal" subtitle="Configure a aparência e funcionalidades da área do cliente (White-label)." />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Aparência & Marca</h3>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Portal</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={portalForm.portalName} onChange={e => setPortalForm({...portalForm, portalName: e.target.value})} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cor Primária (Hex)</label><div className="flex gap-2"><div className="w-10 h-10 rounded-lg border shadow-sm shrink-0" style={{backgroundColor: portalForm.primaryColor}}></div><input type="text" className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none font-mono" value={portalForm.primaryColor} onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})} /></div></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensagem de Boas-vindas</label><textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none h-24 resize-none" value={portalForm.welcomeMessage} onChange={e => setPortalForm({...portalForm, welcomeMessage: e.target.value})} /></div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Funcionalidades</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 border border-slate-100 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"><input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" checked={portalForm.allowInvoiceDownload} onChange={e => setPortalForm({...portalForm, allowInvoiceDownload: e.target.checked})} /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Permitir Download de Faturas</span></label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-100 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"><input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" checked={portalForm.allowTicketCreation} onChange={e => setPortalForm({...portalForm, allowTicketCreation: e.target.checked})} /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Permitir Abertura de Chamados</span></label>
                                </div>
                            </div>
                            
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Visualize como o cliente verá o portal.</p>
                                <a href="/portal" target="_blank" className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition"><ExternalLink size={16}/> Pré-visualizar Portal</a>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleSavePortal} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md transition flex items-center gap-2"><Save size={18}/> Salvar Configurações</button>
                    </div>
                </div>
            )}

            {/* NEXUS BRIDGE TAB */}
            {activeTab === 'bridge' && (
                <div className="space-y-8 animate-fade-in">
                    <SectionTitle title="Nexus Bridge" subtitle="Conecte seu WhatsApp e SMTP local para automações." />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* WhatsApp Connection */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400">
                                        <MessageCircle size={24}/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">WhatsApp Server</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Automação via Puppeteer local</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${bridgeStatus.whatsapp === 'READY' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'}`}>
                                    {bridgeStatus.whatsapp}
                                </div>
                            </div>

                            {loadingBridge ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                    <Loader2 className="animate-spin mb-2" size={32}/>
                                    <p>Conectando ao Bridge...</p>
                                </div>
                            ) : bridgeStatus.whatsapp === 'READY' ? (
                                <div className="h-64 flex flex-col items-center justify-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800">
                                    <CheckCircle size={48} className="mb-3"/>
                                    <p className="font-bold">WhatsApp Conectado</p>
                                    <p className="text-xs mt-1">Pronto para enviar mensagens.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    {bridgeQr ? (
                                        <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                                            <img src={bridgeQr} alt="QR Code WhatsApp" className="w-48 h-48"/>
                                            <p className="text-center text-xs text-slate-500 mt-2">Escaneie com seu celular</p>
                                        </div>
                                    ) : (
                                        <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center px-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg w-full">
                                            <WifiOff size={32} className="mb-2 opacity-50"/>
                                            <p className="text-sm">Servidor Bridge não detectado ou QR Code não gerado.</p>
                                            <p className="text-xs mt-2">Certifique-se que o <code>npm run bridge</code> está rodando.</p>
                                        </div>
                                    )}
                                    <button onClick={handleManualBridgeCheck} className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                                        <RefreshCw size={14}/> Tentar Reconectar
                                    </button>
                                </div>
                            )}
                            
                            {bridgeError && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs rounded border border-red-100 dark:border-red-800 flex items-start gap-2">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                                    {bridgeError}
                                </div>
                            )}
                        </div>

                        {/* SMTP Config */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                                        <Mail size={24}/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">SMTP Local</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Configuração de E-mail</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${bridgeStatus.smtp === 'CONFIGURED' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'}`}>
                                    {bridgeStatus.smtp === 'CONFIGURED' ? 'Configurado' : 'Pendente'}
                                </div>
                            </div>

                            <form onSubmit={handleSaveSmtp} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Host</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-sm" value={smtpForm.host} onChange={e => setSmtpForm({...smtpForm, host: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Porta</label>
                                        <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-sm" value={smtpForm.port} onChange={e => setSmtpForm({...smtpForm, port: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Usuário (E-mail)</label>
                                    <input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-sm" value={smtpForm.user} onChange={e => setSmtpForm({...smtpForm, user: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Senha (App Password)</label>
                                    <input type="password" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-sm" value={smtpForm.pass} onChange={e => setSmtpForm({...smtpForm, pass: e.target.value})} />
                                </div>
                                <button type="submit" className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition">
                                    Salvar Configuração
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                <div className="max-w-3xl space-y-8 animate-fade-in">
                    {/* Database Config */}
                    <div>
                        <SectionTitle title="Conexão com Banco de Dados" subtitle="Configure o backend Supabase para persistência de dados." />
                        
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-4">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : connectionStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                    Status: {connectionStatus === 'success' ? 'Conectado' : connectionStatus === 'testing' ? 'Verificando...' : 'Desconectado'}
                                </span>
                            </div>

                            <form onSubmit={handleSaveSupabase} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Project URL</label>
                                    <input 
                                        type="url" required 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                                        placeholder="https://xyz.supabase.co"
                                        value={supabaseForm.url}
                                        onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">API Key (Anon/Public)</label>
                                    <div className="relative">
                                        <input 
                                            type="password" required 
                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm pr-10"
                                            placeholder="eyJ..."
                                            value={supabaseForm.key}
                                            onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})}
                                        />
                                        <Lock size={16} className="absolute right-3 top-3.5 text-slate-400"/>
                                    </div>
                                </div>

                                {statusMessage && (
                                    <div className={`p-3 rounded text-sm flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                        {connectionStatus === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                                        {statusMessage}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={connectionStatus === 'testing'} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-70">
                                        {connectionStatus === 'testing' ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                        Salvar e Conectar
                                    </button>
                                    <button type="button" onClick={handleGenerateSchema} className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <Code size={18}/> Ver Schema SQL
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* NEW: Database Sync Stats */}
                    {connectionStatus === 'success' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <SectionTitle title="Diagnóstico de Sincronização" subtitle="Comparativo entre dados locais e nuvem." />
                                <button 
                                    onClick={handleForceUpdate}
                                    disabled={isCheckingSync || isSyncing}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {(isCheckingSync || isSyncing) ? <Loader2 size={14} className="animate-spin"/> : <ArrowRightLeft size={14}/>} Forçar Atualização
                                </button>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs">
                                        <tr>
                                            <th className="p-4">Tabela</th>
                                            <th className="p-4 text-center">Local (App)</th>
                                            <th className="p-4 text-center">Nuvem (Supabase)</th>
                                            <th className="p-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {syncStats.length > 0 ? syncStats.map((stat, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4 font-medium text-slate-800 dark:text-white">{stat.label}</td>
                                                <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-400">{stat.local}</td>
                                                <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-400">{stat.remote === -1 ? 'Erro' : stat.remote}</td>
                                                <td className="p-4 text-right">
                                                    {stat.status === 'synced' ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full"><CheckCircle size={12}/> Sincronizado</span>
                                                    ) : stat.status === 'error' ? (
                                                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full"><AlertTriangle size={12}/> Erro</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full"><Activity size={12}/> Divergente</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">
                                                    Carregando diagnóstico...
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* External Calendars Section */}
                    <div>
                        <SectionTitle title="Calendários Externos" subtitle="Sincronize suas atividades com Google Calendar e Outlook." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Google Calendar Card */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center p-2 shadow-sm">
                                            <CalendarCheck className="text-blue-500 w-full h-full" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">Google Calendar</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Sincronização de eventos</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                        Permite adicionar reuniões e tarefas do CRM diretamente na sua agenda Google.
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${calendarSync.google ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {calendarSync.google ? 'Conectado' : 'Desconectado'}
                                    </span>
                                    <button 
                                        onClick={() => toggleCalendar('google')}
                                        className={`text-sm font-bold px-4 py-2 rounded-lg transition ${calendarSync.google ? 'text-red-500 hover:bg-red-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    >
                                        {calendarSync.google ? 'Desconectar' : 'Conectar'}
                                    </button>
                                </div>
                            </div>

                            {/* Outlook Calendar Card */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center p-2 shadow-sm">
                                            <CalendarDays className="text-blue-700 w-full h-full" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">Outlook Calendar</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Exportação .ICS e Web</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                        Integração com calendário Microsoft Outlook e Office 365.
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${calendarSync.outlook ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {calendarSync.outlook ? 'Conectado' : 'Desconectado'}
                                    </span>
                                    <button 
                                        onClick={() => toggleCalendar('outlook')}
                                        className={`text-sm font-bold px-4 py-2 rounded-lg transition ${calendarSync.outlook ? 'text-red-500 hover:bg-red-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    >
                                        {calendarSync.outlook ? 'Desconectar' : 'Conectar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM FIELDS CONFIG */}
            {activeTab === 'custom_fields' && (
                <div>
                    <SectionTitle title="Campos Personalizados (No-Code)" subtitle="Adicione novos campos aos formulários sem programar." />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Form ... */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Plus size={18}/> Novo Campo</h3>
                            <form onSubmit={handleCreateCustomField} className="space-y-4">
                                {/* ... inputs ... */}
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Módulo de Destino</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newFieldForm.module} onChange={e => setNewFieldForm({...newFieldForm, module: e.target.value as any})}><option value="leads">Leads (Pipeline)</option><option value="clients">Clientes (Carteira)</option></select></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Campo</label><input type="text" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none" placeholder="Ex: Data de Aniversário" value={newFieldForm.label || ''} onChange={e => handleLabelChange(e.target.value)}/></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Chave</label><input type="text" required readOnly className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-xs cursor-not-allowed" value={newFieldForm.key || ''}/></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newFieldForm.type} onChange={e => setNewFieldForm({...newFieldForm, type: e.target.value as any})}><option value="text">Texto</option><option value="number">Número</option><option value="date">Data</option><option value="boolean">Sim/Não</option><option value="select">Lista</option></select></div></div>
                                {newFieldForm.type === 'select' && (<div><label className="block text-xs font-bold text-blue-700 dark:text-blue-300 uppercase mb-1">Opções</label><input type="text" className="w-full border border-blue-200 dark:border-blue-700 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-sm" placeholder="Opção A, Opção B..." value={fieldOptionsInput} onChange={e => setFieldOptionsInput(e.target.value)}/></div>)}
                                <div className="flex items-center gap-2 py-2"><input type="checkbox" id="req-check" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" checked={newFieldForm.required} onChange={e => setNewFieldForm({...newFieldForm, required: e.target.checked})}/><label htmlFor="req-check" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">Tornar este campo obrigatório</label></div>
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm">Adicionar Campo</button>
                            </form>
                        </div>
                        {/* List */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800">Campos Ativos ({customFields.length})</div>
                            <div className="divide-y divide-slate-200 dark:divide-slate-700 overflow-y-auto custom-scrollbar flex-1 max-h-[500px]">
                                {customFields.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400"><Settings2 size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">Nenhum campo criado.</p><button onClick={() => restoreDefaults('custom_fields')} className="mt-4 text-blue-600 hover:underline text-xs font-bold flex items-center justify-center gap-1 mx-auto"><RefreshCw size={12}/> Restaurar Padrões</button></div>
                                ) : (
                                    customFields.map(field => (
                                        <div key={field.id} className="p-4 flex justify-between items-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <div><div className="flex items-center gap-2 mb-1"><span className="font-bold text-slate-800 dark:text-white text-sm">{field.label}</span></div><div className="flex gap-2 text-xs"><span className="font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">{field.key}</span><span className="flex items-center gap-1 text-slate-500"><Package size={10}/> {field.module}</span></div></div>
                                            <button onClick={() => deleteCustomField(field.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"><Trash2 size={16}/></button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WEBHOOKS CONFIG */}
            {activeTab === 'webhooks' && (
                <div>
                    <SectionTitle title="Webhooks & Integrações (API)" subtitle="Conecte o Nexus a sistemas externos." />
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Novo Webhook</h3>
                            <form onSubmit={handleCreateWebhook} className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label><input type="text" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none" placeholder="Ex: Zapier" value={newWebhookForm.name} onChange={e => setNewWebhookForm({...newWebhookForm, name: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">URL</label><input type="url" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none font-mono text-xs" placeholder="https://..." value={newWebhookForm.url} onChange={e => setNewWebhookForm({...newWebhookForm, url: e.target.value})}/></div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm">Adicionar Webhook</button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                             {webhooks.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700"><Link2 size={48} className="mx-auto mb-2 opacity-20"/><p>Nenhum webhook.</p><button onClick={() => restoreDefaults('webhooks')} className="mt-4 text-blue-600 hover:underline text-xs font-bold flex items-center justify-center gap-1 mx-auto"><RefreshCw size={12}/> Restaurar Padrões</button></div>
                            ) : (
                                webhooks.map(hook => (
                                    <div key={hook.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm flex justify-between items-center gap-4">
                                        <div><h4 className="font-bold text-slate-800 dark:text-white">{hook.name}</h4><p className="text-xs text-slate-500 truncate">{hook.url}</p></div>
                                        <div className="flex gap-2"><button onClick={() => handleTestWebhook(hook)} className="px-3 py-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition">Testar</button><button onClick={() => deleteWebhook(hook.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button></div>
                                    </div>
                                ))
                            )}
                        </div>
                     </div>
                </div>
            )}

            {/* SAAS ADMIN TAB */}
            {activeTab === 'saas_admin' && isSuperAdmin && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <SectionTitle title="Gestão de Tenants" subtitle="Administração multi-inquilino." />
                        <button onClick={() => setIsNewTenantModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 shadow-sm"><Plus size={16}/> Criar Org</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs"><tr><th className="p-4">Nome</th><th className="p-4">Plano</th><th className="p-4 text-center">Status</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{saasOrgs.map(org => (<tr key={org.id}><td className="p-4 font-bold text-slate-800 dark:text-white">{org.name}</td><td className="p-4"><Badge color="purple">{org.plan}</Badge></td><td className="p-4 text-center"><Badge color="green">Active</Badge></td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* ADD MEMBER MODAL */}
      {isTeamModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Adicionar Membro</h3>
                      <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleAddMember} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                          <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                          <input required type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Função</label>
                          <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as any})}>
                              {Object.keys(ROLE_NAMES).filter(r => r !== 'client').map(r => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}
                          </select>
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Enviar Convite</button>
                  </form>
              </div>
          </div>
      )}

      {/* DELETE MEMBER MODAL */}
      {isDeleteMemberModalOpen && memberToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                          <Trash2 size={32}/>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Remover Membro?</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Tem certeza que deseja remover <strong>{memberToDelete.name}</strong> da equipe?</p>
                      <div className="flex gap-3">
                          <button onClick={() => setIsDeleteMemberModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                          <button onClick={handleDeleteMember} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md">Remover</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* PRODUCT MODAL */}
      {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingProductId ? 'Editar Produto' : 'Novo Produto'}</h3>
                      <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Produto</label>
                          <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                          <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preço (R$)</label>
                              <input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                              <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.category || 'Subscription'} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}>
                                  <option value="Subscription">Assinatura</option>
                                  <option value="Service">Serviço</option>
                                  <option value="Product">Produto Físico</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <input type="checkbox" id="active-prod" checked={newProduct.active} onChange={e => setNewProduct({...newProduct, active: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                          <label htmlFor="active-prod" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">Produto Ativo</label>
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20">Salvar Produto</button>
                  </form>
              </div>
          </div>
      )}

      {/* DELETE PRODUCT MODAL */}
      {isDeleteProductModalOpen && productToDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/30">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><AlertTriangle className="text-red-600 dark:text-red-400"/> Excluir Produto</h3>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300">Você está prestes a excluir o produto <strong>{productToDelete.name}</strong>. Esta ação requer uma justificativa.</p>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Justificativa</label>
                          <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Motivo da exclusão..." value={productDeleteReason} onChange={e => setProductDeleteReason(e.target.value)} />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setIsDeleteProductModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                          <button onClick={handleDeleteProduct} disabled={productDeleteReason.length < 5} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md disabled:opacity-50">Excluir</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* SQL SCHEMA MODAL */}
      {showSqlModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-scale-in border border-slate-700 flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                      <h3 className="font-bold text-white flex items-center gap-2"><Database size={18} className="text-emerald-400"/> Schema SQL</h3>
                      <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="p-0 overflow-auto bg-[#0d1117] flex-1 custom-scrollbar">
                      <pre className="text-xs font-mono text-emerald-400 p-6 leading-relaxed select-text">
{`-- SQL SCHEMA FOR NEXUS CRM (Supabase) --

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Organizations (Tenants)
create table public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  plan text default 'Standard',
  subscription_status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Profiles (Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text default 'user',
  avatar text,
  organization_id uuid references public.organizations(id),
  related_client_id text, -- Links to clients table for portal access
  xp integer default 0,
  level integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Clients
create table public.clients (
  id text primary key, -- Using text ID for flexibility (C-123)
  name text not null,
  contact_person text,
  email text,
  phone text,
  document text, -- CNPJ/CPF
  segment text,
  status text default 'Active',
  ltv numeric default 0,
  health_score integer default 100,
  nps integer default 0,
  organization_id uuid references public.organizations(id),
  contracted_products text[], -- Array of strings
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Leads
create table public.leads (
  id text primary key,
  name text not null,
  company text,
  email text,
  phone text,
  value numeric default 0,
  status text default 'Novo',
  source text,
  probability integer default 0,
  organization_id uuid references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Activities
create table public.activities (
  id text primary key,
  title text not null,
  type text,
  due_date timestamp with time zone,
  completed boolean default false,
  related_to text,
  assignee uuid references public.profiles(id),
  description text,
  organization_id uuid references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tickets
create table public.tickets (
  id text primary key,
  subject text not null,
  description text,
  customer text,
  priority text,
  status text default 'Aberto',
  channel text,
  organization_id uuid references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security) for multi-tenancy
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.tickets enable row level security;

-- Policies (Example for Clients)
create policy "Users can view clients in their org"
  on public.clients for select
  using (organization_id in (
    select organization_id from public.profiles
    where id = auth.uid()
  ));
`}
                      </pre>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
