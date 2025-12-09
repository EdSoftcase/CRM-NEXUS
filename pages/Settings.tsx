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

  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'permissions' | 'audit' | 'integrations' | 'products' | 'saas_admin' | 'portal_config' | 'bridge' | 'custom_fields' | 'webhooks'>(() => {
      return (sessionStorage.getItem('nexus_settings_tab') as any) || 'profile';
  });

  const [isEditingProfile, setIsEditingProfile] = useState(() => {
      return sessionStorage.getItem('nexus_settings_edit_profile') === 'true';
  });

  const [logSearch, setLogSearch] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  
  const isSuperAdmin = currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription' });
  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productDeleteReason, setProductDeleteReason] = useState('');

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });
  const [isDeleteMemberModalOpen, setIsDeleteMemberModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

  const [newTenantForm, setNewTenantForm] = useState({ name: '', slug: '', adminEmail: '', plan: 'Standard', adminPassword: '' });
  const [generatedTenantData, setGeneratedTenantData] = useState<{ id: string, sql: string, steps: string, welcomeMessage: string } | null>(null);
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [saasOrgs, setSaasOrgs] = useState<Organization[]>([]);
  const [loadingSaas, setLoadingSaas] = useState(false);

  const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<''>('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  
  const [syncStats, setSyncStats] = useState<{label: string, local: number, remote: number | string, status: 'synced'|'diff'|'error'}[]>([]);
  const [isCheckingSync, setIsCheckingSync] = useState(false);

  const [portalForm, setPortalForm] = useState<PortalSettings>(portalSettings);

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
      'Notification' in window ? Notification.permission : 'default'
  );

  const [bridgeStatus, setBridgeStatus] = useState<{whatsapp: string, smtp: string}>({ whatsapp: 'OFFLINE', smtp: 'OFFLINE' });
  const [bridgeQr, setBridgeQr] = useState<string | null>(null);
  const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: 587, user: '', pass: '' });
  const [loadingBridge, setLoadingBridge] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const [newFieldForm, setNewFieldForm] = useState<Partial<CustomFieldDefinition>>({ type: 'text', module: 'leads', required: false });
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  const [newWebhookForm, setNewWebhookForm] = useState<Partial<WebhookConfig>>({ triggerEvent: 'lead_created', method: 'POST', active: true });
  
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '', avatar: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('sales');

  useEffect(() => {
      if (currentUser) {
          setProfileForm(prev => ({
              ...prev,
              name: currentUser.name || '',
              email: currentUser.email || '',
              phone: currentUser.phone || '',
              cpf: currentUser.cpf || '',
              avatar: prev.avatar || currentUser.avatar || ''
          }));
      }
  }, [currentUser]);

  useEffect(() => {
      sessionStorage.setItem('nexus_settings_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
      sessionStorage.setItem('nexus_settings_edit_profile', String(isEditingProfile));
  }, [isEditingProfile]);

  useEffect(() => {
      setPortalForm(portalSettings);
  }, [portalSettings]);

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
          
          if (config.url && config.key) {
              setConnectionStatus('success'); 
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
  
  const handleSaveSupabase = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      setConnectionStatus('testing'); 
      setStatusMessage('');
      saveSupabaseConfig(supabaseForm.url, supabaseForm.key); 
      const result = await testSupabaseConnection(); 
      if (result.success) { 
          setConnectionStatus('success'); 
          setStatusMessage(result.message as any); 
          handleForceUpdate();
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
      if (!supabase) { setIsCheckingSync(false); return; }
      const tables = [
          { name: 'leads', local: leads.length, label: 'Leads (Comercial)' },
          { name: 'clients', local: clients.length, label: 'Clientes' },
          { name: 'tickets', local: tickets.length, label: 'Chamados' },
          { name: 'invoices', local: invoices.length, label: 'Faturas' },
          { name: 'activities', local: activities.length, label: 'Atividades' },
          { name: 'products', local: products.length, label: 'Produtos' },
          { name: 'projects', local: projects.length, label: 'Projetos' },
          { name: 'competitors', local: competitors.length, label: 'Concorrentes (Spy)' },
          { name: 'market_trends', local: marketTrends.length, label: 'Tendências (Spy)' },
          { name: 'custom_fields', local: customFields.length, label: 'Campos Pers.' },
          { name: 'webhooks', local: webhooks.length, label: 'Webhooks' }
      ];
      const stats = [];
      for (const t of tables) {
          try {
              const { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
              const remoteCount = error ? -1 : (count || 0);
              const status = error ? 'error' : (t.local === remoteCount ? 'synced' : 'diff');
              stats.push({ label: t.label, local: t.local, remote: remoteCount === -1 ? 'Erro' : remoteCount, status: status as any });
          } catch (e) {
              stats.push({ label: t.label, local: t.local, remote: 'Erro', status: 'error' });
          }
      }
      setSyncStats(stats);
      setIsCheckingSync(false);
  };

  const handleForceUpdate = async () => { await refreshData(); await handleCheckSync(); };
  const compressImage = (file: File): Promise<string> => { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target?.result as string; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 400; canvas.height = 400; ctx?.drawImage(img, 0, 0, 400, 400); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; }; }); };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setIsCompressing(true); const base64 = await compressImage(file); setProfileForm(prev => ({...prev, avatar: base64})); setIsCompressing(false); } };
  const handleUpdateProfile = (e: React.FormEvent) => { e.preventDefault(); updateUser(profileForm); setIsEditingProfile(false); };
  const handleAddMember = async (e: React.FormEvent) => { e.preventDefault(); await addTeamMember(newMember.name, newMember.email, newMember.role); setIsTeamModalOpen(false); setNewMember({ name: '', email: '', role: 'sales' }); };
  const handleDeleteMember = async () => { if (memberToDelete) { try { await adminDeleteUser(memberToDelete.id); setIsDeleteMemberModalOpen(false); setMemberToDelete(null); } catch (e) { console.error("Error deleting user", e); alert("Erro ao excluir usuário."); } } };
  const handleToggleStatus = async (user: User) => { const newStatus = user.active === false ? true : false; await adminUpdateUser(user.id, { active: newStatus }); };
  const handleSaveProduct = (e: React.FormEvent) => { e.preventDefault(); if (editingProductId) { updateProduct(currentUser!, { ...newProduct, id: editingProductId } as Product); } else { addProduct(currentUser!, { ...newProduct, id: `PROD-${Date.now()}` } as Product); } setIsProductModalOpen(false); setEditingProductId(null); setNewProduct({ active: true, category: 'Subscription' }); };
  const handleDeleteProduct = () => { if (productToDelete) { removeProduct(currentUser!, productToDelete.id, productDeleteReason); setIsDeleteProductModalOpen(false); setProductToDelete(null); } };
  const handleEditProduct = (prod: Product) => { setEditingProductId(prod.id); setNewProduct(prod); setIsProductModalOpen(true); };
  const handleSavePortal = () => { updatePortalSettings(currentUser!, portalForm); alert('Configurações do portal salvas!'); };
  const generateSlug = (text: string) => { return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_'); };
  const handleLabelChange = (val: string) => { setNewFieldForm(prev => ({ ...prev, label: val, key: generateSlug(val) })); };
  const handleCreateCustomField = (e: React.FormEvent) => { e.preventDefault(); if (!newFieldForm.label || !newFieldForm.key) return; const field: CustomFieldDefinition = { id: `cf-${Date.now()}`, label: newFieldForm.label, key: newFieldForm.key, type: newFieldForm.type || 'text', module: newFieldForm.module || 'leads', required: newFieldForm.required || false, options: newFieldForm.type === 'select' ? fieldOptionsInput.split(',').map(s => s.trim()).filter(s => s) : undefined, organizationId: currentOrganization?.id }; addCustomField(field); setNewFieldForm({ type: 'text', module: 'leads', required: false, label: '', key: '' }); setFieldOptionsInput(''); };
  const handleCreateWebhook = (e: React.FormEvent) => { e.preventDefault(); if (!newWebhookForm.name || !newWebhookForm.url) return; const hook: WebhookConfig = { id: `wh-${Date.now()}`, name: newWebhookForm.name, url: newWebhookForm.url, triggerEvent: newWebhookForm.triggerEvent || 'lead_created', method: newWebhookForm.method || 'POST', active: newWebhookForm.active !== undefined ? newWebhookForm.active : true, organizationId: currentOrganization?.id }; addWebhook(hook); setNewWebhookForm({ triggerEvent: 'lead_created', method: 'POST', active: true, name: '', url: '' }); };
  const handleTestWebhook = async (hook: WebhookConfig) => { try { const payload = { test: true, timestamp: new Date().toISOString(), trigger: hook.triggerEvent }; await fetch(hook.url, { method: hook.method, headers: { 'Content-Type': 'application/json' }, body: hook.method === 'POST' ? JSON.stringify(payload) : undefined }); alert(`Teste disparado para ${hook.url}`); } catch (e: any) { alert(`Erro ao testar: ${e.message}`); } };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header and Tabs */}
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
                <div className="max-w-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <SectionTitle title="Meu Perfil" subtitle="Gerencie suas informações pessoais e de acesso." />
                        {!isEditingProfile && (
                            <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition font-medium">
                                <Edit2 size={16}/> Editar
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleUpdateProfile}>
                        <div className="flex items-center gap-6 mb-8">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-500 dark:text-slate-400 overflow-hidden border-4 border-white dark:border-slate-600 shadow-md">
                                    {profileForm.avatar && (profileForm.avatar.startsWith('data:') || profileForm.avatar.startsWith('http')) ? (
                                        <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{currentUser?.name?.charAt(0)}</span>
                                    )}
                                </div>
                                {isEditingProfile && (
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        {isCompressing ? <Loader2 className="animate-spin text-white"/> : <Camera className="text-white"/>}
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser?.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400">{ROLE_NAMES[currentUser?.role || 'admin']}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                                <input disabled={!isEditingProfile} type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-60" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">E-mail</label>
                                <input disabled type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed" value={profileForm.email}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Telefone</label>
                                <input disabled={!isEditingProfile} type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-60" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">CPF</label>
                                <input disabled={!isEditingProfile} type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-60" value={profileForm.cpf} onChange={e => setProfileForm({...profileForm, cpf: e.target.value})}/>
                            </div>
                        </div>

                        {isEditingProfile && (
                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">Salvar Alterações</button>
                            </div>
                        )}
                    </form>
                </div>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <SectionTitle title="Gestão de Equipe" subtitle="Controle quem tem acesso ao sistema." />
                        <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition">
                            <Plus size={18}/> Novo Membro
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs">
                                <tr><th className="p-4">Usuário</th><th className="p-4">Função</th><th className="p-4">Status</th><th className="p-4 text-center">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {usersList.filter(u => u.role !== 'client').map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300 overflow-hidden">
                                                {user.avatar && user.avatar.length > 2 ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{ROLE_NAMES[user.role]}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${user.active !== false ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                {user.active !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition ${user.active !== false ? 'text-red-500' : 'text-green-500'}`}
                                                    title={user.active !== false ? "Inativar" : "Ativar"}
                                                >
                                                    <Power size={16}/>
                                                </button>
                                                <button onClick={() => { setMemberToDelete(user); setIsDeleteMemberModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"><Trash2 size={16}/></button>
                                            </div>
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
                <div className="space-y-6 animate-fade-in">
                    <SectionTitle title="Matriz de Permissões" subtitle="Defina o que cada função pode acessar." />
                    
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {Object.keys(ROLE_NAMES).filter(r => r !== 'client').map((role) => (
                            <button
                                key={role}
                                onClick={() => setSelectedRoleForPerms(role as Role)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${selectedRoleForPerms === role ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {ROLE_NAMES[role]}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600">
                                <tr>
                                    <th className="p-4 text-left uppercase text-xs font-bold">Módulo</th>
                                    <th className="p-4 text-center w-24">Visualizar</th>
                                    <th className="p-4 text-center w-24">Criar</th>
                                    <th className="p-4 text-center w-24">Editar</th>
                                    <th className="p-4 text-center w-24">Excluir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {Object.entries(MODULE_NAMES).map(([moduleKey, moduleLabel]) => {
                                    const perms = permissionMatrix[selectedRoleForPerms]?.[moduleKey] || { view: false, create: false, edit: false, delete: false };
                                    return (
                                        <tr key={moduleKey} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4 font-medium text-slate-800 dark:text-white">{moduleLabel}</td>
                                            {(['view', 'create', 'edit', 'delete'] as PermissionAction[]).map(action => (
                                                <td key={action} className="p-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={perms[action]} 
                                                        onChange={(e) => updatePermission(selectedRoleForPerms, moduleKey, action, e.target.checked)}
                                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                                        disabled={selectedRoleForPerms === 'admin'} 
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
                <div className="space-y-6">
                    <SectionTitle title="Logs de Auditoria" subtitle="Rastreabilidade completa de ações no sistema." />
                    
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="Buscar por usuário, ação ou módulo..." 
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700 dark:text-white text-sm"
                                value={logSearch}
                                onChange={(e) => setLogSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs sticky top-0 z-10 shadow-sm">
                                    <tr><th className="p-4">Data/Hora</th><th className="p-4">Usuário</th><th className="p-4">Ação</th><th className="p-4">Módulo</th><th className="p-4">Detalhes</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {logs?.filter(l => 
                                        l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
                                        l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
                                        l.module.toLowerCase().includes(logSearch.toLowerCase())
                                    ).map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{log.userName}</td>
                                            <td className="p-4 text-blue-600 dark:text-blue-400 font-medium">{log.action}</td>
                                            <td className="p-4"><Badge>{log.module}</Badge></td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.details}>{log.details}</td>
                                        </tr>
                                    ))}
                                    {(!logs || logs.length === 0) && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum registro encontrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <SectionTitle title="Catálogo de Produtos" subtitle="Gerencie os produtos/serviços oferecidos." />
                        <button onClick={() => { setEditingProductId(null); setNewProduct({ active: true, category: 'Subscription' }); setIsProductModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition">
                            <Plus size={18}/> Novo Produto
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(prod => (
                            <div key={prod.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge color={prod.category === 'Subscription' ? 'purple' : 'blue'}>{prod.category}</Badge>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => handleEditProduct(prod)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit2 size={16}/></button>
                                        <button onClick={() => { setProductToDelete(prod); setIsDeleteProductModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{prod.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[40px]">{prod.description}</p>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <span className="font-mono text-xs text-slate-400">{prod.sku}</span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">R$ {prod.price.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PORTAL CONFIG TAB */}
            {activeTab === 'portal_config' && (
                <div className="max-w-3xl space-y-6">
                    <SectionTitle title="Personalização do Portal" subtitle="Ajuste a aparência e funcionalidades do portal do cliente." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome do Portal</label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={portalForm.portalName} onChange={e => setPortalForm({...portalForm, portalName: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cor Primária</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" className="w-12 h-12 rounded cursor-pointer border-0" value={portalForm.primaryColor} onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})}/>
                                    <input type="text" className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white uppercase font-mono" value={portalForm.primaryColor} onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})}/>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mensagem de Boas-vindas</label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white h-24 resize-none" value={portalForm.welcomeMessage || ''} onChange={e => setPortalForm({...portalForm, welcomeMessage: e.target.value})} placeholder="Ex: Bem-vindo ao portal de clientes da Nexus." />
                            </div>
                        </div>

                        <div className="mt-6 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">Permitir Download de Faturas</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Clientes podem baixar boletos/PDFs.</p>
                                </div>
                                <input type="checkbox" className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" checked={portalForm.allowInvoiceDownload} onChange={e => setPortalForm({...portalForm, allowInvoiceDownload: e.target.checked})}/>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">Permitir Abertura de Chamados</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Clientes podem criar tickets de suporte.</p>
                                </div>
                                <input type="checkbox" className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" checked={portalForm.allowTicketCreation} onChange={e => setPortalForm({...portalForm, allowTicketCreation: e.target.checked})}/>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button onClick={handleSavePortal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition flex items-center gap-2">
                                <Save size={18}/> Salvar Configurações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BRIDGE TAB */}
            {activeTab === 'bridge' && (
                <div className="space-y-8 animate-fade-in">
                    <SectionTitle title="Nexus Bridge (Conexões Locais)" subtitle="Gerencie a conexão com WhatsApp Web e SMTP local." />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* WhatsApp Panel */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                                    <MessageCircle className="text-green-500"/> WhatsApp Bridge
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${bridgeStatus.whatsapp === 'READY' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                    {bridgeStatus.whatsapp === 'READY' ? 'CONECTADO' : 'DESCONECTADO'}
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center min-h-[250px] bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 p-6">
                                {loadingBridge ? (
                                    <div className="text-center">
                                        <Loader2 className="w-10 h-10 text-slate-400 animate-spin mx-auto mb-3"/>
                                        <p className="text-slate-500 text-sm">Verificando status...</p>
                                    </div>
                                ) : bridgeStatus.whatsapp === 'READY' ? (
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                                            <Wifi size={32}/>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">Sessão Ativa</h4>
                                        <p className="text-sm text-slate-500 mt-1">Pronto para enviar mensagens.</p>
                                    </div>
                                ) : bridgeQr ? (
                                    <div className="text-center">
                                        <img src={bridgeQr} alt="QR Code" className="w-48 h-48 mx-auto mb-4 border-4 border-white shadow-sm rounded-lg"/>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Escaneie com seu WhatsApp</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <WifiOff size={32}/>
                                        </div>
                                        <p className="text-slate-500 text-sm mb-4">Servidor Bridge não detectado ou offline.</p>
                                        <button onClick={handleManualBridgeCheck} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm">
                                            Tentar Conectar
                                        </button>
                                        {bridgeError && <p className="text-xs text-red-500 mt-3 max-w-xs mx-auto">{bridgeError}</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SMTP Panel */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                                    <Mail className="text-blue-500"/> SMTP Relay
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${bridgeStatus.smtp === 'CONFIGURED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                    {bridgeStatus.smtp === 'CONFIGURED' ? 'CONFIGURADO' : 'PENDENTE'}
                                </div>
                            </div>

                            <form onSubmit={handleSaveSmtp} className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Host</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.host} onChange={e => setSmtpForm({...smtpForm, host: e.target.value})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Porta</label>
                                        <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.port} onChange={e => setSmtpForm({...smtpForm, port: Number(e.target.value)})}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Usuário / Email</label>
                                    <input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.user} onChange={e => setSmtpForm({...smtpForm, user: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Senha / App Password</label>
                                    <input type="password" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.pass} onChange={e => setSmtpForm({...smtpForm, pass: e.target.value})}/>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" disabled={loadingBridge} className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition shadow-sm flex items-center justify-center gap-2">
                                        {loadingBridge ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Salvar Configuração
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM FIELDS TAB */}
            {activeTab === 'custom_fields' && (
                <div className="max-w-4xl space-y-8 animate-fade-in">
                    <SectionTitle title="Campos Personalizados" subtitle="Estenda os dados de Leads e Clientes." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4">Adicionar Novo Campo</h4>
                        <form onSubmit={handleCreateCustomField} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Rótulo (Label)</label>
                                    <input required type="text" className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.label} onChange={e => handleLabelChange(e.target.value)} placeholder="Ex: Data de Aniversário"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Chave (ID único)</label>
                                    <input disabled type="text" className="w-full border rounded p-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" value={newFieldForm.key} placeholder="data_aniversario"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Dado</label>
                                    <select className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.type} onChange={e => setNewFieldForm({...newFieldForm, type: e.target.value as any})}>
                                        <option value="text">Texto</option>
                                        <option value="number">Número</option>
                                        <option value="date">Data</option>
                                        <option value="boolean">Sim/Não</option>
                                        <option value="select">Seleção (Lista)</option>
                                    </select>
                                </div>
                            </div>
                            
                            {newFieldForm.type === 'select' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Opções (separadas por vírgula)</label>
                                    <input type="text" className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={fieldOptionsInput} onChange={e => setFieldOptionsInput(e.target.value)} placeholder="Opção A, Opção B, Opção C"/>
                                </div>
                            )}

                            <div className="flex items-center gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="field_req" className="w-4 h-4 text-blue-600 rounded" checked={newFieldForm.required} onChange={e => setNewFieldForm({...newFieldForm, required: e.target.checked})}/>
                                    <label htmlFor="field_req" className="text-sm text-slate-700 dark:text-slate-300">Campo Obrigatório</label>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Módulo:</label>
                                    <select className="border rounded p-1 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.module} onChange={e => setNewFieldForm({...newFieldForm, module: e.target.value as any})}>
                                        <option value="leads">Leads</option>
                                        <option value="clients">Clientes</option>
                                    </select>
                                </div>
                                <button type="submit" className="ml-auto px-6 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 transition">Adicionar Campo</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs">
                                <tr><th className="p-4">Rótulo</th><th className="p-4">Chave</th><th className="p-4">Tipo</th><th className="p-4">Módulo</th><th className="p-4 text-center">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {customFields.map(field => (
                                    <tr key={field.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 font-bold text-slate-800 dark:text-white">{field.label}</td>
                                        <td className="p-4 font-mono text-slate-500 text-xs">{field.key}</td>
                                        <td className="p-4"><Badge>{field.type}</Badge></td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 capitalize">{field.module}</td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => deleteCustomField(field.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {customFields.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum campo personalizado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* WEBHOOKS TAB */}
            {activeTab === 'webhooks' && (
                <div className="max-w-4xl space-y-8 animate-fade-in">
                    <SectionTitle title="Webhooks & API" subtitle="Integre o Nexus com sistemas externos." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4">Novo Webhook</h4>
                        <form onSubmit={handleCreateWebhook} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                                    <input required type="text" className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.name} onChange={e => setNewWebhookForm({...newWebhookForm, name: e.target.value})} placeholder="Ex: Zapier Integration"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endpoint URL</label>
                                    <input required type="url" className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono" value={newWebhookForm.url} onChange={e => setNewWebhookForm({...newWebhookForm, url: e.target.value})} placeholder="https://hooks.zapier.com/..."/>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Evento Gatilho</label>
                                    <select className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.triggerEvent} onChange={e => setNewWebhookForm({...newWebhookForm, triggerEvent: e.target.value as any})}>
                                        <option value="lead_created">Novo Lead</option>
                                        <option value="deal_won">Venda Ganha</option>
                                        <option value="ticket_created">Ticket Criado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Método</label>
                                    <select className="w-full border rounded p-2 text-sm bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.method} onChange={e => setNewWebhookForm({...newWebhookForm, method: e.target.value as any})}>
                                        <option value="POST">POST</option>
                                        <option value="GET">GET</option>
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded shadow-sm hover:bg-indigo-700 transition text-sm">Adicionar Webhook</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs">
                                <tr><th className="p-4">Nome</th><th className="p-4">URL</th><th className="p-4">Evento</th><th className="p-4">Status</th><th className="p-4 text-center">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {webhooks.map(hook => (
                                    <tr key={hook.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 font-bold text-slate-800 dark:text-white">{hook.name}</td>
                                        <td className="p-4 font-mono text-slate-500 text-xs truncate max-w-[200px]" title={hook.url}>{hook.url}</td>
                                        <td className="p-4"><Badge>{hook.triggerEvent}</Badge></td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${hook.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                <span className="text-xs text-slate-600 dark:text-slate-300">{hook.active ? 'Ativo' : 'Inativo'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button onClick={() => handleTestWebhook(hook)} className="p-1.5 text-slate-400 hover:text-blue-500 transition rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Testar Disparo"><Zap size={16}/></button>
                                            <button onClick={() => updateWebhook({...hook, active: !hook.active})} className="p-1.5 text-slate-400 hover:text-orange-500 transition rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Ativar/Desativar"><Power size={16}/></button>
                                            <button onClick={() => deleteWebhook(hook.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Excluir"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {webhooks.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum webhook configurado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* INTEGRATIONS TAB (UPDATED WITH SYNC CHECK) */}
            {activeTab === 'integrations' && (
                <div className="max-w-3xl space-y-8 animate-fade-in">
                    {/* ... Database Config Form ... */}
                    <div>
                        <SectionTitle title="Conexão com Banco de Dados" subtitle="Configure o backend Supabase para persistência de dados." />
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-4">
                            {/* ... Connection Form Content ... */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : connectionStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                    Status: {connectionStatus === 'success' ? 'Conectado' : connectionStatus === 'testing' ? 'Verificando...' : 'Desconectado'}
                                </span>
                            </div>

                            <form onSubmit={handleSaveSupabase} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Project URL</label>
                                    <input type="url" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm" placeholder="https://xyz.supabase.co" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">API Key (Anon/Public)</label>
                                    <div className="relative">
                                        <input type="password" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm pr-10" placeholder="eyJ..." value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})}/>
                                        <Lock size={16} className="absolute right-3 top-3.5 text-slate-400"/>
                                    </div>
                                </div>
                                {statusMessage && (
                                    <div className={`p-3 rounded text-sm flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                        {connectionStatus === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>} {statusMessage}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={connectionStatus === 'testing'} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-70">
                                        {connectionStatus === 'testing' ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar e Conectar
                                    </button>
                                    <button type="button" onClick={handleGenerateSchema} className="px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <Code size={18}/> Ver Schema SQL
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Sync Stats */}
                    {connectionStatus === 'success' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <SectionTitle title="Diagnóstico de Sincronização" subtitle="Comparativo entre dados locais e nuvem." />
                                <button onClick={handleForceUpdate} disabled={isCheckingSync || isSyncing} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50">
                                    {(isCheckingSync || isSyncing) ? <Loader2 size={14} className="animate-spin"/> : <ArrowRightLeft size={14}/>} Forçar Atualização
                                </button>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs">
                                        <tr><th className="p-4">Tabela</th><th className="p-4 text-center">Local (App)</th><th className="p-4 text-center">Nuvem (Supabase)</th><th className="p-4 text-right">Status</th></tr>
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
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">Carregando diagnóstico...</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

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

-- 0. Helper Function (Fixes Infinite Recursion)
-- This function allows policies to check the user's org without triggering RLS loops
CREATE OR REPLACE FUNCTION public.get_auth_user_org_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- IMPORTANT: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_user_org_id() TO authenticated, service_role;

-- 1. Enable Extensions
create extension if not exists "uuid-ossp";

-- 2. Organizations
create table if not exists public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  plan text default 'Standard',
  subscription_status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Profiles (Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text default 'user',
  avatar text,
  organization_id text references public.organizations(id),
  related_client_id text,
  xp integer default 0,
  level integer default 1,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Clients
create table if not exists public.clients (
  id text primary key,
  name text not null,
  contact_person text,
  email text,
  phone text,
  document text,
  segment text,
  status text default 'Active',
  ltv numeric default 0,
  health_score integer default 100,
  nps integer default 0,
  organization_id text references public.organizations(id),
  contracted_products text[],
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Leads
create table if not exists public.leads (
  id text primary key,
  name text not null,
  company text,
  email text,
  phone text,
  value numeric default 0,
  status text default 'Novo',
  source text,
  probability integer default 0,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Activities
create table if not exists public.activities (
  id text primary key,
  title text not null,
  type text,
  due_date timestamp with time zone,
  completed boolean default false,
  related_to text,
  assignee uuid references public.profiles(id),
  description text,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tickets
create table if not exists public.tickets (
  id text primary key,
  subject text not null,
  description text,
  customer text,
  priority text,
  status text default 'Aberto',
  channel text,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Competitors (Nexus Spy)
create table if not exists public.competitors (
  id text primary key,
  name text not null,
  website text,
  sector text,
  last_analysis timestamp with time zone,
  swot jsonb, 
  battlecard jsonb,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Market Trends (Nexus Spy)
create table if not exists public.market_trends (
  id text primary key,
  title text not null,
  description text,
  impact text,
  sentiment text,
  date timestamp with time zone,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Projects
create table if not exists public.projects (
  id text primary key,
  title text not null,
  clientName text,
  status text,
  progress integer,
  start_date timestamp with time zone,
  deadline timestamp with time zone,
  manager text,
  tasks jsonb,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Products
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text,
  price numeric default 0,
  sku text,
  category text,
  active boolean default true,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Invoices
create table if not exists public.invoices (
  id text primary key,
  customer text,
  amount numeric,
  due_date timestamp with time zone,
  status text,
  description text,
  organization_id text references public.organizations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Audit Logs
create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamp with time zone,
  user_id text,
  user_name text,
  action text,
  details text,
  module text,
  organization_id text references public.organizations(id)
);

-- 14. Custom Fields
create table if not exists public.custom_fields (
  id text primary key,
  label text not null,
  key text not null,
  type text not null,
  module text not null,
  required boolean default false,
  options text[],
  organization_id text references public.organizations(id)
);

-- 15. Webhooks
create table if not exists public.webhooks (
  id text primary key,
  name text not null,
  url text not null,
  trigger_event text not null,
  method text default 'POST',
  active boolean default true,
  organization_id text references public.organizations(id)
);

-- 16. Proposals
create table if not exists public.proposals (
  id text primary key,
  title text not null,
  lead_id text,
  client_name text,
  company_name text,
  created_date timestamp with time zone,
  valid_until timestamp with time zone,
  status text,
  introduction text,
  scope text[],
  price numeric,
  timeline text,
  terms text,
  signature text,
  signed_at timestamp with time zone,
  signed_by_ip text,
  organization_id text references public.organizations(id)
);

-- MIGRATION: Rename legacy columns to snake_case standard AND Fix Types
DO $$ 
BEGIN
  -- Fix organization_id type (UUID -> TEXT) if created incorrectly
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'custom_fields' AND column_name = 'organization_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.custom_fields ALTER COLUMN organization_id TYPE text USING organization_id::text;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'webhooks' AND column_name = 'organization_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.webhooks ALTER COLUMN organization_id TYPE text USING organization_id::text;
  END IF;

  -- Rename legacy camelCase
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'organizationId') THEN
    ALTER TABLE public.clients RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'organizationId') THEN
    ALTER TABLE public.leads RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'organizationId') THEN
    ALTER TABLE public.activities RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'organizationId') THEN
    ALTER TABLE public.tickets RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'organizationId') THEN
    ALTER TABLE public.products RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'organizationId') THEN
    ALTER TABLE public.projects RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'startDate') THEN
    ALTER TABLE public.projects RENAME COLUMN "startDate" TO start_date;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organizationId') THEN
    ALTER TABLE public.profiles RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'organizationId') THEN
    ALTER TABLE public.competitors RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'market_trends' AND column_name = 'organizationId') THEN
    ALTER TABLE public.market_trends RENAME COLUMN "organizationId" TO organization_id;
  END IF;

  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'organizationId') THEN
    ALTER TABLE public.invoices RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'dueDate') THEN
    ALTER TABLE public.invoices RENAME COLUMN "dueDate" TO due_date;
  END IF;

  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'organizationId') THEN
    ALTER TABLE public.audit_logs RENAME COLUMN "organizationId" TO organization_id;
  END IF;

  -- PROPOSALS MIGRATION
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'organizationId') THEN
    ALTER TABLE public.proposals RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'leadId') THEN
    ALTER TABLE public.proposals RENAME COLUMN "leadId" TO lead_id;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'clientName') THEN
    ALTER TABLE public.proposals RENAME COLUMN "clientName" TO client_name;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'companyName') THEN
    ALTER TABLE public.proposals RENAME COLUMN "companyName" TO company_name;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'createdDate') THEN
    ALTER TABLE public.proposals RENAME COLUMN "createdDate" TO created_date;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'validUntil') THEN
    ALTER TABLE public.proposals RENAME COLUMN "validUntil" TO valid_until;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'signedAt') THEN
    ALTER TABLE public.proposals RENAME COLUMN "signedAt" TO signed_at;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'signedByIp') THEN
    ALTER TABLE public.proposals RENAME COLUMN "signedByIp" TO signed_by_ip;
  END IF;

