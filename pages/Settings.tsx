
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { 
    UserCircle, Shield, Activity, Lock, Edit2, Trash2, Plus, Package, X, Save, 
    Database, CheckCircle, Code, Copy, Building2, Key, Globe, Users, 
    AlertTriangle, Search, Settings2, Link2, FileText, ToggleLeft, ToggleRight, List,
    CreditCard, Cloud, HardDrive, RefreshCw, LogOut, ChevronRight, Camera, Loader2, Radio, Zap, ListChecks, FileEdit,
    MessageCircle, Smartphone, Mail, UserCheck, Play, Pause, Eye, EyeOff, Server,
    PieChart as PieIcon, Wallet, Terminal, Power, AlertCircle, Send, Wifi, WifiOff
} from 'lucide-react';
import { SectionTitle, Badge } from '../components/Widgets';
import { Role, User, Product, PermissionAction, PortalSettings, Organization, CustomFieldDefinition, WebhookConfig, TriggerType, FinancialCategory } from '../types';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, getSupabase } from '../services/supabaseClient';
import { checkBridgeStatus, getBridgeQR, configureBridgeSMTP, sendBridgeEmail } from '../services/bridgeService';
import { sendEmail } from '../services/emailService';
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
  
    const { 
        leads, clients, tickets, invoices, issues, syncLocalToCloud, isSyncing, refreshData, 
        products, addProduct, updateProduct, removeProduct, activities, 
        portalSettings, updatePortalSettings, campaigns, workflows, marketingContents, projects, 
        notifications, pushEnabled, togglePushNotifications, competitors, marketTrends, 
        prospectingHistory, disqualifiedProspects, customFields, addCustomField, deleteCustomField, 
        webhooks, addWebhook, deleteWebhook, updateWebhook, restoreDefaults, addSystemNotification,
        logs: contextLogs,
        financialCategories, addFinancialCategory, deleteFinancialCategory
    } = useData();
    
    const { data: auditLogs, refetch: refetchLogs } = useAuditLogs();
    const displayLogs = auditLogs && auditLogs.length > 0 ? auditLogs : contextLogs;

    // --- STATES ---
    const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'team' | 'permissions' | 'portal_config' | 'products' | 'integrations' | 'bridge' | 'custom_fields' | 'webhooks' | 'database' | 'audit' | 'saas_admin' | 'financial'>('profile');
    
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [cloudCounts, setCloudCounts] = useState<Record<string, number>>({});
    const [loadingCounts, setLoadingCounts] = useState(false);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '', avatar: '' });
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSuperAdmin = currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email);
    const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

    // Sub-Modals States
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });
    const [inviteData, setInviteData] = useState<{name: string, email: string} | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [memberToApprove, setMemberToApprove] = useState<User | null>(null);
    const [approvalRole, setApprovalRole] = useState<Role>('sales');

    // Integrations State
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState<''>('');
    const [testApiEmail, setTestApiEmail] = useState('');
    const [sendingApiTest, setSendingApiTest] = useState(false);
    
    // Bridge State
    const [bridgeStatus, setBridgeStatus] = useState<{whatsapp: string, smtp: string, server?: string}>({ whatsapp: 'OFFLINE', smtp: 'OFFLINE', server: 'OFFLINE' });
    const [bridgeQr, setBridgeQr] = useState<string | null>(null);
    const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: 587, user: '', pass: '' });
    const [loadingBridge, setLoadingBridge] = useState(false);
    const [smtpStatusMsg, setSmtpStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
    const [testSmtpEmail, setTestSmtpEmail] = useState('');
    const [sendingSmtpTest, setSendingSmtpTest] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    // Portal State
    const [portalForm, setPortalForm] = useState<PortalSettings>(portalSettings || { organizationId: 'org-1', portalName: 'Portal', primaryColor: '#4f46e5', allowInvoiceDownload: true, allowTicketCreation: true });

    // Product State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0, costCenterId: '' });

    // Custom Fields State
    const [newFieldForm, setNewFieldForm] = useState<Partial<CustomFieldDefinition>>({ label: '', key: '', type: 'text', module: 'leads', required: false });
    const [fieldOptionsInput, setFieldOptionsInput] = useState('');

    // Webhooks State
    const [newWebhookForm, setNewWebhookForm] = useState<Partial<WebhookConfig>>({ name: '', url: '', triggerEvent: 'lead_created', method: 'POST', active: true });

    // Financial Categories State
    const [newFinCatForm, setNewFinCatForm] = useState<Partial<FinancialCategory>>({ name: '', code: '', type: 'Expense' });

    // SaaS Admin State
    const [saasOrgs, setSaasOrgs] = useState<Organization[]>([]);
    const [loadingSaas, setLoadingSaas] = useState(false);

    // Permissions State
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
                avatar: prev.avatar || currentUser.avatar || ''
            }));
            // Pre-fill test email with current user email
            if (currentUser.email) {
                setTestApiEmail(currentUser.email);
                setTestSmtpEmail(currentUser.email);
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (portalSettings) {
            setPortalForm(portalSettings);
        }
    }, [portalSettings]);

    // AUTO-REFRESH BRIDGE STATUS
    useEffect(() => {
        let interval: any;
        if (activeTab === 'bridge') {
             fetchBridgeStatus();
             // Poll every 5 seconds to keep status updated
             interval = setInterval(() => {
                 fetchBridgeStatus(true);
             }, 5000);
        }
        return () => clearInterval(interval);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'database') {
            fetchCloudCounts();
        }
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
            if (config.url && config.key) setConnectionStatus('success');
        }
        if (activeTab === 'saas_admin' && isSuperAdmin) {
            fetchSaasOrgs();
        }
        if (activeTab === 'audit') {
            refetchLogs();
        }
    }, [activeTab]);

    // --- HANDLERS ---
    const fetchCloudCounts = async () => {
        setLoadingCounts(true);
        const supabase = getSupabase();
        if (!supabase) {
            setLoadingCounts(false);
            return;
        }

        const tables = ['leads', 'clients', 'tickets', 'invoices', 'projects', 'activities', 'products', 'competitors', 'proposals', 'prospecting_history', 'financial_categories'];
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

    const handleHardReset = () => {
        if (confirm("ATENÇÃO: Isso limpará todo o cache local, cookies e recarregará a aplicação para baixar os dados mais recentes do servidor.\n\nUse isso se os dados estiverem desatualizados ou com erro.\n\nContinuar?")) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = window.location.origin; // Force root reload
            window.location.reload();
        }
    };

    const runDiagnostics = async () => {
        setDebugInfo('Iniciando diagnóstico...\n');
        setLoadingBridge(true);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const start = Date.now();
            setDebugInfo(prev => prev + `Tentando conectar em http://127.0.0.1:3001/status...\n`);
            
            const res = await fetch('http://127.0.0.1:3001/status', { 
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await res.json();
            const time = Date.now() - start;

            setDebugInfo(prev => prev + `✅ Sucesso! Resposta em ${time}ms.\n`);
            setDebugInfo(prev => prev + `Status HTTP: ${res.status}\n`);
            setDebugInfo(prev => prev + `Dados: ${JSON.stringify(data, null, 2)}`);
            
            setBridgeStatus(data);
        } catch (e: any) {
            setDebugInfo(prev => prev + `❌ FALHA NA CONEXÃO.\n`);
            setDebugInfo(prev => prev + `Erro: ${e.name} - ${e.message}\n\n`);
            
            if (e.message.includes('Failed to fetch')) {
                setDebugInfo(prev => prev + `CAUSA PROVÁVEL:\n1. O servidor Node.js não está rodando.\n2. Bloqueio de Misto (Mixed Content) se você estiver usando HTTPS no frontend.\n3. Bloqueio de CORS.`);
            } else if (e.name === 'AbortError') {
                 setDebugInfo(prev => prev + `CAUSA PROVÁVEL: Timeout. O servidor demorou mais de 5s para responder.`);
            }
        } finally {
            setLoadingBridge(false);
        }
    };

    const fetchBridgeStatus = async (force = false) => {
        // If we are already connected, we don't need to force spinner, just silent update
        try {
            const status = await checkBridgeStatus();
            setBridgeStatus(status);
            if (status.whatsapp !== 'READY') {
                const qrData = await getBridgeQR();
                if (qrData && qrData.qrImage) setBridgeQr(qrData.qrImage);
                else setBridgeQr(null);
            } else {
                setBridgeQr(null);
            }
        } catch (e) {
            setBridgeStatus({ whatsapp: 'OFFLINE', smtp: 'OFFLINE', server: 'OFFLINE' });
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
        addSystemNotification("Sucesso", "Perfil atualizado com sucesso.", "success");
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

    const handleManualBridgeCheck = async () => { setLoadingBridge(true); await fetchBridgeStatus(true); setLoadingBridge(false); };
    
    const handleSaveSmtp = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        setLoadingBridge(true); 
        setSmtpStatusMsg(null);
        try { 
            await configureBridgeSMTP(smtpForm); 
            addSystemNotification("Sucesso", "Configuração SMTP salva! O servidor local aceitou os dados.", "success");
            setSmtpStatusMsg({ type: 'success', text: 'Configuração salva com sucesso!' });
            fetchBridgeStatus(); 
        } catch (e: any) { 
            const msg = e.message === "Bridge desconectado" ? "O servidor local não está rodando. Abra o terminal e rode 'node index.js'." : e.message;
            setSmtpStatusMsg({ type: 'error', text: msg });
        } finally { 
            setLoadingBridge(false); 
        } 
    };

    const handleTestApiEmail = async () => {
        if (!testApiEmail) return;
        setSendingApiTest(true);
        try {
            const result = await sendEmail(
                "Teste API", 
                testApiEmail, 
                "Teste de Integração (Nexus API)", 
                "Se você recebeu este e-mail, a integração via Supabase Edge Functions/Resend está funcionando corretamente.", 
                currentUser?.name || "Admin"
            );
            if(result.success) {
                if (result.method === 'MOCK') {
                    addSystemNotification("Simulação", result.warning || "E-mail simulado (Cloud offline)", "warning");
                } else {
                    addSystemNotification("Sucesso", "E-mail enviado via Cloud API (Supabase/Resend)", "success");
                }
            }
        } catch (e: any) {
            alert(`Erro no envio API: ${e.message}`);
        } finally {
            setSendingApiTest(false);
        }
    };

    const handleTestSmtpEmail = async () => {
        if (!testSmtpEmail) return;
        setSendingSmtpTest(true);
        try {
            await sendBridgeEmail(
                testSmtpEmail, 
                "Teste de Integração (Nexus Bridge)", 
                "<h1>Teste SMTP</h1><p>Se você recebeu este e-mail, o servidor local Nexus Bridge está conectado corretamente ao seu provedor SMTP.</p>", 
                currentUser?.name || "Admin"
            );
            addSystemNotification("Sucesso", "E-mail enviado via Bridge (Servidor Local)", "success");
        } catch (e: any) {
            const msg = e.message === "Bridge desconectado" ? "Servidor local offline. Inicie o 'node index.js'." : e.message;
            alert(`Erro no envio SMTP: ${msg}`);
        } finally {
            setSendingSmtpTest(false);
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

    const handleOpenApproval = (user: User) => {
        setMemberToApprove(user);
        setApprovalRole(user.role || 'sales'); 
        setIsApprovalModalOpen(true);
    };

    const handleConfirmApproval = async () => {
        if (memberToApprove) {
            await adminUpdateUser(memberToApprove.id, { active: true, role: approvalRole });
            setIsApprovalModalOpen(false);
            setMemberToApprove(null);
            addSystemNotification('Membro Aprovado', `${memberToApprove.name} agora faz parte da equipe como ${ROLE_NAMES[approvalRole]}.`, 'success');
        }
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

    const handleSaveFinancialCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFinCatForm.name) return;
        const category: FinancialCategory = {
            id: `FC-${Date.now()}`,
            name: newFinCatForm.name,
            code: newFinCatForm.code,
            type: newFinCatForm.type || 'Expense', 
            description: newFinCatForm.description,
            budget: Number(newFinCatForm.budget) || 0,
            organizationId: currentUser?.organizationId
        };
        addFinancialCategory(category);
        setNewFinCatForm({ name: '', code: '', type: 'Expense' });
        addSystemNotification('Sucesso', 'Centro de custo adicionado ao Plano de Contas.', 'success');
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
            costCenterId: newProduct.costCenterId,
            organizationId: currentUser?.organizationId
        };
        if(editingProductId) updateProduct(currentUser, productData);
        else addProduct(currentUser, productData);
        setIsProductModalOpen(false);
        setNewProduct({ active: true, category: 'Subscription', price: 0, costCenterId: '' });
        setEditingProductId(null);
    };
    
    // --- MENU CONFIG ---
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
            { id: 'financial', label: 'Financeiro (DRE)', icon: Wallet },
            { id: 'integrations', label: 'Banco de Dados', icon: Database }, 
            { id: 'bridge', label: 'Nexus Bridge', icon: Server }, 
            { id: 'custom_fields', label: 'Campos Personalizados', icon: ListChecks },
            { id: 'webhooks', label: 'Webhooks & API', icon: Code },
            { id: 'database', label: 'Diagnóstico BD', icon: Activity },
            { id: 'audit', label: 'Auditoria', icon: List },
        );
        if (isSuperAdmin) {
            menuItems.push({ id: 'saas_admin', label: 'SaaS Admin', icon: Building2 });
        }
    }

    const sqlRepairScript = `-- SCRIPT DE CORREÇÃO DE PERMISSÕES E REALTIME (COMPLETO)
-- Execute este bloco no SQL Editor do Supabase para corrigir o erro "permission denied" e ativar atualizações automáticas

-- 1. Cria a tabela se não existir
create table if not exists public.financial_categories (
  id text primary key,
  organization_id text,
  name text,
  code text,
  type text, -- Adicionado para DRE
  description text,
  budget numeric,
  created_at timestamptz default now()
);

-- 2. Desativa segurança de linha (RLS) para permitir leitura/escrita livre e evitar erros de permissão
alter table public.financial_categories disable row level security;
alter table public.clients disable row level security;
alter table public.leads disable row level security;
alter table public.tickets disable row level security;
alter table public.products disable row level security;
alter table public.invoices disable row level security;
alter table public.activities disable row level security;

-- 3. Garante permissões explícitas para todos os roles (anon/public/authenticated)
GRANT ALL ON public.financial_categories TO anon, authenticated, service_role;
GRANT ALL ON public.clients TO anon, authenticated, service_role;
GRANT ALL ON public.leads TO anon, authenticated, service_role;
GRANT ALL ON public.tickets TO anon, authenticated, service_role;
GRANT ALL ON public.products TO anon, authenticated, service_role;
GRANT ALL ON public.invoices TO anon, authenticated, service_role;
GRANT ALL ON public.activities TO anon, authenticated, service_role;

-- 4. Habilita Realtime (Publicação) para que os dados atualizem sozinhos na tela
-- Primeiro remove para evitar duplicidade, depois recria
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.clients, public.leads, public.tickets;
commit;

-- Confirmação
select count(*) as categorias_existentes from public.financial_categories;
`;

    // Visual Status Logic for Bridge
    const getServerStatusColor = () => {
        if (bridgeStatus.server !== 'ONLINE') return 'bg-red-100 text-red-600';
        if (bridgeStatus.smtp === 'MISSING_CREDENTIALS') return 'bg-yellow-100 text-yellow-600';
        return 'bg-green-100 text-green-600 animate-pulse';
    };

    const getServerStatusText = () => {
        if (bridgeStatus.server !== 'ONLINE') return 'Desconectado';
        if (bridgeStatus.smtp === 'MISSING_CREDENTIALS') return 'Aguardando Configuração';
        return 'Conectado';
    };

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
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
                    <p className="text-[10px] text-slate-400">Nexus CRM Enterprise v3.7</p>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && currentUser && (
                    <div className="max-w-3xl mx-auto animate-fade-in">
                        <SectionTitle title="Meu Perfil" subtitle="Gerencie suas informações pessoais" />
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                             <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                                <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]"></div>
                            </div>
                            <div className="px-8 pb-8 relative">
                                <div className="flex justify-between items-end -mt-12 mb-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-500 dark:text-slate-400 shadow-md overflow-hidden">
                                            {profileForm.avatar ? (
                                                <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{profileForm.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 bg-white dark:bg-slate-700 p-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition">
                                            <Camera size={14} className="text-slate-500 dark:text-slate-300"/>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} ref={fileInputRef}/>
                                        </label>
                                    </div>
                                    {!isEditingProfile ? (
                                        <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition flex items-center gap-2">
                                            <Edit2 size={16}/> Editar Perfil
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">Cancelar</button>
                                            <button onClick={handleProfileUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm">Salvar</button>
                                        </div>
                                    )}
                                </div>
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
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                                            <input 
                                                type="email" 
                                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-70"
                                                value={profileForm.email}
                                                disabled // Email cannot be changed easily
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
                                                placeholder="(00) 00000-0000"
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
                                                placeholder="000.000.000-00"
                                            />
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ORGANIZATION TAB --- */}
                {activeTab === 'organization' && currentOrganization && (
                    <div className="max-w-3xl mx-auto animate-fade-in">
                        <SectionTitle title="Organização" subtitle="Dados da empresa e assinatura" />
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-6">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Building2 size={32}/>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentOrganization.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Plano: <span className="font-bold text-blue-600 dark:text-blue-400">{currentOrganization.plan}</span></p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome da Empresa</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={currentOrganization.name} readOnly />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Identificador (Slug)</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm">nexus.com/</span>
                                        <input type="text" className="flex-1 border border-slate-300 dark:border-slate-600 rounded-r-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" value={currentOrganization.slug} readOnly />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <h4 className="font-bold text-yellow-800 dark:text-yellow-500 text-sm mb-1">Status da Assinatura</h4>
                                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                    Licença válida até: {currentOrganization.licenseExpiresAt ? new Date(currentOrganization.licenseExpiresAt).toLocaleDateString() : 'Indefinido'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TEAM TAB --- */}
                {activeTab === 'team' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Equipe" subtitle="Gerencie usuários e acessos" />
                            <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2">
                                <Plus size={18}/> Novo Membro
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4">Usuário</th>
                                        <th className="p-4">Função</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {usersList?.filter(u => u.role !== 'client').map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                                        {user.avatar?.length === 1 ? user.avatar : user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-bold uppercase">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {user.active ? (
                                                    <span className="text-green-600 dark:text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Ativo</span>
                                                ) : (
                                                    <button onClick={() => handleOpenApproval(user)} className="text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"><AlertTriangle size={12}/> Pendente</button>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => { if(confirm("Remover usuário?")) adminDeleteUser(user.id); }} className="p-2 text-slate-400 hover:text-red-600 transition">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- PERMISSIONS TAB --- */}
                {activeTab === 'permissions' && (
                    <div className="space-y-6 animate-fade-in">
                        <SectionTitle title="Permissões (RBAC)" subtitle="Controle de acesso por função" />
                        
                        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                            {Object.keys(ROLE_NAMES).filter(r => r !== 'admin').map(role => (
                                <button 
                                    key={role}
                                    onClick={() => setSelectedRoleForPerms(role as Role)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${selectedRoleForPerms === role ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    {ROLE_NAMES[role] || role}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4">Módulo</th>
                                        <th className="p-4 text-center">Visualizar</th>
                                        <th className="p-4 text-center">Criar</th>
                                        <th className="p-4 text-center">Editar</th>
                                        <th className="p-4 text-center">Excluir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {Object.keys(permissionMatrix[selectedRoleForPerms] || {}).map(module => (
                                        <tr key={module} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 font-medium text-slate-700 dark:text-slate-300 capitalize">{module.replace('-', ' ')}</td>
                                            {['view', 'create', 'edit', 'delete'].map(action => (
                                                <td key={action} className="p-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={permissionMatrix[selectedRoleForPerms]?.[module]?.[action as PermissionAction] || false}
                                                        onChange={(e) => updatePermission(selectedRoleForPerms, module, action as PermissionAction, e.target.checked)}
                                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- PRODUCTS TAB --- */}
                {activeTab === 'products' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Produtos & Serviços" subtitle="Catálogo de itens comercializáveis" />
                            <div className="flex gap-2">
                                <button onClick={refreshData} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition" title="Recarregar"><RefreshCw size={18} className={isSyncing ? "animate-spin" : ""}/></button>
                                <button onClick={() => { setEditingProductId(null); setNewProduct({ active: true, category: 'Subscription', price: 0, costCenterId: '' }); setIsProductModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2">
                                    <Plus size={18}/> Novo Produto
                                </button>
                            </div>
                        </div>
                        
                        {products && products.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.map(product => (
                                    <div key={product.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge color={product.active ? 'green' : 'gray'}>{product.active ? 'Ativo' : 'Inativo'}</Badge>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => handleEditProduct(product)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteProduct(product)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{product.name}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2 h-10">{product.description}</p>
                                        
                                        {/* Display Cost Center */}
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                                            Centro de Custo: {financialCategories.find(c => c.id === product.costCenterId)?.name || 'N/A'}
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{product.category}</span>
                                            {/* PROTECTION: Use nullish coalescing to prevent crash if price is null */}
                                            <span className="text-lg font-bold text-slate-800 dark:text-white">R$ {(product.price || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                                <Package size={48} className="mx-auto mb-2 opacity-50"/>
                                <p>Nenhum produto cadastrado.</p>
                                <button onClick={() => setIsProductModalOpen(true)} className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline mt-2">Criar o primeiro</button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* --- FINANCIAL CONFIG TAB --- */}
                {activeTab === 'financial' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Plano de Contas (DRE)" subtitle="Categorias para organização financeira (Receita / Despesa)" />
                             <button onClick={refreshData} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition" title="Recarregar"><RefreshCw size={18} className={isSyncing ? "animate-spin" : ""}/></button>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                             <form onSubmit={handleSaveFinancialCategory} className="flex gap-4 items-end flex-wrap">
                                <div className="w-32">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Código</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFinCatForm.code} onChange={e => setNewFinCatForm({...newFinCatForm, code: e.target.value})} placeholder="1.01" />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome da Categoria</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFinCatForm.name} onChange={e => setNewFinCatForm({...newFinCatForm, name: e.target.value})} placeholder="Ex: Vendas, Aluguel" />
                                </div>
                                <div className="w-40">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo (DRE)</label>
                                    <select 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
                                        value={newFinCatForm.type}
                                        onChange={e => setNewFinCatForm({...newFinCatForm, type: e.target.value as any})}
                                    >
                                        <option value="Revenue">Receita (+)</option>
                                        <option value="Expense">Despesa (-)</option>
                                    </select>
                                </div>
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Adicionar</button>
                             </form>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4 w-24">Código</th>
                                        <th className="p-4">Nome da Conta</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {financialCategories && financialCategories.length > 0 ? (
                                        financialCategories
                                        .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                                        .map(cat => (
                                            <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{cat.code || '-'}</td>
                                                <td className="p-4 font-bold text-slate-800 dark:text-white">{cat.name}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${cat.type === 'Revenue' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                        {cat.type === 'Revenue' ? 'Receita' : 'Despesa'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => deleteFinancialCategory(cat.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma categoria cadastrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* --- PORTAL CONFIG TAB --- */}
                {activeTab === 'portal_config' && (
                     <div className="space-y-6 animate-fade-in">
                        <SectionTitle title="Configuração do Portal do Cliente" subtitle="Personalize a experiência dos seus clientes" />
                        
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Portal</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        value={portalForm.portalName}
                                        onChange={e => setPortalForm({...portalForm, portalName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cor Primária</label>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            type="color" 
                                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                            value={portalForm.primaryColor}
                                            onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})}
                                        />
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white uppercase"
                                            value={portalForm.primaryColor}
                                            onChange={e => setPortalForm({...portalForm, primaryColor: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 space-y-4">
                                <h4 className="font-bold text-slate-800 dark:text-white">Funcionalidades Disponíveis</h4>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="allowInvoice"
                                        checked={portalForm.allowInvoiceDownload}
                                        onChange={e => setPortalForm({...portalForm, allowInvoiceDownload: e.target.checked})}
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="allowInvoice" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Permitir download de faturas</label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="allowTicket"
                                        checked={portalForm.allowTicketCreation}
                                        onChange={e => setPortalForm({...portalForm, allowTicketCreation: e.target.checked})}
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="allowTicket" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">Permitir abertura de chamados</label>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                <button onClick={handleSavePortal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">
                                    Salvar Configurações
                                </button>
                            </div>
                        </div>
                     </div>
                )}

                {/* --- CUSTOM FIELDS TAB --- */}
                {activeTab === 'custom_fields' && (
                     <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campos Personalizados" subtitle="Estenda os dados de Leads e Clientes" />
                            <button onClick={refreshData} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition" title="Recarregar"><RefreshCw size={18} className={isSyncing ? "animate-spin" : ""}/></button>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                            <form onSubmit={handleSaveCustomField} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Rótulo (Label)</label>
                                        <input type="text" required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.label} onChange={e => setNewFieldForm({...newFieldForm, label: e.target.value, key: (e.target.value || '').toLowerCase().replace(/\s+/g, '_')})} placeholder="Ex: Data de Aniversário" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo</label>
                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.type} onChange={e => setNewFieldForm({...newFieldForm, type: e.target.value as any})}>
                                            <option value="text">Texto</option>
                                            <option value="number">Número</option>
                                            <option value="date">Data</option>
                                            <option value="select">Seleção (Lista)</option>
                                            <option value="boolean">Sim/Não</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Módulo</label>
                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newFieldForm.module} onChange={e => setNewFieldForm({...newFieldForm, module: e.target.value as any})}>
                                            <option value="leads">Leads</option>
                                            <option value="clients">Clientes</option>
                                        </select>
                                    </div>
                                </div>
                                {newFieldForm.type === 'select' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Opções (separadas por vírgula)</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={fieldOptionsInput} onChange={e => setFieldOptionsInput(e.target.value)} placeholder="Opção A, Opção B, Opção C" />
                                    </div>
                                )}
                                <div className="flex justify-end">
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Adicionar Campo</button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4">Label</th>
                                        <th className="p-4">Chave (API)</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4">Módulo</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {customFields && customFields.length > 0 ? (
                                        customFields.map(field => (
                                            <tr key={field.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4 font-bold text-slate-800 dark:text-white">{field.label}</td>
                                                {/* PROTECTION: Ensure key is not null */}
                                                <td className="p-4 font-mono text-xs text-slate-500">{field.key || '-'}</td>
                                                <td className="p-4"><span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{field.type}</span></td>
                                                <td className="p-4 capitalize">{field.module}</td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => deleteCustomField(field.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum campo personalizado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}

                {/* --- WEBHOOKS TAB --- */}
                {activeTab === 'webhooks' && (
                    <div className="space-y-6 animate-fade-in">
                        <SectionTitle title="Webhooks & API" subtitle="Integrações externas" />
                        
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                             <form onSubmit={handleSaveWebhook} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                                        <input type="text" required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.name} onChange={e => setNewWebhookForm({...newWebhookForm, name: e.target.value})} placeholder="Integração Zapier" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Evento Gatilho</label>
                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newWebhookForm.triggerEvent} onChange={e => setNewWebhookForm({...newWebhookForm, triggerEvent: e.target.value as any})}>
                                            <option value="lead_created">Lead Criado</option>
                                            <option value="deal_won">Venda Ganha</option>
                                            <option value="ticket_created">Ticket Criado</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">URL de Destino</label>
                                    <input type="url" required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm" value={newWebhookForm.url} onChange={e => setNewWebhookForm({...newWebhookForm, url: e.target.value})} placeholder="https://hooks.zapier.com/..." />
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700">Criar Webhook</button>
                                </div>
                             </form>
                        </div>

                         <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4">Nome</th>
                                        <th className="p-4">Evento</th>
                                        <th className="p-4">URL</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {webhooks && webhooks.length > 0 ? (
                                        webhooks.map(hook => (
                                            <tr key={hook.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4 font-bold text-slate-800 dark:text-white">{hook.name}</td>
                                                <td className="p-4"><Badge color="purple">{hook.triggerEvent}</Badge></td>
                                                {/* PROTECTION: Ensure url is not null */}
                                                <td className="p-4 font-mono text-xs text-slate-500 truncate max-w-[200px]">{hook.url || '-'}</td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => deleteWebhook(hook.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum webhook configurado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* --- AUDIT TAB --- */}
                {activeTab === 'audit' && (
                    <div className="space-y-6 animate-fade-in">
                        <SectionTitle title="Auditoria" subtitle="Registro de atividades do sistema" />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4">Data/Hora</th>
                                        <th className="p-4">Usuário</th>
                                        <th className="p-4">Ação</th>
                                        <th className="p-4">Detalhes</th>
                                        <th className="p-4">Módulo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {displayLogs && displayLogs.length > 0 ? (
                                        displayLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                {/* PROTECTION: Safe date parsing */}
                                                <td className="p-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                                                </td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-white">{log.userName}</td>
                                                <td className="p-4"><span className="bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded text-xs font-bold">{log.action}</span></td>
                                                <td className="p-4 text-slate-600 dark:text-slate-300 truncate max-w-xs" title={log.details}>{log.details}</td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400 text-xs uppercase">{log.module}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* --- SAAS ADMIN TAB --- */}
                {activeTab === 'saas_admin' && isSuperAdmin && (
                    <div className="space-y-6 animate-fade-in">
                        <SectionTitle title="Administração SaaS" subtitle="Gestão Multi-tenant" />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4">Organização</th>
                                        <th className="p-4">Slug</th>
                                        <th className="p-4">Plano</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {saasOrgs && saasOrgs.length > 0 ? (
                                        saasOrgs.map(org => (
                                            <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4 font-bold text-slate-800 dark:text-white">{org.name}</td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400">{org.slug}</td>
                                                <td className="p-4"><Badge color="blue">{org.plan}</Badge></td>
                                                <td className="p-4">
                                                    {org.status === 'pending' ? <span className="text-orange-500 font-bold text-xs">Pendente</span> : <span className="text-green-500 font-bold text-xs">Ativo</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {org.status === 'pending' && (
                                                        <button onClick={() => approveOrganization(org.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">Aprovar</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma organização encontrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* --- DATABASE DIAGNOSTICS TAB --- */}
                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <SectionTitle title="Diagnóstico de Banco de Dados" subtitle="Status da sincronização e integridade" />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Object.entries(cloudCounts).map(([table, count]) => (
                                <div key={table} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">{table}</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                        {loadingCounts ? <Loader2 className="animate-spin" size={20}/> : count}
                                    </p>
                                    <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1"><CheckCircle size={10}/> Sincronizado</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={handleHardReset} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 transition">
                                <Power size={16}/> Resetar Cache e Reiniciar
                            </button>
                            <button onClick={() => { setShowSqlModal(true); }} className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                <Terminal size={16}/> Executar SQL de Correção
                            </button>
                        </div>

                         {/* SQL Modal */}
                         {showSqlModal && (
                            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                                <div className="bg-white dark:bg-slate-800 w-full max-w-2xl p-6 rounded-xl shadow-2xl">
                                    <h3 className="font-bold text-lg mb-4 dark:text-white">Script de Correção Completa (Supabase)</h3>
                                    <p className="text-sm text-slate-500 mb-2">Este script desativa o RLS (Row Level Security) para garantir que você veja os dados.</p>
                                    <textarea readOnly className="w-full h-64 bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-lg" value={sqlRepairScript} />
                                    <div className="flex justify-end mt-4 gap-2">
                                        <button onClick={() => setShowSqlModal(false)} className="px-4 py-2 border rounded text-slate-500">Fechar</button>
                                        <button onClick={() => { navigator.clipboard.writeText(sqlRepairScript); alert("Copiado!"); }} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Copiar SQL</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* --- BRIDGE TAB --- */}
                {activeTab === 'bridge' && (
                    <div className="space-y-6 animate-fade-in">
                        <SectionTitle title="Nexus Bridge" subtitle="Integração WhatsApp e SMTP Local" />
                        
                        {/* --- SERVER STATUS INDICATOR --- */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-full ${getServerStatusColor()}`}>
                                        <Server size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            Servidor Local (Node.js)
                                            <span className={`text-xs px-2 py-0.5 rounded uppercase ${
                                                bridgeStatus.server === 'ONLINE' ? 
                                                    (bridgeStatus.smtp === 'MISSING_CREDENTIALS' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700') 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {getServerStatusText()}
                                            </span>
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {bridgeStatus.server === 'ONLINE' 
                                                ? 'O Nexus Bridge está ativo na porta 3001. E-mails e WhatsApp funcionais.' 
                                                : 'O frontend não consegue acessar http://127.0.0.1:3001.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleManualBridgeCheck} 
                                        className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-bold transition flex items-center gap-2"
                                    >
                                        {loadingBridge ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>}
                                        Verificar Conexão
                                    </button>
                                    <button
                                        onClick={runDiagnostics}
                                        className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold transition flex items-center gap-2 border border-indigo-200 dark:border-indigo-800"
                                    >
                                        <Wifi size={18}/> Diagnóstico de Rede
                                    </button>
                                </div>
                            </div>

                            {/* Troubleshooting Box if Offline */}
                            {bridgeStatus.server !== 'ONLINE' && (
                                <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-1" size={20}/>
                                    <div>
                                        <h5 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Como iniciar o servidor:</h5>
                                        <div className="mt-2 bg-slate-900 text-green-400 p-3 rounded font-mono text-xs shadow-inner">
                                            cd server<br/>
                                            npm install<br/>
                                            node index.js
                                        </div>
                                    </div>
                                </div>
                            )}

                             {/* Debug Output */}
                             {debugInfo && (
                                <div className="mt-4 p-4 bg-slate-900 text-green-400 font-mono text-xs rounded-lg overflow-x-auto whitespace-pre-wrap border border-slate-700 shadow-inner">
                                    <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                                        <span className="font-bold text-white">LOG DE DIAGNÓSTICO</span>
                                        <button onClick={() => setDebugInfo('')} className="text-slate-400 hover:text-white"><X size={14}/></button>
                                    </div>
                                    {debugInfo}
                                </div>
                            )}
                        </div>
                        
                        {/* CONFIG SECTIONS */}
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${bridgeStatus.server !== 'ONLINE' ? 'opacity-70' : 'opacity-100'}`}>
                            {/* WhatsApp Config */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Smartphone size={20} className="text-green-500"/> WhatsApp Web</h4>
                                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <div className={`w-3 h-3 rounded-full ${bridgeStatus.whatsapp === 'READY' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Status: {bridgeStatus.whatsapp}</span>
                                </div>
                                {bridgeQr ? (
                                    <div className="flex flex-col items-center p-4 border border-slate-200 rounded-lg">
                                        <img src={bridgeQr} alt="QR Code" className="w-48 h-48 mb-2" />
                                        <p className="text-xs text-slate-500">Escaneie com seu WhatsApp</p>
                                    </div>
                                ) : bridgeStatus.whatsapp === 'READY' ? (
                                    <div className="text-center p-8 text-green-600 bg-green-50 rounded-lg border border-green-100">
                                        <CheckCircle size={48} className="mx-auto mb-2"/>
                                        <p className="font-bold">WhatsApp Conectado!</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <Loader2 size={32} className="mx-auto mb-2 animate-spin"/>
                                        <p className="text-sm">Aguardando QR Code...</p>
                                        <button onClick={handleManualBridgeCheck} className="mt-4 text-xs text-blue-600 font-bold hover:underline">Tentar Novamente</button>
                                    </div>
                                )}
                            </div>

                            {/* SMTP Config */}
                            <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl border ${bridgeStatus.smtp === 'MISSING_CREDENTIALS' ? 'border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-100 dark:ring-yellow-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Mail size={20} className="text-blue-500"/> Configuração SMTP (Email)</h4>
                                
                                {bridgeStatus.smtp === 'MISSING_CREDENTIALS' && (
                                    <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-3 rounded text-sm flex items-center gap-2 border border-yellow-200 dark:border-yellow-800">
                                        <AlertCircle size={16}/> Preencha os dados abaixo e clique em Salvar para ativar o envio.
                                    </div>
                                )}

                                <form onSubmit={handleSaveSmtp} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Host</label><input type="text" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.host} onChange={e => setSmtpForm({...smtpForm, host: e.target.value})}/></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Porta</label><input type="number" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.port} onChange={e => setSmtpForm({...smtpForm, port: parseInt(e.target.value)})}/></div>
                                    </div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Usuário (E-mail)</label><input type="text" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.user} onChange={e => setSmtpForm({...smtpForm, user: e.target.value})}/></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Senha (App Password)</label><input type="password" className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={smtpForm.pass} onChange={e => setSmtpForm({...smtpForm, pass: e.target.value})}/></div>
                                    
                                    {smtpStatusMsg && (
                                        <div className={`p-2 rounded text-xs flex items-center gap-2 ${smtpStatusMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {smtpStatusMsg.type === 'success' ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                                            {smtpStatusMsg.text}
                                        </div>
                                    )}

                                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2">
                                        {loadingBridge ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                                        Salvar Credenciais
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* SMTP Test */}
                        <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${bridgeStatus.server !== 'ONLINE' ? 'opacity-70' : ''}`}>
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Send size={18} className="text-orange-500"/> Teste de Disparo Real
                            </h4>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail de Destino</label>
                                    <input 
                                        type="email" 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="seu@email.com"
                                        value={testSmtpEmail}
                                        onChange={(e) => setTestSmtpEmail(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleTestSmtpEmail}
                                    disabled={!testSmtpEmail || sendingSmtpTest}
                                    className="bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-orange-700 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                                >
                                    {sendingSmtpTest ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Testar Envio
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Envia um e-mail de teste utilizando as credenciais SMTP configuradas acima através do servidor Node.js local.
                            </p>
                        </div>
                    </div>
                )}
                
                {/* --- INTEGRATIONS TAB --- */}
                {activeTab === 'integrations' && (
                    <div className="space-y-6">
                        <SectionTitle title="Configuração de Banco de Dados" subtitle="Conecte ao seu projeto Supabase" />
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <form onSubmit={handleSaveSupabase} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Project URL</label>
                                    <input 
                                        type="url" 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                                        value={supabaseForm.url}
                                        onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">API Key (Anon/Public)</label>
                                    <input 
                                        type="password" 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                                        value={supabaseForm.key}
                                        onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {connectionStatus === 'testing' && <span className="text-yellow-600 text-sm flex items-center gap-1"><Loader2 className="animate-spin" size={14}/> Testando...</span>}
                                        {connectionStatus === 'success' && <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14}/> Conectado</span>}
                                        {connectionStatus === 'error' && <span className="text-red-600 text-sm flex items-center gap-1"><AlertTriangle size={14}/> Falha</span>}
                                        {statusMessage && <span className="text-xs text-slate-500 ml-2">({statusMessage})</span>}
                                    </div>
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition">Salvar e Conectar</button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Send size={18} className="text-purple-500"/> Teste de Disparo (API Cloud)
                            </h4>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail de Destino</label>
                                    <input 
                                        type="email" 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="seu@email.com"
                                        value={testApiEmail}
                                        onChange={(e) => setTestApiEmail(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleTestApiEmail}
                                    disabled={!testApiEmail || sendingApiTest}
                                    className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                                >
                                    {sendingApiTest ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} Testar Envio
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Testa o envio via Supabase Edge Function e API Resend.
                            </p>
                        </div>
                    </div>
                )}

                {/* --- MODAL: NEW MEMBER --- */}
                {isTeamModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-xl shadow-2xl animate-scale-in">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Adicionar Membro</h3>
                            <form onSubmit={handleAddMember} className="space-y-4">
                                <input required type="text" placeholder="Nome" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                                <input required type="email" placeholder="Email" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                                <select className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as Role})}>
                                    {Object.entries(ROLE_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 border rounded text-slate-500">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Adicionar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                
                {/* --- MODAL: NEW PRODUCT --- */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                         <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-xl shadow-2xl animate-scale-in">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{editingProductId ? 'Editar' : 'Novo'} Produto</h3>
                            <form onSubmit={handleSaveProduct} className="space-y-4">
                                <input required type="text" placeholder="Nome do Produto" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                                <textarea placeholder="Descrição" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input required type="number" placeholder="Preço (R$)" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                                    <select className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={newProduct.category || 'Service'} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}><option value="Service">Serviço</option><option value="Product">Produto</option><option value="Subscription">Assinatura</option></select>
                                </div>
                                {/* Cost Center Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Centro de Custo Vinculado</label>
                                    <select 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                                        value={newProduct.costCenterId || ''}
                                        onChange={e => setNewProduct({...newProduct, costCenterId: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {financialCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 border rounded text-slate-500">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Salvar</button>
                                </div>
                            </form>
                         </div>
                    </div>
                )}
            </main>
        </div>
    );
};
