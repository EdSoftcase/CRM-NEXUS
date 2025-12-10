
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

const SUPER_ADMIN_EMAILS = ['superadmin@nexus.com', 'edson.softcase@gmail.com'];

export const Settings: React.FC = () => {
  const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, permissionMatrix, updatePermission, sendRecoveryInvite, approveOrganization } = useAuth();
  
  const { leads, clients, tickets, invoices, issues, syncLocalToCloud, isSyncing, refreshData, products, addProduct, updateProduct, removeProduct, activities, portalSettings, updatePortalSettings, campaigns, workflows, marketingContents, projects, notifications, pushEnabled, togglePushNotifications, competitors, marketTrends, prospectingHistory, disqualifiedProspects, customFields, addCustomField, deleteCustomField, webhooks, addWebhook, deleteWebhook, updateWebhook, restoreDefaults } = useData();
  
  const { data: logs } = useAuditLogs();

  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'permissions' | 'audit' | 'integrations' | 'products' | 'saas_admin' | 'portal_config' | 'bridge' | 'custom_fields' | 'webhooks'>(() => {
      return (sessionStorage.getItem('nexus_settings_tab') as any) || 'profile';
  });

  const [isEditingProfile, setIsEditingProfile] = useState(() => {
      return sessionStorage.getItem('nexus_settings_edit_profile') === 'true';
  });

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

  const [saasOrgs, setSaasOrgs] = useState<Organization[]>([]);
  const [loadingSaas, setLoadingSaas] = useState(false);

  const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<''>('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  
  const [syncStats, setSyncStats] = useState<{label: string, local: number, remote: number | string, status: 'synced'|'diff'|'error'}[]>([]);
  const [isCheckingSync, setIsCheckingSync] = useState(false);

  const [portalForm, setPortalForm] = useState<PortalSettings>(portalSettings);

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

  const fetchSaasOrgs = async () => { 
      setLoadingSaas(true); 
      const supabase = getSupabase(); 
      if (supabase) { 
          // Needs a specific RLS policy for Super Admin to see all
          const { data, error } = await supabase.from('organizations').select('*'); 
          if(error) console.error(error);
          setSaasOrgs(data as Organization[] || MOCK_ORGANIZATIONS); 
      } else { 
          setSaasOrgs(MOCK_ORGANIZATIONS); 
      } 
      setLoadingSaas(false); 
  };
  
  const handleApproveOrg = async (orgId: string) => {
      if(approveOrganization) {
          const success = await approveOrganization(orgId);
          if(success) {
              fetchSaasOrgs();
              alert("Organização aprovada com sucesso!");
          } else {
              alert("Erro ao aprovar organização.");
          }
      }
  };

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
          { name: 'webhooks', local: webhooks.length, label: 'Webhooks' },
          { name: 'prospecting_history', local: prospectingHistory.length, label: 'Histórico Prospecção' }
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
                <div className="space-y-6">
                    <SectionTitle title="Matriz de Permissões (RBAC)" subtitle="Defina o que cada perfil pode acessar e modificar." />
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600">
                                    <th className="p-3 border-r border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-100 dark:bg-slate-700 z-10">Módulo / Função</th>
                                    {Object.keys(ROLE_NAMES).filter(r => r !== 'client').map(role => (
                                        <th key={role} className="p-3 text-center min-w-[120px] font-bold text-xs uppercase">{ROLE_NAMES[role]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {['dashboard', 'commercial', 'clients', 'finance', 'support', 'dev', 'reports', 'settings'].map(module => (
                                    <tr key={module} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300 capitalize border-r border-slate-200 dark:border-slate-600 sticky left-0 bg-white dark:bg-slate-800 z-10">
                                            {module.replace('-', ' ')}
                                        </td>
                                        {Object.keys(ROLE_NAMES).filter(r => r !== 'client').map(role => {
                                            const perms = permissionMatrix[role]?.[module] || {view: false, create: false, edit: false, delete: false};
                                            return (
                                                <td key={role} className="p-3">
                                                    <div className="grid grid-cols-2 gap-1 justify-items-center">
                                                        <label title="Visualizar" className="cursor-pointer"><input type="checkbox" checked={perms.view} onChange={(e) => updatePermission(role as Role, module, 'view', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" /><span className="text-[10px] ml-1 text-slate-500">Ver</span></label>
                                                        <label title="Criar" className="cursor-pointer"><input type="checkbox" checked={perms.create} onChange={(e) => updatePermission(role as Role, module, 'create', e.target.checked)} className="rounded text-green-600 focus:ring-green-500 w-3.5 h-3.5" /><span className="text-[10px] ml-1 text-slate-500">Criar</span></label>
                                                        <label title="Editar" className="cursor-pointer"><input type="checkbox" checked={perms.edit} onChange={(e) => updatePermission(role as Role, module, 'edit', e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5" /><span className="text-[10px] ml-1 text-slate-500">Edit</span></label>
                                                        <label title="Deletar" className="cursor-pointer"><input type="checkbox" checked={perms.delete} onChange={(e) => updatePermission(role as Role, module, 'delete', e.target.checked)} className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5" /><span className="text-[10px] ml-1 text-slate-500">Del</span></label>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CUSTOM FIELDS TAB */}
            {activeTab === 'custom_fields' && (
                <div className="space-y-6">
                    <SectionTitle title="Campos Personalizados" subtitle="Adicione campos extras aos formulários de Leads e Clientes." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Novo Campo</h3>
                        <form onSubmit={handleCreateCustomField} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rótulo (Label)</label>
                                <input type="text" required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.label} onChange={e => handleLabelChange(e.target.value)} placeholder="Ex: Data de Aniversário"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Módulo</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.module} onChange={e => setNewFieldForm({...newFieldForm, module: e.target.value as any})}>
                                    <option value="leads">Leads</option>
                                    <option value="clients">Clientes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.type} onChange={e => setNewFieldForm({...newFieldForm, type: e.target.value as any})}>
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="date">Data</option>
                                    <option value="boolean">Sim/Não</option>
                                    <option value="select">Seleção (Lista)</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition">Adicionar</button>
                        </form>
                        {newFieldForm.type === 'select' && (
                            <div className="mt-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opções (separadas por vírgula)</label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={fieldOptionsInput} onChange={e => setFieldOptionsInput(e.target.value)} placeholder="Opção A, Opção B, Opção C"/>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customFields.map(field => (
                            <div key={field.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{field.label}</h4>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded uppercase">{field.module}</span>
                                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase">{field.type}</span>
                                    </div>
                                </div>
                                <button onClick={() => deleteCustomField(field.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        {customFields.length === 0 && <p className="text-slate-400 text-sm italic col-span-2 text-center py-4">Nenhum campo personalizado criado.</p>}
                    </div>
                </div>
            )}

            {/* WEBHOOKS TAB */}
            {activeTab === 'webhooks' && (
                <div className="space-y-6">
                    <SectionTitle title="Webhooks & API" subtitle="Integre o Nexus CRM com outras ferramentas (Zapier, n8n, etc)." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Novo Webhook</h3>
                        <form onSubmit={handleCreateWebhook} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                                    <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.name} onChange={e => setNewWebhookForm({...newWebhookForm, name: e.target.value})} placeholder="Ex: Notificar Slack"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gatilho (Evento)</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.triggerEvent} onChange={e => setNewWebhookForm({...newWebhookForm, triggerEvent: e.target.value as any})}>
                                        <option value="lead_created">Novo Lead Criado</option>
                                        <option value="deal_won">Negócio Ganho</option>
                                        <option value="deal_lost">Negócio Perdido</option>
                                        <option value="ticket_created">Ticket Criado</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL de Destino (Endpoint)</label>
                                <input required type="url" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.url} onChange={e => setNewWebhookForm({...newWebhookForm, url: e.target.value})} placeholder="https://hooks.zapier.com/..."/>
                            </div>
                            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-6 rounded hover:bg-indigo-700 transition flex items-center gap-2">
                                <Link2 size={16}/> Criar Webhook
                            </button>
                        </form>
                    </div>

                    <div className="space-y-3">
                        {webhooks.map(hook => (
                            <div key={hook.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{hook.name}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${hook.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{hook.active ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 font-mono truncate max-w-md">{hook.url}</p>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded mt-2 inline-block">Quando: {hook.triggerEvent}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleTestWebhook(hook)} className="text-xs border border-slate-300 dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition">Testar</button>
                                    <button onClick={() => updateWebhook({...hook, active: !hook.active})} className="text-slate-400 hover:text-blue-500 p-2"><Power size={16}/></button>
                                    <button onClick={() => deleteWebhook(hook.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {webhooks.length === 0 && <p className="text-slate-400 text-sm italic text-center py-4">Nenhum webhook configurado.</p>}
                    </div>
                </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && (
                <div className="space-y-6">
                    <SectionTitle title="Auditoria de Sistema" subtitle="Registro imutável de ações e segurança." />
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs sticky top-0 shadow-sm">
                                    <tr><th className="p-4">Data/Hora</th><th className="p-4">Usuário</th><th className="p-4">Ação</th><th className="p-4">Detalhes</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {logs?.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 text-slate-500 text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-4 font-medium text-slate-700 dark:text-slate-300">{log.userName}</td>
                                            <td className="p-4"><Badge>{log.action}</Badge></td>
                                            <td className="p-4 text-slate-600 dark:text-slate-400 text-xs truncate max-w-xs" title={log.details}>{log.details}</td>
                                        </tr>
                                    ))}
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
                        <SectionTitle title="Catálogo de Produtos" subtitle="Gerencie serviços e planos de assinatura." />
                        <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition">
                            <Plus size={18}/> Novo Produto
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(prod => (
                            <div key={prod.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge color={prod.active ? 'green' : 'red'}>{prod.active ? 'Ativo' : 'Inativo'}</Badge>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => handleEditProduct(prod)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 size={16}/></button>
                                        <button onClick={() => { setProductToDelete(prod); setIsDeleteProductModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{prod.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10 overflow-hidden">{prod.description}</p>
                                <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-3">
                                    <span className="text-xs text-slate-400 font-medium uppercase">{prod.category}</span>
                                    <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">R$ {prod.price.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PORTAL CONFIG TAB */}
            {activeTab === 'portal_config' && (
                <div className="max-w-3xl space-y-6">
                    <SectionTitle title="Configuração do Portal do Cliente" subtitle="Personalize a experiência dos seus clientes." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome do Portal</label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={portalForm.portalName} onChange={e => setPortalForm({...portalForm, portalName: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cor Primária (Hex)</label>
                                <div className="flex gap-2">
                                    <input type="color" className="h-12 w-12 rounded cursor-pointer border-0 p-0" value={portalForm.primaryColor} onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})}/>
                                    <input type="text" className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white uppercase" value={portalForm.primaryColor} onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})}/>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                                <input type="checkbox" checked={portalForm.allowInvoiceDownload} onChange={e => setPortalForm({...portalForm, allowInvoiceDownload: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-sm">Permitir Download de Faturas</span>
                                    <span className="text-xs text-slate-500">Clientes podem baixar boletos e PDFs financeiros.</span>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                                <input type="checkbox" checked={portalForm.allowTicketCreation} onChange={e => setPortalForm({...portalForm, allowTicketCreation: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"/>
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-sm">Permitir Abertura de Chamados</span>
                                    <span className="text-xs text-slate-500">Clientes podem criar novos tickets de suporte.</span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mensagem de Boas-vindas</label>
                            <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-24 resize-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={portalForm.welcomeMessage || ''} onChange={e => setPortalForm({...portalForm, welcomeMessage: e.target.value})} placeholder="Ex: Bem-vindo ao portal do cliente!"/>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={handleSavePortal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">Salvar Configurações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* BRIDGE TAB */}
            {activeTab === 'bridge' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <SectionTitle title="Nexus Bridge" subtitle="Conexão local para WhatsApp e SMTP." />
                        <button onClick={handleManualBridgeCheck} className="flex items-center gap-2 text-sm text-blue-600 font-bold hover:underline">
                            {loadingBridge && <Loader2 className="animate-spin" size={14}/>} Verificar Status
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* WhatsApp Card */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><MessageCircle size={100} /></div>
                            <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2"><MessageCircle/> WhatsApp Gateway</h3>
                            
                            {bridgeStatus.whatsapp === 'READY' ? (
                                <div className="flex flex-col items-center justify-center py-8 text-green-600">
                                    <CheckCircle size={48} className="mb-2"/>
                                    <p className="font-bold">Conectado e Pronto!</p>
                                    <p className="text-xs text-slate-500">O bot está pronto para enviar mensagens.</p>
                                </div>
                            ) : bridgeQr ? (
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Escaneie o QR Code com seu WhatsApp:</p>
                                    <div className="bg-white p-2 rounded-lg shadow-md border border-slate-200">
                                        <img src={bridgeQr} alt="QR Code" className="w-48 h-48"/>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Atualiza a cada 15s</p>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-red-500 font-bold mb-2">Bridge Desconectado</p>
                                    <p className="text-sm text-slate-500 mb-4">Certifique-se de que o servidor local (porta 3001) está rodando.</p>
                                    <div className="bg-slate-900 text-slate-300 p-3 rounded text-xs font-mono text-left">
                                        cd server<br/>npm install<br/>npm start
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SMTP Card */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Mail size={100} /></div>
                            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2"><Mail/> SMTP Relay</h3>
                            
                            <form onSubmit={handleSaveSmtp} className="space-y-3 relative z-10">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Host</label>
                                        <input type="text" className="w-full border rounded p-2 text-xs" value={smtpForm.host} onChange={e => setSmtpForm({...smtpForm, host: e.target.value})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Porta</label>
                                        <input type="number" className="w-full border rounded p-2 text-xs" value={smtpForm.port} onChange={e => setSmtpForm({...smtpForm, port: parseInt(e.target.value)})}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Usuário / Email</label>
                                    <input type="email" className="w-full border rounded p-2 text-xs" value={smtpForm.user} onChange={e => setSmtpForm({...smtpForm, user: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Senha / App Password</label>
                                    <input type="password" className="w-full border rounded p-2 text-xs" value={smtpForm.pass} onChange={e => setSmtpForm({...smtpForm, pass: e.target.value})}/>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition">Salvar Configuração</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                <div className="max-w-2xl space-y-6">
                    <SectionTitle title="Conexão com Banco de Dados" subtitle="Configure a conexão com seu projeto Supabase." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Database size={24}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Supabase Connection</h3>
                                <p className="text-sm text-slate-500">Armazenamento em nuvem seguro e escalável.</p>
                            </div>
                            <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold uppercase ${connectionStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {connectionStatus === 'success' ? 'Conectado' : 'Desconectado'}
                            </div>
                        </div>

                        <form onSubmit={handleSaveSupabase} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Project URL</label>
                                <input type="url" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm" placeholder="https://your-project.supabase.co" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">API Key (Anon/Public)</label>
                                <input type="password" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm" placeholder="eyJh..." value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})}/>
                            </div>

                            {statusMessage && (
                                <div className={`p-3 rounded text-xs font-medium flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {connectionStatus === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                                    {statusMessage}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={connectionStatus === 'testing'} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-70">
                                    {connectionStatus === 'testing' ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                    Salvar e Conectar
                                </button>
                                <button type="button" onClick={handleGenerateSchema} className="px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2">
                                    <Code size={18}/> Schema SQL
                                </button>
                            </div>
                        </form>
                    </div>

                    {connectionStatus === 'success' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white">Status da Sincronização</h3>
                                <button onClick={handleCheckSync} disabled={isCheckingSync} className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                    {isCheckingSync ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} Verificar Agora
                                </button>
                            </div>
                            <div className="space-y-2">
                                {syncStats.map((stat, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-100 dark:border-slate-700">
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{stat.label}</span>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="text-slate-400">Local: {stat.local}</span>
                                            <span className={stat.status === 'synced' ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                                Nuvem: {stat.remote}
                                            </span>
                                            {stat.status === 'synced' ? <CheckCircle size={14} className="text-green-500"/> : <AlertTriangle size={14} className="text-red-500"/>}
                                        </div>
                                    </div>
                                ))}
                                {syncStats.length === 0 && <p className="text-center text-slate-400 text-xs py-4">Clique em verificar para comparar dados locais e nuvem.</p>}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button onClick={restoreDefaults} className="w-full text-red-500 hover:text-red-700 text-xs font-bold py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                                    Restaurar Dados de Exemplo (Reset Local)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SAAS ADMIN TAB - UPDATED */}
            {activeTab === 'saas_admin' && isSuperAdmin && (
                <div className="space-y-6 animate-fade-in">
                    <SectionTitle title="Administração SaaS (Multi-tenant)" subtitle="Gerencie todas as organizações cadastradas no sistema." />
                    
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white">Organizações Registradas</h3>
                            <button onClick={fetchSaasOrgs} className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline flex items-center gap-1">
                                {loadingSaas ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} Atualizar
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Empresa</th>
                                        <th className="p-4">Slug</th>
                                        <th className="p-4">Plano</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {saasOrgs.map(org => (
                                        <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{org.name}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{org.slug}</td>
                                            <td className="p-4"><Badge color={org.plan === 'Enterprise' ? 'purple' : 'blue'}>{org.plan}</Badge></td>
                                            <td className="p-4">
                                                <Badge color={
                                                    org.status === 'active' ? 'green' : 
                                                    org.status === 'pending' ? 'yellow' : 'red'
                                                }>
                                                    {org.status || 'Active'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-center">
                                                {org.status === 'pending' && (
                                                    <button 
                                                        onClick={() => handleApproveOrg(org.id)}
                                                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition shadow-sm"
                                                    >
                                                        Aprovar
                                                    </button>
                                                )}
                                                {org.status === 'active' && (
                                                    <span className="text-xs text-slate-400">Ativo</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {saasOrgs.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma organização encontrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* SQL SCHEMA MODAL - UPDATED */}
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
CREATE OR REPLACE FUNCTION public.get_auth_user_org_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

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
  status text default 'pending', -- Workflow Approval
  created_by uuid references auth.users, -- Creator tracking
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

-- 4. Leads (UPDATED)
create table if not exists public.leads (
  id text primary key,
  name text,
  company text,
  email text,
  phone text,
  value numeric default 0,
  status text,
  source text,
  probability integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_contact timestamp with time zone,
  organization_id text references public.organizations(id),
  metadata jsonb default '{}'::jsonb -- NEW: Metadata Column
);

-- ... [REST OF TABLES OMITTED FOR BREVITY, ASSUME THEY EXIST] ...

-- MIGRATION: Add columns if they don't exist
DO $$ 
BEGIN
  -- Leads Metadata
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'metadata') THEN
    ALTER TABLE public.leads ADD COLUMN metadata jsonb default '{}'::jsonb;
  END IF;

  -- Organizations Status
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'status') THEN
    ALTER TABLE public.organizations ADD COLUMN status text default 'active'; 
  END IF;

  -- Organizations Created By
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'created_by') THEN
    ALTER TABLE public.organizations ADD COLUMN created_by uuid references auth.users;
  END IF;
END $$;

-- --- SECURITY & PERMISSIONS (RLS) ---

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.leads enable row level security;

-- 1. ORGANIZATION POLICIES
drop policy if exists "Users can view own organization" on public.organizations;
create policy "Users can view own organization" on public.organizations for select using (
  id = get_auth_user_org_id() OR created_by = auth.uid()
);
create policy "Users can insert organization" on public.organizations for insert with check (true);

-- 2. PROFILE POLICIES
create policy "Users can view profiles in their org" on public.profiles for select using (
  organization_id = get_auth_user_org_id() OR id = auth.uid()
);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- 3. LEADS POLICIES
create policy "Users can view leads in their org" on public.leads for all using (organization_id = get_auth_user_org_id());
`}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT MODAL */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white">{editingProductId ? 'Editar Produto' : 'Novo Produto'}</h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Produto</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preço Base (R$)</label>
                                <input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.category || 'Subscription'} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}>
                                    <option value="Subscription">Assinatura</option>
                                    <option value="Service">Serviço</option>
                                    <option value="Product">Produto Físico</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm resize-none h-20 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})}/>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="prodActive" checked={newProduct.active} onChange={e => setNewProduct({...newProduct, active: e.target.checked})} className="rounded text-blue-600"/>
                                <label htmlFor="prodActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">Produto Ativo</label>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition">Salvar</button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE PRODUCT MODAL */}
            {isDeleteProductModalOpen && productToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32}/>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Produto?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Você está prestes a remover <strong>{productToDelete.name}</strong>. Esta ação não pode ser desfeita.
                            </p>
                            <input 
                                type="text" 
                                placeholder="Motivo da exclusão..." 
                                className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm mb-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                value={productDeleteReason}
                                onChange={e => setProductDeleteReason(e.target.value)}
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setIsDeleteProductModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button onClick={handleDeleteProduct} className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow-md">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW TEAM MEMBER MODAL */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white">Adicionar Membro</h3>
                            <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddMember} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail</label>
                                <input required type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Função</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as any})}>
                                    <option value="sales">Comercial</option>
                                    <option value="support">Suporte</option>
                                    <option value="finance">Financeiro</option>
                                    <option value="dev">Desenvolvedor</option>
                                    <option value="executive">Diretoria</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition">Adicionar</button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MEMBER MODAL */}
            {isDeleteMemberModalOpen && memberToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32}/>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Remover Usuário?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Você está prestes a remover <strong>{memberToDelete.name}</strong> da equipe. O acesso será revogado imediatamente.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsDeleteMemberModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button onClick={handleDeleteMember} className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow-md">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