END $$;

-- --- SECURITY & PERMISSIONS ---

-- 1. Enable RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.tickets enable row level security;
alter table public.competitors enable row level security;
alter table public.market_trends enable row level security;
alter table public.projects enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.audit_logs enable row level security;
alter table public.custom_fields enable row level security;
alter table public.webhooks enable row level security;
alter table public.proposals enable row level security;

-- 2. Grant Access to Roles (Fix for 403 Errors)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Define Policies (Access Control) - USING HELPER FUNCTION TO FIX RECURSION

-- Profiles
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
create policy "Users can view profiles in their org" on public.profiles for select using (
  organization_id = get_auth_user_org_id()
  OR
  id = auth.uid() -- Allow viewing own profile
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Clients
DROP POLICY IF EXISTS "Users can view clients in their org" ON public.clients;
create policy "Users can view clients in their org" on public.clients for all using (organization_id = get_auth_user_org_id());

-- Leads
DROP POLICY IF EXISTS "Users can view leads in their org" ON public.leads;
create policy "Users can view leads in their org" on public.leads for all using (organization_id = get_auth_user_org_id());

-- Competitors
DROP POLICY IF EXISTS "Users can view competitors in their org" ON public.competitors;
create policy "Users can view competitors in their org" on public.competitors for all using (organization_id = get_auth_user_org_id());

-- Market Trends
DROP POLICY IF EXISTS "Users can view market trends in their org" ON public.market_trends;
create policy "Users can view market trends in their org" on public.market_trends for all using (organization_id = get_auth_user_org_id());

-- Projects
DROP POLICY IF EXISTS "Users can view projects in their org" ON public.projects;
create policy "Users can view projects in their org" on public.projects for all using (organization_id = get_auth_user_org_id());

-- Products
DROP POLICY IF EXISTS "Users can view products in their org" ON public.products;
create policy "Users can view products in their org" on public.products for all using (organization_id = get_auth_user_org_id());

-- Activities
DROP POLICY IF EXISTS "Users can view activities in their org" ON public.activities;
create policy "Users can view activities in their org" on public.activities for all using (organization_id = get_auth_user_org_id());

-- Tickets
DROP POLICY IF EXISTS "Users can view tickets in their org" ON public.tickets;
create policy "Users can view tickets in their org" on public.tickets for all using (organization_id = get_auth_user_org_id());

-- Invoices
DROP POLICY IF EXISTS "Users can view invoices in their org" ON public.invoices;
create policy "Users can view invoices in their org" on public.invoices for all using (organization_id = get_auth_user_org_id());

-- Audit Logs
DROP POLICY IF EXISTS "Users can view logs in their org" ON public.audit_logs;
create policy "Users can view logs in their org" on public.audit_logs for all using (organization_id = get_auth_user_org_id());

-- Custom Fields
DROP POLICY IF EXISTS "Users can view custom fields in their org" ON public.custom_fields;
create policy "Users can view custom fields in their org" on public.custom_fields for all using (organization_id = get_auth_user_org_id());

-- Webhooks
DROP POLICY IF EXISTS "Users can view webhooks in their org" ON public.webhooks;
create policy "Users can view webhooks in their org" on public.webhooks for all using (organization_id = get_auth_user_org_id());

-- Proposals
DROP POLICY IF EXISTS "Users can view proposals in their org" ON public.proposals;
create policy "Users can view proposals in their org" on public.proposals for all using (organization_id = get_auth_user_org_id());
`}
                      </pre>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};