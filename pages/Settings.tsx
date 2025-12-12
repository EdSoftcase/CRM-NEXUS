import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { UserCircle, Shield, Activity, Lock, Edit2, Trash2, Plus, Package, X, Save, Mail, Database, CheckCircle, RefreshCw, UploadCloud, ShieldCheck, Code, Copy,  Building2, Key, Globe, Users, AlertTriangle, Monitor, Palette, Search, Calendar, Unlock, Loader2, Bell, Zap, QrCode, Server, Wifi, WifiOff, MessageCircle, Cpu, Radio, Power, ExternalLink, Clock, ListChecks, Hourglass, Camera, Settings2, Link2, CalendarCheck, CalendarDays, CheckSquare, Type, Hash, List as ListIcon, AlignLeft, ArrowRightLeft, LayoutTemplate, UserPlus, FileEdit, Smartphone } from 'lucide-react';
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
  const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, changePassword, permissionMatrix, updatePermission, sendRecoveryInvite, approveOrganization, hasPermission } = useAuth();
  
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

  // PRODUCT STATES
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0 });

  // TEAM STATES
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });
  
  // EDIT MEMBER STATE
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<User | null>(null);
  const [editMemberForm, setEditMemberForm] = useState({ name: '', role: 'sales' as Role, active: true });

  // INVITE MODAL STATE
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState<{name: string, email: string} | null>(null);

  const [isDeleteMemberModalOpen, setIsDeleteMemberModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

  // SAAS ADMIN STATE
  const [saasOrgs, setSaasOrgs] = useState<Organization[]>([]);
  const [loadingSaas, setLoadingSaas] = useState(false);

  // INTEGRATION STATE
  const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<''>('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  
  const [syncStats, setSyncStats] = useState<{label: string, local: number, remote: number | string, status: 'synced'|'diff'|'error'}[]>([]);
  const [isCheckingSync, setIsCheckingSync] = useState(false);

  // PORTAL STATE
  const [portalForm, setPortalForm] = useState<PortalSettings>(portalSettings);

  // BRIDGE STATE
  const [bridgeStatus, setBridgeStatus] = useState<{whatsapp: string, smtp: string}>({ whatsapp: 'OFFLINE', smtp: 'OFFLINE' });
  const [bridgeQr, setBridgeQr] = useState<string | null>(null);
  const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: 587, user: '', pass: '' });
  const [loadingBridge, setLoadingBridge] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  // CUSTOM FIELDS STATE
  const [newFieldForm, setNewFieldForm] = useState<Partial<CustomFieldDefinition>>({ label: '', key: '', type: 'text', module: 'leads', required: false });
  const [fieldOptionsInput, setFieldOptionsInput] = useState('');
  
  // WEBHOOKS STATE
  const [newWebhookForm, setNewWebhookForm] = useState<Partial<WebhookConfig>>({ name: '', url: '', triggerEvent: 'lead_created', method: 'POST', active: true });
  
  // PROFILE STATE
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '', avatar: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PASSWORD CHANGE STATE
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

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
          { name: 'profiles', local: usersList.length, label: 'Equipe (Perfis)' },
          { name: 'leads', local: leads.length, label: 'Leads (Comercial)' },
          { name: 'clients', local: clients.length, label: 'Clientes' },
          { name: 'tickets', local: tickets.length, label: 'Chamados' },
          { name: 'invoices', local: invoices.length, label: 'Faturas' },
          { name: 'activities', local: activities.length, label: 'Atividades' },
          { name: 'products', local: products.length, label: 'Produtos' },
          { name: 'projects', local: projects.length, label: 'Projetos' },
          { name: 'competitors', local: competitors.length, label: 'Concorrentes (Spy)' },
          { name: 'market_trends', local: marketTrends.length, label: 'Trends (Spy)' },
      ];

      const stats = [];
      for (const table of tables) {
          const { count, error } = await supabase.from(table.name).select('*', { count: 'exact', head: true });
          stats.push({
              label: table.label,
              local: table.local,
              remote: error ? 'Erro' : count || 0,
              status: error ? 'error' : (table.local === count ? 'synced' : 'diff') as any
          });
      }
      setSyncStats(stats);
      setIsCheckingSync(false);
  };

  const handleForceUpdate = async () => {
      await refreshData();
      handleCheckSync();
  };

  // --- TEAM MEMBER ACTIONS ---
  const handleAddMember = async (e: React.FormEvent) => {
      e.preventDefault();
      const result = await addTeamMember(newMember.name, newMember.email, newMember.role);
      
      if (result.success) {
          setInviteData({ name: newMember.name, email: newMember.email });
          setIsTeamModalOpen(false);
          setIsInviteModalOpen(true); // Open invite modal
          setNewMember({ name: '', email: '', role: 'sales' });
      } else {
          alert(`Erro ao adicionar membro: ${result.error}`);
      }
  };

  const handleOpenEditMember = (member: User) => {
      setMemberToEdit(member);
      setEditMemberForm({
          name: member.name,
          role: member.role,
          active: member.active !== false // Default to true if undefined
      });
      setIsEditMemberModalOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!memberToEdit) return;

      await adminUpdateUser(memberToEdit.id, {
          name: editMemberForm.name,
          role: editMemberForm.role,
          active: editMemberForm.active
      });

      setIsEditMemberModalOpen(false);
      setMemberToEdit(null);
  };

  const handleDeleteMemberClick = (member: User) => {
      setMemberToDelete(member);
      setIsDeleteMemberModalOpen(true);
  };

  const confirmDeleteMember = async () => {
      if (memberToDelete) {
          await adminDeleteUser(memberToDelete.id);
          setMemberToDelete(null);
          setIsDeleteMemberModalOpen(false);
      }
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      updateUser({
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
          cpf: profileForm.cpf,
          avatar: profileForm.avatar
      });
      setIsEditingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordStatus(null);

      if (passwordForm.new !== passwordForm.confirm) {
          setPasswordStatus({ type: 'error', msg: 'As senhas não coincidem.' });
          return;
      }
      if (passwordForm.new.length < 6) {
          setPasswordStatus({ type: 'error', msg: 'A senha deve ter no mínimo 6 caracteres.' });
          return;
      }

      const result = await changePassword(passwordForm.new);
      if (result.success) {
          setPasswordStatus({ type: 'success', msg: 'Senha alterada com sucesso!' });
          setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
          setPasswordStatus({ type: 'error', msg: result.error || 'Erro ao alterar senha.' });
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 500 * 1024) { 
              setIsCompressing(true);
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = (event) => {
                  const img = new Image();
                  img.src = event.target?.result as string;
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const maxWidth = 300;
                      const scaleSize = maxWidth / img.width;
                      canvas.width = maxWidth;
                      canvas.height = img.height * scaleSize;
                      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                      setProfileForm({ ...profileForm, avatar: compressedBase64 });
                      setIsCompressing(false);
                  };
              };
          } else {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setProfileForm({ ...profileForm, avatar: reader.result as string });
              };
              reader.readAsDataURL(file);
          }
      }
  };

  const handleCopyInvite = () => {
      const text = `Olá ${inviteData?.name}, você foi convidado para o Nexus CRM da ${currentOrganization?.name}.\n\nPara acessar:\n1. Entre em: ${window.location.origin}\n2. Clique em "Entrar na Equipe"\n3. Use o identificador: ${currentOrganization?.slug}\n4. Cadastre-se com o email: ${inviteData?.email}`;
      navigator.clipboard.writeText(text);
      alert("Convite copiado!");
  };

  // --- PRODUCTS ACTIONS ---
  const handleSaveProduct = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProduct.name || newProduct.price === undefined) return;

      const productData: Product = {
          id: editingProductId || `PROD-${Date.now()}`,
          name: newProduct.name,
          description: newProduct.description || '',
          price: Number(newProduct.price),
          sku: newProduct.sku || `SKU-${Math.floor(Math.random()*10000)}`,
          category: newProduct.category || 'Service',
          active: newProduct.active !== false,
          organizationId: currentUser?.organizationId
      };

      if (editingProductId) {
          updateProduct(currentUser, productData);
      } else {
          addProduct(currentUser, productData);
      }
      setIsProductModalOpen(false);
      setNewProduct({ active: true, category: 'Subscription', price: 0 });
      setEditingProductId(null);
  };

  const handleEditProduct = (prod: Product) => {
      setNewProduct(prod);
      setEditingProductId(prod.id);
      setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (prod: Product) => {
      if(confirm(`Tem certeza que deseja excluir o produto ${prod.name}?`)) {
          removeProduct(currentUser, prod.id);
      }
  };

  // --- CUSTOM FIELDS ACTIONS ---
  const handleSaveField = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newFieldForm.label || !newFieldForm.type) return;

      const options = fieldOptionsInput.split(',').map(o => o.trim()).filter(Boolean);
      const fieldKey = newFieldForm.label.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const fieldData: CustomFieldDefinition = {
          id: `FIELD-${Date.now()}`,
          label: newFieldForm.label,
          key: fieldKey,
          type: newFieldForm.type as any,
          module: newFieldForm.module as any,
          required: newFieldForm.required,
          options: options.length > 0 ? options : undefined,
          organizationId: currentUser?.organizationId
      };

      addCustomField(fieldData);
      setNewFieldForm({ label: '', type: 'text', module: 'leads', required: false });
      setFieldOptionsInput('');
  };
  
  const handleDeleteField = (id: string) => {
      if(confirm("Excluir campo personalizado? Dados existentes podem ser perdidos.")) {
          deleteCustomField(id);
      }
  };

  // --- WEBHOOKS ACTIONS ---
  const handleSaveWebhook = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newWebhookForm.name || !newWebhookForm.url) return;

      const webhookData: WebhookConfig = {
          id: `WH-${Date.now()}`,
          name: newWebhookForm.name,
          url: newWebhookForm.url,
          triggerEvent: newWebhookForm.triggerEvent as TriggerType,
          method: newWebhookForm.method as any,
          active: newWebhookForm.active !== false,
          organizationId: currentUser?.organizationId
      };

      addWebhook(webhookData);
      setNewWebhookForm({ name: '', url: '', triggerEvent: 'lead_created', method: 'POST', active: true });
  };
  
  const handleDeleteWebhook = (id: string) => {
      if(confirm("Excluir webhook?")) {
          deleteWebhook(id);
      }
  };

  // --- PORTAL CONFIG SAVE ---
  const handleSavePortal = () => {
      updatePortalSettings(currentUser, portalForm);
      alert('Configurações do portal salvas!');
  };

  // --- RENDER ---
  return (
    <div className="p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="text-slate-600 dark:text-slate-400" /> Configurações
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie sua conta e preferências do sistema.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row min-h-[600px] flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 border-r border-slate-200 dark:border-slate-700 p-2 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-y-auto">
            <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'profile' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <UserCircle size={18} /> Meu Perfil
            </button>
            
            {hasPermission('settings', 'view') && (
                <>
                    <button onClick={() => setActiveTab('team')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'team' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Users size={18} /> Equipe
                    </button>
                    <button onClick={() => setActiveTab('permissions')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'permissions' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Shield size={18} /> Permissões
                    </button>
                    <button onClick={() => setActiveTab('products')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'products' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Package size={18} /> Produtos
                    </button>
                    <button onClick={() => setActiveTab('custom_fields')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'custom_fields' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <ListChecks size={18} /> Campos Personalizados
                    </button>
                    <button onClick={() => setActiveTab('portal_config')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'portal_config' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Globe size={18} /> Portal do Cliente
                    </button>
                    <button onClick={() => setActiveTab('bridge')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'bridge' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Zap size={18} /> Integrações (Bridge)
                    </button>
                    <button onClick={() => setActiveTab('webhooks')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'webhooks' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Radio size={18} /> Webhooks
                    </button>
                    <button onClick={() => setActiveTab('integrations')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'integrations' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Database size={18} /> Banco de Dados
                    </button>
                    <button onClick={() => setActiveTab('audit')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${activeTab === 'audit' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Activity size={18} /> Auditoria
                    </button>
                </>
            )}
            
            {isSuperAdmin && (
                <>
                    <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>
                    <button onClick={() => setActiveTab('saas_admin')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition ${activeTab === 'saas_admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Building2 size={18} /> SaaS Admin
                    </button>
                </>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
            {activeTab === 'profile' && (
                <div className="max-w-2xl">
                    <SectionTitle title="Meu Perfil" subtitle="Gerencie suas informações pessoais." />
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-8">
                        {/* Profile content */}
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative group cursor-pointer">
                                <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-500 dark:text-slate-300 overflow-hidden border-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500 transition">
                                    {profileForm.avatar ? (
                                        <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{profileForm.name.charAt(0)}</span>
                                    )}
                                </div>
                                {isEditingProfile && (
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                        <Camera size={24} className="text-white"/>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileChange} ref={fileInputRef}/>
                                    </div>
                                )}
                                {isCompressing && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white"/></div>}
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentUser?.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">{currentUser?.email}</p>
                                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase border border-blue-200 dark:border-blue-800">
                                    {ROLE_NAMES[currentUser?.role || 'admin']}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        disabled={!isEditingProfile}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        disabled
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-100 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed"
                                        value={profileForm.email}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label>
                                    <input 
                                        type="text" 
                                        disabled={!isEditingProfile}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CPF</label>
                                    <input 
                                        type="text" 
                                        disabled={!isEditingProfile}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
                                        value={profileForm.cpf}
                                        onChange={e => setProfileForm({...profileForm, cpf: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                {isEditingProfile ? (
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancelar</button>
                                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-sm">Salvar Alterações</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setIsEditingProfile(true)} className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition font-bold flex items-center gap-2">
                                        <Edit2 size={16}/> Editar Perfil
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <SectionTitle title="Alterar Senha" subtitle="Atualize sua senha de acesso." />
                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nova Senha</label>
                                <input type="password" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} placeholder="Mínimo 6 caracteres" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirmar Senha</label>
                                <input type="password" required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} placeholder="Repita a senha" />
                            </div>
                            {passwordStatus && (
                                <div className={`text-xs p-3 rounded-lg border flex items-center gap-2 ${passwordStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {passwordStatus.msg}
                                </div>
                            )}
                            <button type="submit" className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition font-bold flex items-center gap-2">
                                <Lock size={16}/> Atualizar Senha
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {activeTab === 'team' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <SectionTitle title="Gestão de Equipe" subtitle="Adicione membros e gerencie acessos." />
                        <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                            <Plus size={18}/> Adicionar Membro
                        </button>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-4">Nome / Email</th>
                                    <th className="p-4">Cargo</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {usersList.filter(u => u.role !== 'client').map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                                        </td>
                                        <td className="p-4"><span className="inline-block px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-600">{ROLE_NAMES[user.role]}</span></td>
                                        <td className="p-4">{user.active !== false ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold border border-green-200"><CheckCircle size={12}/> Ativo</span> : <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200"><Clock size={12}/> Pendente</span>}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenEditMember(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition"><FileEdit size={18}/></button>
                                                {user.id !== currentUser?.id && <button onClick={() => handleDeleteMemberClick(user)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"><Trash2 size={18}/></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* --- RESTORED PERMISSIONS TAB --- */}
            {activeTab === 'permissions' && hasPermission('settings', 'view') && (
                <div>
                    <SectionTitle title="Matriz de Permissões (RBAC)" subtitle="Defina o que cada cargo pode acessar no sistema." />
                    
                    <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-4 min-w-[200px]">Módulo</th>
                                    {Object.keys(permissionMatrix).filter(r => r !== 'admin' && r !== 'client').map(role => (
                                        <th key={role} className="p-4 text-center min-w-[120px]">{ROLE_NAMES[role] || role}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {Object.keys(permissionMatrix['sales']).map(module => (
                                    <tr key={module} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300 capitalize">
                                            {module.replace('-', ' ')}
                                        </td>
                                        {Object.keys(permissionMatrix).filter(r => r !== 'admin' && r !== 'client').map(role => {
                                            const perms = permissionMatrix[role][module] || { view: false, create: false, edit: false, delete: false };
                                            return (
                                                <td key={`${role}-${module}`} className="p-4">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={perms.view} 
                                                                onChange={(e) => updatePermission(role as Role, module, 'view', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            /> Visualizar
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={perms.create} 
                                                                onChange={(e) => updatePermission(role as Role, module, 'create', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            /> Criar
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={perms.edit} 
                                                                onChange={(e) => updatePermission(role as Role, module, 'edit', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            /> Editar
                                                        </label>
                                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={perms.delete} 
                                                                onChange={(e) => updatePermission(role as Role, module, 'delete', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            /> Excluir
                                                        </label>
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

            {/* --- RESTORED SAAS ADMIN TAB --- */}
            {activeTab === 'saas_admin' && isSuperAdmin && (
                <div>
                    <SectionTitle title="Administração SaaS (Multi-tenant)" subtitle="Gerencie as organizações cadastradas na plataforma." />
                    
                    {loadingSaas ? (
                        <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-500" size={32}/><p className="mt-2 text-sm text-slate-500">Carregando organizações...</p></div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4">Organização</th>
                                        <th className="p-4">Slug (ID)</th>
                                        <th className="p-4">Plano</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {saasOrgs.map(org => (
                                        <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 font-bold text-slate-900 dark:text-white">{org.name}</td>
                                            <td className="p-4 font-mono text-xs text-slate-500">{org.slug}</td>
                                            <td className="p-4"><Badge color="purple">{org.plan}</Badge></td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${org.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {org.status === 'active' ? 'Ativo' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {org.status === 'pending' && (
                                                    <button 
                                                        onClick={() => handleApproveOrg(org.id)}
                                                        className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition flex items-center gap-1 mx-auto"
                                                    >
                                                        <CheckCircle size={12}/> Aprovar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
            {activeTab === 'integrations' && (
                <div>
                    <SectionTitle title="Conexão com Banco de Dados" subtitle="Configure a conexão com seu projeto Supabase." />
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-full ${connectionStatus === 'success' ? 'bg-green-100 text-green-600' : connectionStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                <Database size={24}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Supabase Cloud</h3>
                                <p className={`text-sm font-medium ${connectionStatus === 'success' ? 'text-green-600' : connectionStatus === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
                                    {connectionStatus === 'success' ? 'Conectado e Operacional' : connectionStatus === 'error' ? 'Erro de Conexão' : 'Não Configurado'}
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleSaveSupabase} className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label><input type="password" required className="w-full border rounded p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})}/></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Anon)</label><input type="password" required className="w-full border rounded p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})}/></div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={connectionStatus === 'testing'} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition flex items-center gap-2">{connectionStatus === 'testing' ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Testar e Salvar</button>
                                <button type="button" onClick={handleGenerateSchema} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2"><Code size={18}/> Gerar Schema SQL</button>
                            </div>
                        </form>
                    </div>
                    {/* Sync Stats */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white">Status de Sincronização</h3>
                            <button onClick={handleCheckSync} disabled={isCheckingSync} className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1">{isCheckingSync ? <Loader2 className="animate-spin" size={12}/> : <RefreshCw size={12}/>} Verificar Agora</button>
                        </div>
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium"><tr><th className="p-3">Tabela</th><th className="p-3 text-center">Local</th><th className="p-3 text-center">Nuvem</th><th className="p-3 text-center">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {syncStats.map(stat => (
                                    <tr key={stat.label}>
                                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{stat.label}</td>
                                        <td className="p-3 text-center text-slate-500">{stat.local}</td>
                                        <td className="p-3 text-center text-slate-500">{stat.remote}</td>
                                        <td className="p-3 text-center">{stat.status === 'synced' ? <span className="text-green-600 font-bold">OK</span> : stat.status === 'error' ? <span className="text-red-500 font-bold">Erro</span> : <span className="text-amber-500 font-bold">Diferença</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                 <div>
                    <div className="flex justify-between items-center mb-6">
                        <SectionTitle title="Catálogo de Produtos" subtitle="Gerencie seus produtos e serviços." />
                        <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                            <Plus size={18}/> Novo Produto
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(product => (
                            <div key={product.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900 dark:text-white">{product.name}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${product.category === 'Service' ? 'bg-blue-100 text-blue-700' : product.category === 'Subscription' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{product.category}</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{product.description}</p>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-white">R$ {product.price.toLocaleString()}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => handleEditProduct(product)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteProduct(product)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            )}
            
            {activeTab === 'custom_fields' && (
                <div>
                    <SectionTitle title="Campos Personalizados" subtitle="Adicione campos extras aos formulários de Leads e Clientes." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-8">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Adicionar Novo Campo</h3>
                        <form onSubmit={handleSaveField} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Rótulo (Label)</label>
                                <input type="text" required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={newFieldForm.label} onChange={e => setNewFieldForm({...newFieldForm, label: e.target.value})} placeholder="Ex: Data de Nascimento"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Módulo</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={newFieldForm.module} onChange={e => setNewFieldForm({...newFieldForm, module: e.target.value as any})}>
                                    <option value="leads">Leads</option>
                                    <option value="clients">Clientes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={newFieldForm.type} onChange={e => setNewFieldForm({...newFieldForm, type: e.target.value as any})}>
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="date">Data</option>
                                    <option value="boolean">Sim/Não</option>
                                    <option value="select">Seleção (Lista)</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition">Adicionar</button>
                        </form>
                        {newFieldForm.type === 'select' && (
                             <div className="mt-4">
                                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Opções (separadas por vírgula)</label>
                                 <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={fieldOptionsInput} onChange={e => setFieldOptionsInput(e.target.value)} placeholder="Opção 1, Opção 2, Opção 3"/>
                             </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        {customFields.map(field => (
                            <div key={field.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-white text-sm">{field.label}</span>
                                    <span className="text-xs text-slate-500 ml-2">({field.module} - {field.type})</span>
                                </div>
                                <button onClick={() => deleteCustomField(field.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        {customFields.length === 0 && <p className="text-slate-400 text-sm italic">Nenhum campo personalizado criado.</p>}
                    </div>
                </div>
            )}
            
            {activeTab === 'webhooks' && (
                <div>
                    <SectionTitle title="Webhooks (Integrações)" subtitle="Dispare eventos para sistemas externos (Zapier, n8n, etc)." />
                    
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-8">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Novo Webhook</h3>
                        <form onSubmit={handleSaveWebhook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" required className="border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" placeholder="Nome (Ex: Integração Slack)" value={newWebhookForm.name} onChange={e => setNewWebhookForm({...newWebhookForm, name: e.target.value})}/>
                            <input type="url" required className="border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" placeholder="URL de Destino (https://...)" value={newWebhookForm.url} onChange={e => setNewWebhookForm({...newWebhookForm, url: e.target.value})}/>
                            <select className="border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={newWebhookForm.triggerEvent} onChange={e => setNewWebhookForm({...newWebhookForm, triggerEvent: e.target.value as any})}>
                                <option value="lead_created">Lead Criado</option>
                                <option value="deal_won">Venda Ganha</option>
                                <option value="deal_lost">Venda Perdida</option>
                                <option value="ticket_created">Ticket Criado</option>
                            </select>
                            <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 transition">Salvar Webhook</button>
                        </form>
                    </div>

                    <div className="space-y-2">
                        {webhooks.map(wh => (
                            <div key={wh.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{wh.name}</p>
                                    <p className="text-xs text-slate-500">{wh.url} • {wh.triggerEvent}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${wh.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{wh.active ? 'Ativo' : 'Inativo'}</span>
                                    <button onClick={() => deleteWebhook(wh.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                         {webhooks.length === 0 && <p className="text-slate-400 text-sm italic">Nenhum webhook configurado.</p>}
                    </div>
                </div>
            )}
            
            {activeTab === 'portal_config' && (
                <div>
                     <SectionTitle title="Personalização do Portal" subtitle="Ajuste a aparência e recursos do portal do cliente." />
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Portal</label>
                            <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={portalForm.portalName} onChange={e => setPortalForm({...portalForm, portalName: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cor Primária</label>
                            <div className="flex items-center gap-3">
                                <input type="color" className="h-10 w-10 border-0 rounded cursor-pointer" value={portalForm.primaryColor} onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})}/>
                                <span className="text-sm font-mono text-slate-600 dark:text-slate-300">{portalForm.primaryColor}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="checkbox" checked={portalForm.allowInvoiceDownload} onChange={e => setPortalForm({...portalForm, allowInvoiceDownload: e.target.checked})} className="w-5 h-5 rounded text-blue-600"/>
                                 <span className="text-sm text-slate-700 dark:text-slate-300">Permitir Download de Faturas</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="checkbox" checked={portalForm.allowTicketCreation} onChange={e => setPortalForm({...portalForm, allowTicketCreation: e.target.checked})} className="w-5 h-5 rounded text-blue-600"/>
                                 <span className="text-sm text-slate-700 dark:text-slate-300">Permitir Abertura de Chamados</span>
                             </label>
                        </div>
                        <button onClick={handleSavePortal} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition">Salvar Configurações</button>
                     </div>
                </div>
            )}
            
            {activeTab === 'bridge' && (
                <div>
                    <SectionTitle title="Nexus Bridge (Integração Local)" subtitle="Conecte seu WhatsApp e SMTP localmente para envios ilimitados." />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                             <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><MessageCircle className="text-green-500"/> WhatsApp</h3>
                             <div className="flex flex-col items-center justify-center min-h-[200px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                                 {loadingBridge ? <Loader2 className="animate-spin text-slate-400" size={32}/> : bridgeStatus.whatsapp === 'READY' ? (
                                     <div className="text-center text-green-600">
                                         <CheckCircle size={48} className="mx-auto mb-2"/>
                                         <p className="font-bold">Conectado!</p>
                                     </div>
                                 ) : bridgeQr ? (
                                     <div className="text-center">
                                         <img src={bridgeQr} alt="QR Code" className="w-48 h-48 mx-auto"/>
                                         <p className="text-xs text-slate-500 mt-2">Escaneie com seu WhatsApp</p>
                                     </div>
                                 ) : (
                                     <div className="text-center text-slate-400">
                                         <Smartphone size={48} className="mx-auto mb-2 opacity-50"/>
                                         <p className="text-sm">Bridge desconectado.</p>
                                         {bridgeError && <p className="text-xs text-red-500 mt-1">{bridgeError}</p>}
                                     </div>
                                 )}
                             </div>
                             <button onClick={handleManualBridgeCheck} className="w-full mt-4 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition">Verificar Conexão</button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><Mail className="text-blue-500"/> Servidor SMTP</h3>
                            <form onSubmit={handleSaveSmtp} className="space-y-3">
                                <div><label className="text-xs font-bold uppercase text-slate-500">Host</label><input type="text" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={smtpForm.host} onChange={e => setSmtpForm({...smtpForm, host: e.target.value})}/></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500">Porta</label><input type="number" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={smtpForm.port} onChange={e => setSmtpForm({...smtpForm, port: parseInt(e.target.value)})}/></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500">Usuário</label><input type="text" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={smtpForm.user} onChange={e => setSmtpForm({...smtpForm, user: e.target.value})}/></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500">Senha</label><input type="password" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={smtpForm.pass} onChange={e => setSmtpForm({...smtpForm, pass: e.target.value})}/></div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition">Salvar SMTP</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'audit' && (
                 <div>
                     <SectionTitle title="Logs de Auditoria" subtitle="Rastreamento de atividades do sistema." />
                     <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                         <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium sticky top-0"><tr><th className="p-3">Data</th><th className="p-3">Usuário</th><th className="p-3">Ação</th><th className="p-3">Detalhes</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {logs?.map(log => (
                                        <tr key={log.id}>
                                            <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{log.userName}</td>
                                            <td className="p-3"><span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-400">{log.action}</span></td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">{log.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                     </div>
                 </div>
            )}

            {/* SQL Modal (Updated with ALTER TABLE commands for safe migration) */}
            {showSqlModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-700 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2"><Code size={18} className="text-emerald-400"/> Schema SQL (Full Update)</h3>
                            <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-4 flex-1 overflow-auto bg-black">
                            <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
{`-- Execute este script no SQL Editor do Supabase para corrigir e atualizar a estrutura do banco.
-- Ele cria tabelas se não existirem e adiciona colunas novas se estiverem faltando.

-- 1. Habilita extensão UUID
create extension if not exists "uuid-ossp";

-- 2. Organizations
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  plan text default 'Trial',
  license_expires_at timestamp with time zone,
  subscription_status text default 'active',
  portal_settings jsonb default '{}',
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- 3. Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text default 'sales',
  organization_id uuid references organizations(id),
  related_client_id text,
  xp integer default 0,
  level integer default 1,
  active boolean default true,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- 4. Leads (com ALTER TABLE para novos campos)
create table if not exists leads (
  id text primary key,
  name text,
  company text,
  email text,
  phone text,
  value numeric,
  status text,
  source text,
  probability integer,
  organization_id uuid references organizations(id),
  created_at timestamp with time zone default now(),
  last_contact timestamp with time zone,
  metadata jsonb default '{}'
);
alter table leads add column if not exists address text;
alter table leads add column if not exists cep text;
alter table leads add column if not exists website text;
alter table leads add column if not exists product_interest text;
alter table leads add column if not exists parking_spots integer;

-- 5. Clients
create table if not exists clients (
  id text primary key,
  name text not null,
  contact_person text,
  email text,
  phone text,
  document text,
  segment text,
  status text,
  ltv numeric default 0,
  nps integer,
  health_score integer,
  organization_id uuid references organizations(id),
  contracted_products text[],
  since timestamp with time zone,
  last_contact timestamp with time zone,
  metadata jsonb default '{}'
);
alter table clients add column if not exists address text;
alter table clients add column if not exists cep text;
alter table clients add column if not exists latitude numeric;
alter table clients add column if not exists longitude numeric;
alter table clients add column if not exists website text;

-- 6. Proposals (CORREÇÃO CRÍTICA DE CAMPOS)
create table if not exists proposals (
  id text primary key,
  title text,
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
  organization_id uuid references organizations(id),
  signature text,
  signed_at timestamp with time zone,
  signed_by_ip text
);
-- Adiciona colunas que podem estar faltando
alter table proposals add column if not exists setup_cost numeric;
alter table proposals add column if not exists monthly_cost numeric;
alter table proposals add column if not exists consultant_name text;
alter table proposals add column if not exists consultant_email text;
alter table proposals add column if not exists consultant_phone text;

-- 7. Products
create table if not exists products (
  id text primary key,
  name text,
  description text,
  price numeric,
  sku text,
  category text,
  active boolean default true,
  organization_id uuid references organizations(id)
);

-- 8. Activities
create table if not exists activities (
  id text primary key,
  title text,
  type text,
  due_date timestamp with time zone,
  completed boolean default false,
  related_to text,
  assignee uuid references profiles(id),
  description text,
  organization_id uuid references organizations(id),
  metadata jsonb default '{}'
);

-- 9. Outras Tabelas (Tickets, Invoices, Projects)
create table if not exists tickets (
  id text primary key,
  subject text,
  description text,
  priority text,
  status text,
  customer text,
  channel text,
  organization_id uuid references organizations(id),
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  responses jsonb default '[]'
);

create table if not exists invoices (
  id text primary key,
  customer text,
  amount numeric,
  due_date timestamp with time zone,
  status text,
  description text,
  organization_id uuid references organizations(id),
  created_at timestamp with time zone default now()
);

create table if not exists audit_logs (
  id text primary key,
  timestamp timestamp with time zone default now(),
  user_id uuid,
  user_name text,
  action text,
  details text,
  module text,
  organization_id uuid references organizations(id)
);

-- 10. SPY (INTELIGÊNCIA COMPETITIVA)
create table if not exists competitors (
  id text primary key,
  name text,
  website text,
  sector text,
  last_analysis timestamp with time zone,
  swot jsonb,
  battlecard jsonb,
  organization_id uuid references organizations(id)
);

-- 11. PROSPECÇÃO
create table if not exists prospecting_history (
  id text primary key,
  timestamp timestamp with time zone default now(),
  industry text,
  location text,
  keywords text,
  results jsonb default '[]',
  organization_id text references organizations(id) -- Changed to text
);
alter table prospecting_history add column if not exists organization_id text references organizations(id); -- Changed to text

-- 12. CONFIGURAÇÕES & MARKETING
create table if not exists custom_fields (
  id text primary key,
  label text,
  key text,
  type text,
  module text,
  options text[],
  required boolean default false,
  organization_id uuid references organizations(id)
);

create table if not exists webhooks (
  id text primary key,
  name text,
  url text,
  trigger_event text,
  method text,
  active boolean default true,
  headers jsonb default '{}',
  organization_id uuid references organizations(id)
);

create table if not exists workflows (
  id text primary key,
  name text,
  active boolean default true,
  trigger text,
  actions jsonb default '[]',
  runs integer default 0,
  last_run timestamp with time zone,
  organization_id uuid references organizations(id)
);

-- HABILITAR RLS (Segurança)
alter table profiles enable row level security;
alter table leads enable row level security;
alter table clients enable row level security;
alter table proposals enable row level security;
alter table products enable row level security;
alter table activities enable row level security;
alter table competitors enable row level security;
alter table prospecting_history enable row level security;
alter table custom_fields enable row level security;
alter table webhooks enable row level security;
alter table workflows enable row level security;
alter table organizations enable row level security;

-- POLÍTICAS DE ACESSO (PERMISSIVAS PARA CORREÇÃO)
-- 1. Remove ALL existing policies to avoid conflicts (42710)
drop policy if exists "Enable all access for authenticated users based on org" on leads;
drop policy if exists "Enable insert for authenticated users" on leads;

drop policy if exists "Enable all access for authenticated users based on org" on clients;

drop policy if exists "Enable all access for authenticated users based on org" on proposals;
drop policy if exists "Enable insert for authenticated users" on proposals;

drop policy if exists "Enable all access for authenticated users based on org" on products;

drop policy if exists "Enable all access for authenticated users based on org" on competitors;

drop policy if exists "Enable all access for authenticated users based on org" on prospecting_history;

drop policy if exists "Enable insert for organizations" on organizations;
drop policy if exists "Enable select for organizations" on organizations;
drop policy if exists "Enable update for organizations" on organizations;

-- Cria políticas que permitem acesso total para usuários autenticados da mesma organização
create policy "Enable all access for authenticated users based on org" on leads
  for all using ( auth.uid() in (select id from profiles where organization_id = leads.organization_id) );

create policy "Enable all access for authenticated users based on org" on clients
  for all using ( auth.uid() in (select id from profiles where organization_id = clients.organization_id) );

create policy "Enable all access for authenticated users based on org" on proposals
  for all using ( auth.uid() in (select id from profiles where organization_id = proposals.organization_id) );

create policy "Enable all access for authenticated users based on org" on products
  for all using ( auth.uid() in (select id from profiles where organization_id = products.organization_id) );
  
create policy "Enable all access for authenticated users based on org" on competitors
  for all using ( auth.uid() in (select id from profiles where organization_id = competitors.organization_id) );

create policy "Enable all access for authenticated users based on org" on prospecting_history
  for all using ( auth.uid() in (select id from profiles where organization_id = prospecting_history.organization_id) );

-- Importante: Política para Inserção (Insert)
-- Permite que usuários autenticados insiram dados se a organization_id bater com a deles
create policy "Enable insert for authenticated users" on leads
  for insert with check ( auth.uid() in (select id from profiles where organization_id = leads.organization_id) );

create policy "Enable insert for authenticated users" on proposals
  for insert with check ( auth.uid() in (select id from profiles where organization_id = proposals.organization_id) );

-- CORREÇÃO PARA CRIAÇÃO DE ORGANIZAÇÕES
-- Permite que usuários anon/autenticados criem organizações (necessário para o fluxo de SignUp)
create policy "Enable insert for organizations" on organizations for insert with check (true);
create policy "Enable select for organizations" on organizations for select using (true);
create policy "Enable update for organizations" on organizations for update using (true);
`}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-slate-700 text-right">
                            <button onClick={() => { navigator.clipboard.writeText(`...script content...`); alert("Copiado!"); }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition flex items-center gap-2 ml-auto"><Copy size={16}/> Copiar Script</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ... rest of the component ... */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white">Adicionar Membro</h3>
                            <button onClick={() => setIsTeamModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleAddMember} className="p-6 space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                                <input required type="text" className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})}/>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                                <input required type="email" className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})}/>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Função</label>
                                <select className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as Role})}>
                                    <option value="admin">Administrador</option>
                                    <option value="sales">Comercial</option>
                                    <option value="support">Suporte</option>
                                    <option value="finance">Financeiro</option>
                                </select>
                             </div>
                             <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Adicionar</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Invite Modal */}
            {isInviteModalOpen && inviteData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in text-center p-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <CheckCircle size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Membro Adicionado!</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Envie o link de convite abaixo para <strong>{inviteData.name}</strong> se cadastrar na organização.
                        </p>
                        
                        <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg text-left mb-6 border border-slate-200 dark:border-slate-600">
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Link de Acesso:</p>
                            <code className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all">{window.location.origin}</code>
                            <p className="text-xs text-slate-400 uppercase font-bold mt-3 mb-1">Identificador da Empresa:</p>
                            <code className="text-sm font-mono text-slate-800 dark:text-white font-bold">{currentOrganization?.slug}</code>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setIsInviteModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700">Fechar</button>
                            <button onClick={handleCopyInvite} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Copy size={16}/> Copiar Convite</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditMemberModalOpen && memberToEdit && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white">Editar Membro</h3>
                            <button onClick={() => setIsEditMemberModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                                <input type="text" className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editMemberForm.name} onChange={e => setEditMemberForm({...editMemberForm, name: e.target.value})}/>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Função</label>
                                <select className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editMemberForm.role} onChange={e => setEditMemberForm({...editMemberForm, role: e.target.value as Role})}>
                                    <option value="admin">Administrador</option>
                                    <option value="sales">Comercial</option>
                                    <option value="support">Suporte</option>
                                    <option value="finance">Financeiro</option>
                                </select>
                             </div>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="checkbox" checked={editMemberForm.active} onChange={e => setEditMemberForm({...editMemberForm, active: e.target.checked})} className="w-5 h-5 rounded text-blue-600"/>
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usuário Ativo</span>
                             </label>
                             <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Salvar Alterações</button>
                        </form>
                    </div>
                </div>
            )}
            
            {isDeleteMemberModalOpen && memberToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in p-6 text-center">
                         <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Usuário?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Tem certeza que deseja remover <strong>{memberToDelete.name}</strong>? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteMemberModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                            <button onClick={confirmDeleteMember} className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white">{editingProductId ? 'Editar Produto' : 'Novo Produto'}</h3>
                            <button onClick={() => setIsProductModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Produto</label>
                                <input required type="text" className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})}/>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                                <textarea className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white h-20 resize-none" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})}/>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preço (R$)</label>
                                    <input required type="number" className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}/>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                                    <select className="w-full border rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}>
                                        <option value="Service">Serviço</option>
                                        <option value="Product">Produto Físico</option>
                                        <option value="Subscription">Assinatura</option>
                                    </select>
                                 </div>
                             </div>
                             <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Salvar Produto</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};