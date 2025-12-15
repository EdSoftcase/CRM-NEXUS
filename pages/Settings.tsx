import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { 
    UserCircle, Shield, Activity, Lock, Edit2, Trash2, Plus, Package, X, Save, 
    Database, CheckCircle, Code, Copy, Building2, Key, Globe, Users, 
    AlertTriangle, Search, Settings2, Link2, FileText, ToggleLeft, ToggleRight, List,
    CreditCard, Cloud, HardDrive, RefreshCw, LogOut, ChevronRight, Camera, Loader2, Radio, Zap, ListChecks, FileEdit,
    MessageCircle, Smartphone, Mail, UserCheck, Play, Pause, Eye, EyeOff
} from 'lucide-react';
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

const MODULE_CONFIG = [
    { id: 'dashboard', label: 'Visão Geral' },
    { id: 'contact-center', label: 'Central de Contatos' },
    { id: 'inbox', label: 'Inbox Unificado' },
    { id: 'prospecting', label: 'Prospecção IA' },
    { id: 'competitive-intelligence', label: 'Nexus Spy (CI)' },
    { id: 'calendar', label: 'Agenda / Tarefas' },
    { id: 'marketing', label: 'Marketing Hub' },
    { id: 'commercial', label: 'Comercial / Pipeline' },
    { id: 'proposals', label: 'Propostas' },
    { id: 'operations', label: 'Produção / Instalação' },
    { id: 'clients', label: 'Carteira de Clientes' },
    { id: 'geo-intelligence', label: 'Mapa Inteligente' },
    { id: 'projects', label: 'Gestão de Projetos' },
    { id: 'customer-success', label: 'Sucesso do Cliente' },
    { id: 'retention', label: 'Retenção' },
    { id: 'automation', label: 'Nexus Flow (RPA)' },
    { id: 'finance', label: 'Financeiro' },
    { id: 'support', label: 'Suporte' },
    { id: 'dev', label: 'Desenvolvimento' },
    { id: 'reports', label: 'Relatórios' },
    { id: 'settings', label: 'Configurações' },
];

const SUPER_ADMIN_EMAILS = ['superadmin@nexus.com', 'edson.softcase@gmail.com'];

export const Settings: React.FC = () => {
    const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, changePassword, permissionMatrix, updatePermission, sendRecoveryInvite, approveOrganization, hasPermission } = useAuth();
  
    const { 
        leads, clients, tickets, invoices, issues, syncLocalToCloud, isSyncing, refreshData, 
        products, addProduct, updateProduct, removeProduct, activities, 
        portalSettings, updatePortalSettings, campaigns, workflows, marketingContents, projects, 
        notifications, pushEnabled, togglePushNotifications, competitors, marketTrends, 
        prospectingHistory, disqualifiedProspects, customFields, addCustomField, deleteCustomField, 
        webhooks, addWebhook, deleteWebhook, updateWebhook, restoreDefaults, addSystemNotification,
        logs: contextLogs 
    } = useData();
    
    // Fetch fresh logs directly from hook for the Audit Tab to ensure real-time view
    const { data: auditLogs, refetch: refetchLogs } = useAuditLogs();
    
    // Prioritize fresh logs from the hook, fall back to context if needed
    const displayLogs = auditLogs && auditLogs.length > 0 ? auditLogs : contextLogs;

    const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'permissions' | 'audit' | 'integrations' | 'products' | 'saas_admin' | 'portal_config' | 'bridge' | 'custom_fields' | 'webhooks' | 'database' | 'organization'>('profile');
    const [showSqlModal, setShowSqlModal] = useState(false);
    
    // Database Stats State
    const [cloudCounts, setCloudCounts] = useState<Record<string, number>>({});
    const [loadingCounts, setLoadingCounts] = useState(false);

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '', avatar: '' });
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password Change State
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordStatus, setPasswordStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

    const isSuperAdmin = currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email);
    const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

    // --- SUB-COMPONENT STATES ---
    // Team
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });
    const [inviteData, setInviteData] = useState<{name: string, email: string} | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    
    // Approval / Edit Member State
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [memberToApprove, setMemberToApprove] = useState<User | null>(null);
    const [approvalRole, setApprovalRole] = useState<Role>('sales');

    // Integrations
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState<''>('');
    const [syncStats, setSyncStats] = useState<{label: string, local: number, remote: number | string, status: 'synced'|'diff'|'error'}[]>([]);
    const [isCheckingSync, setIsCheckingSync] = useState(false);

    // Bridge
    const [bridgeStatus, setBridgeStatus] = useState<{whatsapp: string, smtp: string}>({ whatsapp: 'OFFLINE', smtp: 'OFFLINE' });
    const [bridgeQr, setBridgeQr] = useState<string | null>(null);
    const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: 587, user: '', pass: '' });
    const [loadingBridge, setLoadingBridge] = useState(false);
    const [bridgeError, setBridgeError] = useState<string | null>(null);

    // Portal
    const [portalForm, setPortalForm] = useState<PortalSettings>(portalSettings);

    // Products
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0 });

    // Custom Fields
    const [newFieldForm, setNewFieldForm] = useState<Partial<CustomFieldDefinition>>({ label: '', key: '', type: 'text', module: 'leads', required: false });
    const [fieldOptionsInput, setFieldOptionsInput] = useState('');

    // Webhooks
    const [newWebhookForm, setNewWebhookForm] = useState<Partial<WebhookConfig>>({ name: '', url: '', triggerEvent: 'lead_created', method: 'POST', active: true });

    // SAAS
    const [saasOrgs, setSaasOrgs] = useState<Organization[]>([]);
    const [loadingSaas, setLoadingSaas] = useState(false);


    // --- EFFECTS ---
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
        setPortalForm(portalSettings);
    }, [portalSettings]);

    useEffect(() => {
        if (activeTab === 'database') {
            fetchCloudCounts();
        }
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
            if (config.url && config.key) setConnectionStatus('success');
        }
        if (activeTab === 'bridge') {
             fetchBridgeStatus();
        }
        if (activeTab === 'saas_admin' && isSuperAdmin) {
            fetchSaasOrgs();
        }
        if (activeTab === 'audit') {
            refetchLogs();
        }
    }, [activeTab]);

    // --- FETCH CLOUD COUNTS (DATABASE TAB) ---
    const fetchCloudCounts = async () => {
        setLoadingCounts(true);
        const supabase = getSupabase();
        if (!supabase) {
            setLoadingCounts(false);
            return;
        }

        const tables = ['leads', 'clients', 'tickets', 'invoices', 'projects', 'activities', 'products', 'competitors', 'proposals', 'prospecting_history'];
        const newCounts: Record<string, number> = {};

        try {
            await Promise.all(tables.map(async (table) => {
                const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
                newCounts[table] = count || 0;
            }));
            setCloudCounts(newCounts);
        } catch (e) {
            console.error("Error fetching counts", e);
        } finally {
            setLoadingCounts(false);
        }
    };

    // --- HANDLERS ---
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

    const handleSaveSupabase = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        setConnectionStatus('testing'); 
        setStatusMessage('');
        saveSupabaseConfig(supabaseForm.url, supabaseForm.key); 
        const result = await testSupabaseConnection(); 
        if (result.success) { 
            setConnectionStatus('success'); 
            setStatusMessage(result.message as any); 
            setTimeout(() => window.location.reload(), 2000); 
        } else { 
            setConnectionStatus('error'); 
            setStatusMessage(result.message as any); 
        } 
    };

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
    
    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await addTeamMember(newMember.name, newMember.email, newMember.role);
        
        if (result.success) {
            setInviteData({ name: newMember.name, email: newMember.email });
            setIsTeamModalOpen(false);
            setIsInviteModalOpen(true);
            setNewMember({ name: '', email: '', role: 'sales' });
        } else {
            alert(`Erro ao adicionar membro: ${result.error}`);
        }
    };

    // --- APPROVAL LOGIC (CORE FIX) ---
    const handleOpenApproval = (user: User) => {
        setMemberToApprove(user);
        // Default to their current role or sales if undefined
        setApprovalRole(user.role || 'sales'); 
        setIsApprovalModalOpen(true);
    };

    const handleConfirmApproval = async () => {
        if (memberToApprove) {
            await adminUpdateUser(memberToApprove.id, { 
                active: true, 
                role: approvalRole 
            });
            setIsApprovalModalOpen(false);
            setMemberToApprove(null);
            addSystemNotification('Membro Aprovado', `${memberToApprove.name} agora faz parte da equipe como ${ROLE_NAMES[approvalRole]}.`, 'success');
        }
    };
    
    const handleCopyInvite = () => {
        const text = `Olá ${inviteData?.name}, você foi convidado para o Nexus CRM da ${currentOrganization?.name}.\n\nPara acessar:\n1. Entre em: ${window.location.origin}\n2. Clique em "Entrar na Equipe"\n3. Use o identificador: ${currentOrganization?.slug}\n4. Cadastre-se com o email: ${inviteData?.email}`;
        navigator.clipboard.writeText(text);
        alert("Convite copiado!");
    };

    const handleSavePortal = () => {
        updatePortalSettings(currentUser, portalForm);
        alert("Configurações salvas com sucesso!");
    };

    const handleSaveCustomField = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFieldForm.label || !newFieldForm.key) return;
        
        const field: CustomFieldDefinition = {
            id: `CF-${Date.now()}`,
            label: newFieldForm.label,
            key: newFieldForm.key,
            type: newFieldForm.type || 'text',
            module: newFieldForm.module || 'leads',
            required: newFieldForm.required || false,
            options: newFieldForm.type === 'select' && fieldOptionsInput ? fieldOptionsInput.split(',').map(s => s.trim()) : undefined,
            organizationId: currentUser?.organizationId
        };
        addCustomField(field);
        setNewFieldForm({ label: '', key: '', type: 'text', module: 'leads', required: false });
        setFieldOptionsInput('');
        alert("Campo adicionado!");
    };

    const handleSaveWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        const webhook: WebhookConfig = {
            id: `WH-${Date.now()}`,
            name: newWebhookForm.name || 'Webhook',
            url: newWebhookForm.url || '',
            triggerEvent: newWebhookForm.triggerEvent as TriggerType,
            method: (newWebhookForm.method as 'POST' | 'GET') || 'POST',
            active: true,
            organizationId: currentUser?.organizationId
        };
        addWebhook(webhook);
        setNewWebhookForm({ name: '', url: '', triggerEvent: 'lead_created', method: 'POST', active: true });
        alert("Webhook adicionado!");
    };

    const handleEditProduct = (product: Product) => {
        setNewProduct(product);
        setEditingProductId(product.id);
        setIsProductModalOpen(true);
    };

    const handleDeleteProduct = (product: Product) => {
        if(confirm(`Deseja excluir o produto ${product.name}?`)) {
            removeProduct(currentUser, product.id);
        }
    };

    const handleSaveProduct = (e: React.FormEvent) => {
        e.preventDefault();
        const productData: Product = {
            id: editingProductId || `PROD-${Date.now()}`,
            name: newProduct.name || '',
            description: newProduct.description || '',
            price: Number(newProduct.price),
            sku: newProduct.sku || '',
            category: newProduct.category || 'Service',
            active: newProduct.active !== undefined ? newProduct.active : true,
            organizationId: currentUser?.organizationId
        };
        if(editingProductId) updateProduct(currentUser, productData);
        else addProduct(currentUser, productData);
        setIsProductModalOpen(false);
        setNewProduct({ active: true, category: 'Subscription', price: 0 });
        setEditingProductId(null);
    };
    
    // --- SQL SCRIPT V11.0 - FIX COMPETITORS JSON ---
    const sqlScript = `-- SQL DE RESET DA TABELA COMPETITORS (V11.0)
-- Recria a tabela 'competitors' para garantir suporte a JSONB (SWOT/Battlecard) e permissões.

BEGIN;

DROP TABLE IF EXISTS competitors CASCADE;

CREATE TABLE competitors (
  id text PRIMARY KEY,
  name text,
  website text,
  sector text,
  last_analysis timestamp with time zone,
  swot jsonb DEFAULT '{}'::jsonb,
  battlecard jsonb DEFAULT '{}'::jsonb,
  organization_id text
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access competitors" ON competitors FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON competitors TO anon, authenticated, service_role;

COMMIT;

SELECT 'Tabela Competitors recriada com sucesso (V11.0)' as status;
`;

    // Filter menu items based on Admin role for sensitive tabs
    const menuItems = [
        { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
    ];

    if (isAdmin) {
        menuItems.push(
            { id: 'organization', label: 'Organização', icon: Building2 },
            { id: 'team', label: 'Equipe', icon: Users },
            { id: 'permissions', label: 'Permissões (RBAC)', icon: Shield },
            { id: 'portal_config', label: 'Portal do Cliente', icon: Globe },
            { id: 'products', label: 'Produtos', icon: Package },
            { id: 'integrations', label: 'Banco de Dados', icon: Database },
            { id: 'bridge', label: 'Integrações (Bridge)', icon: Zap },
            { id: 'custom_fields', label: 'Campos Personalizados', icon: ListChecks },
            { id: 'webhooks', label: 'Webhooks & API', icon: Code },
            { id: 'database', label: 'Diagnóstico DB', icon: Activity },
            { id: 'audit', label: 'Auditoria', icon: List },
        );
        if (isSuperAdmin) {
            menuItems.push({ id: 'saas_admin', label: 'SaaS Admin', icon: Building2 });
        }
    }

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
            {/* Sidebar de Configurações (Vertical) */}
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-full">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings2 size={24} className="text-blue-600 dark:text-blue-400"/> Configurações
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gerencie sua conta e preferências.</p>
                </div>
                
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === item.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <item.icon size={18} />
                            {item.label}
                            {activeTab === item.id && <ChevronRight size={14} className="ml-auto opacity-50"/>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-[10px] text-slate-400">Nexus CRM Enterprise v3.5</p>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* 1. PROFILE TAB */}
                {activeTab === 'profile' && currentUser && (
                    <div className="max-w-3xl mx-auto animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Profile Header Background */}
                            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                                <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]"></div>
                            </div>
                            
                            <div className="px-8 pb-8 relative">
                                {/* Avatar Module */}
                                <div className="flex justify-between items-end -mt-12 mb-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-500 dark:text-slate-400 shadow-md overflow-hidden">
                                            {profileForm.avatar ? (
                                                <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{profileForm.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        {isEditingProfile && (
                                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition">
                                                <Camera size={20} className="text-white"/>
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileChange} ref={fileInputRef}/>
                                            </div>
                                        )}
                                        {!isEditingProfile && (
                                            <button 
                                                onClick={() => setIsEditingProfile(true)}
                                                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full border-2 border-white dark:border-slate-800 hover:bg-blue-700 transition shadow-sm"
                                            >
                                                <Edit2 size={12}/>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <Badge color="blue">{ROLE_NAMES[currentUser.role]}</Badge>
                                        <Badge color={currentUser.active ? 'green' : 'red'}>{currentUser.active ? 'Ativo' : 'Inativo'}</Badge>
                                    </div>
                                </div>

                                {/* Personal Info Form */}
                                <form onSubmit={handleProfileUpdate}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Completo</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-70"
                                                value={profileForm.name}
                                                onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                                disabled={!isEditingProfile}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email de Acesso</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-70"
                                                value={profileForm.email}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-70"
                                                value={profileForm.phone}
                                                onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                                disabled={!isEditingProfile}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CPF</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-70"
                                                value={profileForm.cpf}
                                                onChange={e => setProfileForm({...profileForm, cpf: e.target.value})}
                                                disabled={!isEditingProfile}
                                            />
                                        </div>
                                    </div>
                                    
                                    {isEditingProfile && (
                                        <div className="mt-6 flex justify-end gap-3">
                                            <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">Cancelar</button>
                                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">Salvar Alterações</button>
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. TEAM TAB */}
                {activeTab === 'team' && isAdmin && (
                    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <SectionTitle title="Convidar Membro" subtitle="Adicione novos usuários à sua organização" />
                            <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4 items-end mt-4">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value})} required />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                                    <input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.email} onChange={(e) => setNewMember({...newMember, email: e.target.value})} required />
                                </div>
                                <div className="w-full md:w-48">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Função</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newMember.role} onChange={(e) => setNewMember({...newMember, role: e.target.value as Role})}>
                                        {Object.entries(ROLE_NAMES).filter(([k]) => k !== 'client').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                                    <Plus size={18}/> Convidar
                                </button>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <SectionTitle title="Membros da Equipe" subtitle={`Total: ${usersList.filter(u => u.role !== 'client').length} usuários`} />
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600">
                                        <tr>
                                            <th className="p-3">Nome</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Função</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {usersList.filter(u => u.role !== 'client').map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-3 font-medium text-slate-900 dark:text-white">{user.name}</td>
                                                <td className="p-3 text-slate-600 dark:text-slate-300">{user.email}</td>
                                                <td className="p-3"><Badge>{ROLE_NAMES[user.role]}</Badge></td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {user.active ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => user.active ? adminUpdateUser(user.id, { active: false }) : handleOpenApproval(user)} 
                                                        className={`hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded transition ${user.active ? 'text-slate-400 hover:text-red-500' : 'text-blue-600 animate-pulse'}`} 
                                                        title={user.active ? "Desativar" : "Aprovar Entrada"}
                                                    >
                                                        {user.active ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
                                                    </button>
                                                    <button onClick={() => adminDeleteUser(user.id)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded" title="Remover">
                                                        <Trash2 size={18}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. PERMISSIONS TAB */}
                {activeTab === 'permissions' && isAdmin && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in max-w-6xl mx-auto">
                        <SectionTitle title="Matriz de Permissões" subtitle="Controle de acesso granular por módulo e função (RBAC). Apenas Administradores podem alterar." />
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-left bg-slate-50 dark:bg-slate-900 text-slate-50 dark:text-slate-400 sticky left-0 z-10 w-48">Módulo</th>
                                        {Object.keys(ROLE_NAMES).filter(r => r !== 'client').map(role => (
                                            <th key={role} className="p-3 border-b border-slate-200 dark:border-slate-700 text-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold min-w-[120px]">
                                                {ROLE_NAMES[role]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {MODULE_CONFIG.map(modConf => (
                                        <tr key={modConf.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 sticky left-0 z-10 capitalize border-r border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                                {modConf.label}
                                            </td>
                                            {Object.keys(ROLE_NAMES).filter(r => r !== 'client').map(role => {
                                                const viewAccess = permissionMatrix[role]?.[modConf.id]?.view;
                                                const editAccess = permissionMatrix[role]?.[modConf.id]?.edit;
                                                const isSuper = role === 'admin' || role === 'executive';

                                                return (
                                                    <td key={`${role}-${modConf.id}`} className="p-3 text-center border-l border-slate-100 dark:border-slate-700">
                                                        <div className="flex justify-center gap-2">
                                                            {/* View Toggle */}
                                                            <button 
                                                                onClick={() => !isSuper && updatePermission(role as Role, modConf.id, 'view', !viewAccess)}
                                                                className={`p-1.5 rounded transition ${viewAccess ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'} ${isSuper ? 'cursor-not-allowed opacity-50' : ''}`}
                                                                title="Visualizar"
                                                                disabled={isSuper}
                                                            >
                                                                {viewAccess ? <Eye size={16}/> : <EyeOff size={16}/>}
                                                            </button>

                                                            {/* Edit Toggle */}
                                                            <button 
                                                                onClick={() => !isSuper && updatePermission(role as Role, modConf.id, 'edit', !editAccess)}
                                                                className={`p-1.5 rounded transition ${editAccess ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'} ${isSuper ? 'cursor-not-allowed opacity-50' : ''}`}
                                                                title="Editar (Criar/Alterar/Excluir)"
                                                                disabled={isSuper}
                                                            >
                                                                <Edit2 size={16}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-slate-400 mt-4 italic">* Admins e Executivos possuem acesso total por padrão e não podem ser restritos aqui.</p>
                    </div>
                )}
                
                {/* 5. PORTAL CONFIG TAB */}
                {activeTab === 'portal_config' && isAdmin && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in max-w-4xl mx-auto">
                        <SectionTitle title="Configuração do Portal do Cliente" subtitle="Personalize a experiência dos seus clientes" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Portal</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={portalForm.portalName} onChange={(e) => setPortalForm({...portalForm, portalName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cor Primária</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" className="w-10 h-10 border border-slate-300 dark:border-slate-600 rounded cursor-pointer" value={portalForm.primaryColor} onChange={(e) => setPortalForm({...portalForm, primaryColor: e.target.value})} />
                                        <input type="text" className="flex-1 border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white uppercase" value={portalForm.primaryColor} onChange={(e) => setPortalForm({...portalForm, primaryColor: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Funcionalidades</h4>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={portalForm.allowInvoiceDownload} onChange={(e) => setPortalForm({...portalForm, allowInvoiceDownload: e.target.checked})} />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Permitir download de faturas</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={portalForm.allowTicketCreation} onChange={(e) => setPortalForm({...portalForm, allowTicketCreation: e.target.checked})} />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Permitir abertura de chamados</span>
                                    </label>
                                </div>
                                <button onClick={handleSavePortal} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 mt-4 flex items-center gap-2">
                                    <Save size={18}/> Salvar Configurações
                                </button>
                            </div>
                            
                            {/* Preview */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col h-80 bg-slate-50 dark:bg-slate-900">
                                <div className="h-14 flex items-center px-4 text-white font-bold shadow-sm" style={{backgroundColor: portalForm.primaryColor}}>
                                    {portalForm.portalName}
                                </div>
                                <div className="p-4 flex-1 flex flex-col gap-3 opacity-80 pointer-events-none">
                                    <div className="h-24 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                        <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                                        <div className="w-1/2 h-3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-20 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"></div>
                                        <div className="h-20 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 6. PRODUCTS TAB */}
                {activeTab === 'products' && isAdmin && (
                    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-4">
                             <SectionTitle title="Catálogo de Produtos" subtitle="Gerencie serviços e produtos disponíveis" />
                             <button onClick={() => { setNewProduct({ active: true, category: 'Subscription', price: 0 }); setEditingProductId(null); setIsProductModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                                 <Plus size={18}/> Novo Produto
                             </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map(product => (
                                <div key={product.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${product.category === 'Subscription' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>{product.category}</span>
                                        <span className={`w-2 h-2 rounded-full ${product.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{product.name}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2 h-10">{product.description}</p>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <span className="font-bold text-slate-800 dark:text-white">R$ {product.price.toLocaleString()}</span>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button onClick={() => handleEditProduct(product)} className="text-blue-600 dark:text-blue-400 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteProduct(product)} className="text-red-600 dark:text-red-400 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* 7. INTEGRATIONS / BRIDGE TAB */}
                {(activeTab === 'integrations' || activeTab === 'bridge') && isAdmin && (
                    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                        
                        {/* SUPABASE CONFIG */}
                        {activeTab === 'integrations' && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                        <Database size={24}/>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Conexão com Banco de Dados</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Configuração do Supabase (URL e API Key).</p>
                                        
                                        <form onSubmit={handleSaveSupabase} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Project URL</label>
                                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} placeholder="https://xyz.supabase.co" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Anon Key</label>
                                                    <input type="password" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} placeholder="eyJ..." />
                                                </div>
                                            </div>
                                            
                                            {connectionStatus === 'error' && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">{statusMessage}</p>}
                                            {connectionStatus === 'success' && <p className="text-green-600 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded font-bold flex items-center gap-2"><CheckCircle size={14}/> {statusMessage}</p>}
                                            
                                            <button type="submit" disabled={connectionStatus === 'testing'} className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-slate-600 flex items-center gap-2 disabled:opacity-70">
                                                {connectionStatus === 'testing' ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                                {connectionStatus === 'testing' ? 'Testando...' : 'Salvar e Conectar'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* BRIDGE CONFIG */}
                        {activeTab === 'bridge' && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Zap size={24}/></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nexus Bridge</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Gateway local para WhatsApp e SMTP.</p>
                                            </div>
                                        </div>
                                        <button onClick={handleManualBridgeCheck} className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                            <RefreshCw size={12} className={loadingBridge ? "animate-spin" : ""}/> Verificar Status
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* WHATSAPP CARD */}
                                        <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center min-h-[200px]">
                                            <div className="mb-3">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shadow-sm ${bridgeStatus.whatsapp === 'READY' ? 'bg-green-500' : 'bg-slate-400'}`}>
                                                    <MessageCircle size={24}/>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">WhatsApp</h4>
                                            <p className={`text-xs font-bold uppercase mb-4 ${bridgeStatus.whatsapp === 'READY' ? 'text-green-600' : 'text-slate-500'}`}>
                                                {bridgeStatus.whatsapp === 'READY' ? 'Conectado' : bridgeStatus.whatsapp === 'QR_READY' ? 'Aguardando Leitura' : 'Desconectado'}
                                            </p>
                                            
                                            {bridgeStatus.whatsapp === 'QR_READY' && bridgeQr ? (
                                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                                    <img src={bridgeQr} alt="QR Code" className="w-32 h-32"/>
                                                </div>
                                            ) : bridgeStatus.whatsapp === 'READY' ? (
                                                <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                                    <CheckCircle size={14}/> Online
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 max-w-[200px]">Certifique-se que o servidor bridge está rodando na porta 3001.</p>
                                            )}
                                        </div>
                                        
                                        {/* SMTP CARD */}
                                        <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                                <Mail size={16}/> Configuração SMTP
                                            </h4>
                                            <form onSubmit={handleSaveSmtp} className="space-y-3">
                                                <input type="text" placeholder="Host (smtp.gmail.com)" className="w-full border rounded p-2 text-xs" value={smtpForm.host} onChange={e => setSmtpForm({...smtpForm, host: e.target.value})} />
                                                <input type="number" placeholder="Porta (587)" className="w-full border rounded p-2 text-xs" value={smtpForm.port} onChange={e => setSmtpForm({...smtpForm, port: parseInt(e.target.value)})} />
                                                <input type="email" placeholder="Email (User)" className="w-full border rounded p-2 text-xs" value={smtpForm.user} onChange={e => setSmtpForm({...smtpForm, user: e.target.value})} />
                                                <input type="password" placeholder="Senha de App" className="w-full border rounded p-2 text-xs" value={smtpForm.pass} onChange={e => setSmtpForm({...smtpForm, pass: e.target.value})} />
                                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700">Salvar SMTP</button>
                                            </form>
                                        </div>
                                    </div>
                                    
                                    {bridgeError && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded border border-red-200 dark:border-red-800 flex items-center gap-2"><AlertTriangle size={14}/> {bridgeError}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 8. CUSTOM FIELDS */}
                {activeTab === 'custom_fields' && isAdmin && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-4xl mx-auto">
                        <SectionTitle title="Campos Personalizados" subtitle="Estenda o modelo de dados de Leads e Clientes." />
                        
                        <form onSubmit={handleSaveCustomField} className="flex gap-3 items-end mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Rótulo</label>
                                <input required type="text" className="w-full border rounded p-2 text-sm" value={newFieldForm.label} onChange={e => setNewFieldForm({...newFieldForm, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_')})} placeholder="Ex: Data de Nascimento"/>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Tipo</label>
                                <select className="w-full border rounded p-2 text-sm" value={newFieldForm.type} onChange={e => setNewFieldForm({...newFieldForm, type: e.target.value as any})}>
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="date">Data</option>
                                    <option value="select">Seleção</option>
                                    <option value="boolean">Sim/Não</option>
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Módulo</label>
                                <select className="w-full border rounded p-2 text-sm" value={newFieldForm.module} onChange={e => setNewFieldForm({...newFieldForm, module: e.target.value as any})}>
                                    <option value="leads">Leads</option>
                                    <option value="clients">Clientes</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 h-[38px] w-[38px] flex items-center justify-center">
                                <Plus size={20}/>
                            </button>
                        </form>
                        
                        {newFieldForm.type === 'select' && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Opções (separadas por vírgula)</label>
                                <input type="text" className="w-full border rounded p-2 text-sm" value={fieldOptionsInput} onChange={e => setFieldOptionsInput(e.target.value)} placeholder="Opção A, Opção B, Opção C"/>
                            </div>
                        )}

                        <div className="space-y-2">
                            {customFields.map(field => (
                                <div key={field.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{field.label}</p>
                                        <p className="text-xs text-slate-500">Chave: {field.key} • Tipo: {field.type} • Módulo: {field.module}</p>
                                    </div>
                                    <button onClick={() => deleteCustomField(field.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            {customFields.length === 0 && <p className="text-center text-slate-400 py-4">Nenhum campo personalizado.</p>}
                        </div>
                    </div>
                )}

                {/* 9. WEBHOOKS */}
                {activeTab === 'webhooks' && isAdmin && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-4xl mx-auto">
                        <SectionTitle title="Webhooks & API" subtitle="Integre o Nexus com outras plataformas." />
                        
                        <form onSubmit={handleSaveWebhook} className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold uppercase text-slate-500">Nome</label><input required className="w-full border rounded p-2 text-sm" value={newWebhookForm.name} onChange={e => setNewWebhookForm({...newWebhookForm, name: e.target.value})}/></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500">URL de Destino</label><input required type="url" className="w-full border rounded p-2 text-sm" value={newWebhookForm.url} onChange={e => setNewWebhookForm({...newWebhookForm, url: e.target.value})}/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Evento Gatilho</label>
                                    <select className="w-full border rounded p-2 text-sm" value={newWebhookForm.triggerEvent} onChange={e => setNewWebhookForm({...newWebhookForm, triggerEvent: e.target.value as TriggerType})}>
                                        <option value="lead_created">Novo Lead</option>
                                        <option value="deal_won">Venda Ganha</option>
                                        <option value="deal_lost">Venda Perdida</option>
                                        <option value="ticket_created">Ticket Criado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Método</label>
                                    <select className="w-full border rounded p-2 text-sm" value={newWebhookForm.method} onChange={e => setNewWebhookForm({...newWebhookForm, method: e.target.value as any})}>
                                        <option value="POST">POST</option>
                                        <option value="GET">GET</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded text-sm font-bold hover:bg-slate-700">Adicionar Webhook</button>
                        </form>

                        <div className="space-y-2">
                            {webhooks.map(hook => (
                                <div key={hook.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                            {hook.name} <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">{hook.triggerEvent}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-md">{hook.url}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateWebhook({...hook, active: !hook.active})} className={`text-xs font-bold px-2 py-1 rounded ${hook.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{hook.active ? 'Ativo' : 'Pausado'}</button>
                                        <button onClick={() => deleteWebhook(hook.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 10. AUDIT LOG */}
                {activeTab === 'audit' && isAdmin && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[600px]">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <SectionTitle title="Logs de Auditoria" subtitle="Rastreamento de ações dos usuários" />
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 sticky top-0">
                                    <tr>
                                        <th className="p-3">Data/Hora</th>
                                        <th className="p-3">Usuário</th>
                                        <th className="p-3">Ação</th>
                                        <th className="p-3">Módulo</th>
                                        <th className="p-3">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {displayLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300">
                                            <td className="p-3 whitespace-nowrap text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-3 font-bold">{log.userName}</td>
                                            <td className="p-3"><span className="bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded text-xs font-medium">{log.action}</span></td>
                                            <td className="p-3 text-xs uppercase text-slate-500">{log.module}</td>
                                            <td className="p-3 text-xs truncate max-w-xs" title={log.details}>{log.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* 11. DATABASE DIAGNOSTICS */}
                {activeTab === 'database' && isAdmin && (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Diagnóstico de Banco de Dados" subtitle="Contagem de registros e status de sincronização." />
                            <button onClick={() => setShowSqlModal(true)} className="text-blue-600 hover:underline text-sm font-bold flex items-center gap-1"><Code size={14}/> Ver Script SQL</button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(cloudCounts).map(([table, count]) => (
                                <div key={table} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">{table}</p>
                                    {loadingCounts ? <Loader2 className="animate-spin mx-auto text-blue-500" size={20}/> : <p className="text-2xl font-bold text-slate-800 dark:text-white">{count}</p>}
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-bold flex items-center gap-2 mb-2"><Database size={16}/> Sincronização Local vs Cloud</p>
                            <p>Os dados são armazenados localmente para performance e sincronizados em segundo plano com o Supabase. Se houver divergência, clique em "Forçar Sincronização" no menu lateral.</p>
                        </div>
                     </div>
                )}

                {/* 12. ORGANIZATION INFO */}
                {activeTab === 'organization' && currentOrganization && isAdmin && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-3xl mx-auto">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-lg flex items-center justify-center text-3xl font-bold mx-auto mb-3 shadow-lg">
                                {currentOrganization.name.charAt(0)}
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{currentOrganization.name}</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-mono text-sm bg-slate-100 dark:bg-slate-700 inline-block px-3 py-1 rounded-full mt-2">ID: {currentOrganization.id}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-700 pt-6">
                            <div className="text-center">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Plano Atual</p>
                                <Badge color="purple">{currentOrganization.plan}</Badge>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Status da Assinatura</p>
                                <span className={`text-sm font-bold ${currentOrganization.subscription_status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                                    {currentOrganization.subscription_status?.toUpperCase() || 'ATIVO'}
                                </span>
                            </div>
                        </div>

                        {isSuperAdmin && (
                            <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-sm text-slate-700 dark:text-white mb-2">Zona de Perigo</h4>
                                <button className="w-full border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded text-sm font-bold transition">
                                    Encerrar Conta da Organização
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
            </main>

            {/* SQL Modal */}
            {showSqlModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-700 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2"><Code size={18} className="text-emerald-400"/> Schema SQL (Full Update V11.0)</h3>
                            <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-4 flex-1 overflow-auto bg-black custom-scrollbar">
                            <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap select-text">
                                {sqlScript}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-slate-700 text-right bg-slate-800 rounded-b-xl">
                            <button onClick={() => { navigator.clipboard.writeText(sqlScript); alert("Copiado!"); }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition flex items-center gap-2 ml-auto shadow-lg"><Copy size={16}/> Copiar Script</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT MODAL */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">{editingProductId ? 'Editar Produto' : 'Novo Produto'}</h3>
                            <button onClick={() => setIsProductModalOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"/></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Produto</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preço</label>
                                    <input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.category || 'Service'} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}>
                                        <option value="Service">Serviço</option>
                                        <option value="Product">Produto Físico</option>
                                        <option value="Subscription">Assinatura</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 h-20 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 shadow-md">Salvar Produto</button>
                        </form>
                    </div>
                </div>
            )}

            {/* APPROVAL MODAL (The requested feature) */}
            {isApprovalModalOpen && memberToApprove && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <UserCheck size={20} className="text-green-600"/> Aprovar Membro
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Selecione a função para <strong>{memberToApprove.name}</strong> ({memberToApprove.email}).
                            </p>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Função (Role)</label>
                                <select 
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500 transition" 
                                    value={approvalRole} 
                                    onChange={(e) => setApprovalRole(e.target.value as Role)}
                                >
                                    {Object.entries(ROLE_NAMES).filter(([k]) => k !== 'client').map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => { setIsApprovalModalOpen(false); setMemberToApprove(null); }}
                                    className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmApproval}
                                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md transition"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};