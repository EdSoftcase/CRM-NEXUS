import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { 
    UserCircle, Shield, Activity, Edit2, Trash2, Plus, Package, X, Save, 
    Database, CheckCircle, Code, Building2, Users, 
    AlertTriangle, Search, Settings2, Link2, List,
    Cloud, RefreshCw, Loader2, Zap, ListChecks,
    Smartphone, Mail, Wifi, WifiOff, BadgeCheck, 
    DollarSign, Wrench, Calendar, Timer, PieChart as PieIcon, Wallet, Server, CreditCard, Power, Info, LayoutGrid, ShieldAlert,
    MessageSquare, FileText, Copy, Terminal, ChevronRight, Trophy, Check, XCircle
} from 'lucide-react';
import { SectionTitle, Badge } from '../components/Widgets';
import { Role, Product, PermissionAction, CustomFieldDefinition, WebhookConfig, TriggerType, FinancialCategory, Organization } from '../types';
import { getSupabaseConfig, testSupabaseConnection, getSupabase, getSupabaseSchema } from '../services/supabaseClient';
import { checkBridgeStatus } from '../services/bridgeService';
import { MOCK_ORGANIZATIONS } from '../constants';
import { configureIugu } from '../services/bridgeService';

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
    commercial: 'Comercial',
    clients: 'Clientes',
    finance: 'Financeiro',
    support: 'Suporte',
    dev: 'Dev',
    reports: 'Relatórios',
    settings: 'Configurações',
    marketing: 'Marketing',
    projects: 'Projetos',
    operations: 'Operações',
    proposals: 'Propostas'
};

const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com', 'superadmin@nexus.com'];

export const Settings: React.FC = () => {
    const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, permissionMatrix, updatePermission, approveOrganization } = useAuth();
    const { 
        products, addProduct, removeProduct, 
        customFields, addCustomField, deleteCustomField, 
        webhooks, addWebhook, deleteWebhook, 
        addSystemNotification, logs: contextLogs,
        financialCategories, addFinancialCategory, deleteFinancialCategory
    } = useData();
    
    const { data: auditLogs, isLoading: loadingLogs } = useAuditLogs();
    const displayLogs = auditLogs && auditLogs.length > 0 ? auditLogs : contextLogs;

    const isSuperAdmin = currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email);

    const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'saas' | 'team' | 'permissions' | 'products' | 'financial' | 'strategic' | 'custom_fields' | 'webhooks' | 'integrations' | 'iugu' | 'bridge' | 'audit' | 'database'>('profile');
    
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar: '' });
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('sales');
    const [strategicForm, setStrategicForm] = useState({ targetCAC: 1200, churnLimit: 5, ltvMultiplier: 12, expectedGrowth: 15 });
    
    const [cloudCounts, setCloudCounts] = useState<Record<string, number>>({});
    const [loadingCounts, setLoadingCounts] = useState(false);
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [bridgeStatus, setBridgeStatus] = useState({ server: 'OFFLINE' });
    const [iuguForm, setIuguForm] = useState({ token: '', accountId: '' });
    const [isSavingIugu, setIsSavingIugu] = useState(false);

    // SaaS Management States
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0 });
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });
    const [newFinCatForm, setNewFinCatForm] = useState({ code: '', name: '', type: 'Revenue' as 'Revenue' | 'Expense' });
    const [newFieldForm, setNewFieldForm] = useState<Partial<CustomFieldDefinition>>({ label: '', key: '', type: 'text', module: 'leads', required: false });
    const [newWebhookForm, setNewWebhookForm] = useState<Partial<WebhookConfig>>({ name: '', url: '', triggerEvent: 'lead_created', method: 'POST', active: true });

    useEffect(() => {
        if (currentUser) setProfileForm({ name: currentUser.name || '', email: currentUser.email || '', avatar: currentUser.avatar || '' });
    }, [currentUser]);

    useEffect(() => {
        if (activeTab === 'database') fetchCloudCounts();
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
        }
        if (activeTab === 'bridge' || activeTab === 'iugu') {
            checkBridgeStatus().then(setBridgeStatus);
        }
        if (activeTab === 'saas') {
            fetchOrganizations();
        }
    }, [activeTab]);

    const fetchOrganizations = async () => {
        setLoadingOrgs(true);
        const supabase = getSupabase();
        if (!supabase) { setOrgs(MOCK_ORGANIZATIONS); setLoadingOrgs(false); return; }
        try {
            const { data, error } = await supabase.from('organizations').select('*');
            if (data) setOrgs(data);
        } catch (e) { console.error(e); } finally { setLoadingOrgs(false); }
    };

    const handleApproveOrg = async (orgId: string) => {
        if (confirm("Deseja aprovar esta organização?")) {
            const success = await approveOrganization(orgId);
            if (success) {
                addSystemNotification("Master Admin", "Organização aprovada.", "success");
                fetchOrganizations();
            }
        }
    };

    const fetchCloudCounts = async () => {
        setLoadingCounts(true);
        const supabase = getSupabase();
        if (!supabase) { setLoadingCounts(false); return; }
        try {
            const tables = ['leads', 'clients', 'tickets', 'invoices', 'projects', 'products', 'proposals', 'issues', 'financial_categories'];
            const newCounts: Record<string, number> = {};
            await Promise.all(tables.map(async (table) => {
                const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
                newCounts[table] = count || 0;
            }));
            setCloudCounts(newCounts);
        } catch (e) { console.error(e); } finally { setLoadingCounts(false); }
    };

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateUser({ name: profileForm.name });
        setIsEditingProfile(false);
        addSystemNotification("Sucesso", "Perfil atualizado.", "success");
    };

    const handleSavePermission = (mod: string, action: PermissionAction, val: boolean) => {
        updatePermission(selectedRoleForPerms, mod, action, val);
    };

    const handleSaveCustomField = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFieldForm.label || !newFieldForm.key) return;
        addCustomField({
            id: `CF-${Date.now()}`,
            label: newFieldForm.label,
            key: newFieldForm.key,
            type: newFieldForm.type as any,
            module: newFieldForm.module as any,
            required: !!newFieldForm.required,
            organizationId: currentOrganization?.id
        });
        setNewFieldForm({ label: '', key: '', type: 'text', module: 'leads', required: false });
        addSystemNotification("Atributos", "Novo campo adicionado.", "success");
    };

    const handleSaveWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWebhookForm.url) return;
        addWebhook({
            id: `WH-${Date.now()}`,
            name: newWebhookForm.name || 'Nova Integração',
            url: newWebhookForm.url,
            triggerEvent: newWebhookForm.triggerEvent as TriggerType,
            method: newWebhookForm.method as any,
            active: true,
            organizationId: currentOrganization?.id
        });
        setNewWebhookForm({ name: '', url: '', triggerEvent: 'lead_created', method: 'POST', active: true });
        addSystemNotification("Webhooks", "Webhook registrado.", "success");
    };

    const handleSaveFinancialCategory = (e: React.FormEvent) => {
        e.preventDefault();
        addFinancialCategory({
            id: `FC-${Date.now()}`,
            ...newFinCatForm,
            organizationId: currentOrganization?.id
        });
        setNewFinCatForm({ code: '', name: '', type: 'Revenue' });
        addSystemNotification("DRE", "Conta adicionada ao plano.", "success");
    };

    const handleSaveProduct = (e: React.FormEvent) => {
        e.preventDefault();
        const prodData: Product = {
            id: `PROD-${Date.now()}`,
            name: newProduct.name || '',
            description: newProduct.description || '',
            price: Number(newProduct.price),
            sku: newProduct.sku || '',
            category: newProduct.category as any || 'Service',
            active: true,
            organizationId: currentOrganization?.id
        };
        addProduct(currentUser, prodData);
        setIsProductModalOpen(false);
        setNewProduct({ active: true, category: 'Subscription', price: 0 });
    };

    const handleSaveIugu = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingIugu(true);
        try {
            await configureIugu(iuguForm.token, iuguForm.accountId);
            addSystemNotification("Sucesso", "Configurações da Iugu salvas no Bridge.", "success");
        } catch (e) {
            addSystemNotification("Erro", "Certifique-se que o Nexus Bridge está rodando.", "alert");
        } finally { setIsSavingIugu(false); }
    };

    const handleHardReset = () => {
        if (confirm("ATENÇÃO: Isso apagará o cache local e forçará o download dos dados da nuvem. Continuar?")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const copySchema = () => {
        navigator.clipboard.writeText(getSupabaseSchema());
        addSystemNotification("Copiado!", "Schema SQL copiado para a área de transferência.", "success");
    };

    const menuItems = [
        { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
        { id: 'organization', label: 'Organização', icon: Building2 },
        { id: 'saas', label: 'Master SaaS Admin', icon: LayoutGrid, hidden: !isSuperAdmin },
        { id: 'team', label: 'Equipe & Acessos', icon: Users },
        { id: 'permissions', label: 'Permissões (RBAC)', icon: Shield },
        { id: 'products', label: 'Catálogo de Produtos', icon: Package },
        { id: 'financial', label: 'Plano de Contas', icon: Wallet },
        { id: 'strategic', label: 'Controladoria', icon: PieIcon },
        { id: 'custom_fields', label: 'Atributos Dinâmicos', icon: ListChecks },
        { id: 'webhooks', label: 'Webhooks & API', icon: Code },
        { id: 'iugu', label: 'Pagamentos Iugu', icon: CreditCard },
        { id: 'integrations', label: 'Conexão Cloud', icon: Database }, 
        { id: 'bridge', label: 'Nexus Bridge', icon: Server }, 
        { id: 'audit', label: 'Trilha de Auditoria', icon: List },
        { id: 'database', label: 'Diagnóstico de Dados', icon: Activity },
    ];

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-full shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings2 size={24} className="text-blue-600"/> Ajustes
                    </h1>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {menuItems.filter(i => !i.hidden).map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                
                {activeTab === 'profile' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Meu Perfil" subtitle="Gerencie suas informações de acesso e segurança." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                            <div className="px-8 pb-8 -mt-12">
                                <div className="flex justify-between items-end mb-6">
                                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-400 overflow-hidden">
                                        {profileForm.avatar && profileForm.avatar.length > 5 ? <img src={profileForm.avatar} className="w-full h-full object-cover" /> : profileForm.name.charAt(0)}
                                    </div>
                                    <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                                        {isEditingProfile ? 'Cancelar' : <><Edit2 size={16}/> Editar Perfil</>}
                                    </button>
                                </div>
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input disabled={!isEditingProfile} className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Corporativo</label><input disabled className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400" value={profileForm.email} /></div>
                                    </div>
                                    {isEditingProfile && <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition">Salvar Alterações</button>}
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'saas' && isSuperAdmin && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Master SaaS Admin" subtitle="Painel de controle global para gerenciamento de Tenants (Organizações)." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><LayoutGrid size={18} className="text-indigo-600"/> Lista de Organizações</h4>
                                <button onClick={fetchOrganizations} disabled={loadingOrgs} className="text-blue-600 p-2 hover:bg-white rounded-full"><RefreshCw size={16} className={loadingOrgs ? 'animate-spin' : ''}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="p-4">Nome / Identificador</th>
                                            <th className="p-4">Plano</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Criação</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {orgs.map(org => (
                                            <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-900 dark:text-white">{org.name}</p>
                                                    <p className="text-[10px] font-mono text-slate-400">{org.slug}</p>
                                                </td>
                                                <td className="p-4">
                                                    <Badge color="blue">{org.plan}</Badge>
                                                </td>
                                                <td className="p-4">
                                                    <Badge color={org.status === 'active' ? 'green' : org.status === 'pending' ? 'yellow' : 'red'}>
                                                        {org.status === 'active' ? 'Ativo' : org.status === 'pending' ? 'Pendente' : 'Suspenso'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-xs text-slate-500">
                                                    {new Date(org.created_at || '').toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {org.status === 'pending' && (
                                                            <button onClick={() => handleApproveOrg(org.id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition" title="Aprovar Organização">
                                                                <Check size={16}/>
                                                            </button>
                                                        )}
                                                        <button className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition" title="Suspender/Editar">
                                                            <XCircle size={16}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'organization' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Minha Organização" subtitle="Configurações globais da empresa e faturamento." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-6">
                                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                    {currentOrganization?.name.charAt(0) || 'N'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentOrganization?.name}</h3>
                                    <p className="text-sm text-slate-500">ID do Tenant: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{currentOrganization?.id}</code></p>
                                </div>
                                <div className="ml-auto text-right">
                                    <Badge color="blue">{currentOrganization?.plan || 'Enterprise'}</Badge>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Plano Ativo</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">Vencimento Licença</p>
                                    <p className="text-lg font-black text-slate-700 dark:text-white">{currentOrganization?.licenseExpiresAt ? new Date(currentOrganization.licenseExpiresAt).toLocaleDateString() : 'Perpétua'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">Status da Conta</p>
                                    <p className="text-lg font-black text-emerald-600">Verificada</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Gestão de Equipe" subtitle="Controle quem acessa os dados da organização." />
                            <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition">
                                <Plus size={18}/> Convidar Membro
                            </button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="p-4">Nome / Email</th>
                                        <th className="p-4">Perfil</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {usersList.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </td>
                                            <td className="p-4">
                                                <Badge color={user.role === 'admin' ? 'purple' : 'blue'}>{ROLE_NAMES[user.role]}</Badge>
                                            </td>
                                            <td className="p-4">
                                                <span className={`w-2.5 h-2.5 rounded-full inline-block mr-2 ${user.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span className="text-sm">{user.active ? 'Ativo' : 'Suspenso'}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => adminDeleteUser(user.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Controle de Acessos (RBAC)" subtitle="Defina o que cada perfil pode visualizar e editar." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center gap-4">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Perfil para Editar:</label>
                                <select className="border rounded-lg p-2 text-sm dark:bg-slate-700 dark:text-white" value={selectedRoleForPerms} onChange={e => setSelectedRoleForPerms(e.target.value as Role)}>
                                    {Object.entries(ROLE_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                                </select>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                                        <tr>
                                            <th className="p-4">Módulo</th>
                                            <th className="p-4 text-center">Visualizar</th>
                                            <th className="p-4 text-center">Criar</th>
                                            <th className="p-4 text-center">Editar</th>
                                            <th className="p-4 text-center">Excluir</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {Object.keys(MODULE_NAMES).map(mod => (
                                            <tr key={mod}>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{MODULE_NAMES[mod]}</td>
                                                {['view', 'create', 'edit', 'delete'].map(action => (
                                                    <td key={action} className="p-4 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded text-blue-600" 
                                                            checked={!!permissionMatrix[selectedRoleForPerms]?.[mod]?.[action as PermissionAction]} 
                                                            onChange={e => handleSavePermission(mod, action as PermissionAction, e.target.checked)}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Catálogo de Produtos & SKUs" subtitle="Gerencie os itens disponíveis para propostas e contratos." />
                            <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                <Plus size={18}/> Novo Produto
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {products.map(prod => (
                                <div key={prod.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group transition-colors">
                                    <button onClick={() => removeProduct(currentUser, prod.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Package size={20}/></div>
                                        <div><h4 className="font-bold text-slate-900 dark:text-white">{prod.name}</h4><p className="text-[10px] text-slate-400 uppercase font-bold">{prod.category}</p></div>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{prod.description}</p>
                                    <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-700 pt-4">
                                        <div><p className="text-[10px] text-slate-400 uppercase">Preço de Tabela</p><p className="font-mono font-bold text-slate-900 dark:text-white text-lg">R$ {prod.price.toLocaleString()}</p></div>
                                        <Badge color={prod.active ? 'green' : 'gray'}>{prod.active ? 'Ativo' : 'Inativo'}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Plano de Contas (DRE)" subtitle="Estruture sua contabilidade e categorias financeiras." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Adicionar Nova Conta</h3>
                                <form onSubmit={handleSaveFinancialCategory} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cód. Estrutural</label><input required className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" placeholder="1.01" value={newFinCatForm.code} onChange={e => setNewFinCatForm({...newFinCatForm, code: e.target.value})} /></div>
                                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo</label><select className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={newFinCatForm.type} onChange={e => setNewFinCatForm({...newFinCatForm, type: e.target.value as any})}><option value="Revenue">Receita</option><option value="Expense">Despesa</option></select></div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Conta</label><input required className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" placeholder="Ex: Salários e Encargos" value={newFinCatForm.name} onChange={e => setNewFinCatForm({...newFinCatForm, name: e.target.value})} /></div>
                                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-lg">Salvar Conta</button>
                                </form>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-white">Estrutura Atual</h4></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                    {financialCategories.sort((a,b) => (a.code || '').localeCompare(b.code || '')).map(cat => (
                                        <div key={cat.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition group">
                                            <div className="flex items-center gap-3"><span className="text-xs font-mono font-bold text-slate-400">{cat.code}</span><div><p className="text-sm font-bold text-slate-800 dark:text-white">{cat.name}</p><p className={`text-[10px] font-bold uppercase ${cat.type === 'Revenue' ? 'text-green-500' : 'text-red-400'}`}>{cat.type === 'Revenue' ? 'Receita' : 'Despesa'}</p></div></div>
                                            <button onClick={() => deleteFinancialCategory(cat.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Atributos Dinâmicos" subtitle="Crie novos campos para Leads e Clientes sem programar." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Criar Novo Campo</h3>
                                <form onSubmit={handleSaveCustomField} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Módulo</label><select className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white text-sm" value={newFieldForm.module} onChange={e => setNewFieldForm({...newFieldForm, module: e.target.value as any})}><option value="leads">Leads</option><option value="clients">Clientes</option></select></div>
                                        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo</label><select className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white text-sm" value={newFieldForm.type} onChange={e => setNewFieldForm({...newFieldForm, type: e.target.value as any})}><option value="text">Texto Curto</option><option value="number">Número</option><option value="date">Data</option><option value="boolean">Sim/Não</option><option value="select">Lista (Select)</option></select></div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Rótulo (Label)</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm" placeholder="Ex: Tamanho da Empresa" value={newFieldForm.label} onChange={e => setNewFieldForm({...newFieldForm, label: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">ID Interno (Chave)</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-mono text-xs" placeholder="tamanho_empresa" value={newFieldForm.key} onChange={e => setNewFieldForm({...newFieldForm, key: e.target.value.toLowerCase().replace(/\s/g, '_')})} /></div>
                                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg shadow-lg">Adicionar Campo</button>
                                </form>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[500px]">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 dark:bg-slate-900 flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-white">Campos Ativos</h4></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {customFields.map(field => (
                                        <div key={field.id} className="p-4 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-blue-400 transition group flex justify-between items-center bg-white dark:bg-slate-900">
                                            <div className="flex items-center gap-4"><div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-slate-500"><List size={16}/></div><div><p className="text-sm font-bold text-slate-800 dark:text-white">{field.label}</p><p className="text-[10px] text-slate-400 font-mono uppercase">{field.module} • {field.type} • {field.key}</p></div></div>
                                            <button onClick={() => deleteCustomField(field.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Webhooks & Integrações Externas" subtitle="Conecte o Nexus CRM a outras ferramentas (Zapier, Make, Slack)." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Novo Webhook (Outbound)</h3>
                                <form onSubmit={handleSaveWebhook} className="space-y-4">
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Gatilho (Trigger)</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newWebhookForm.triggerEvent} onChange={e => setNewWebhookForm({...newWebhookForm, triggerEvent: e.target.value as any})}><option value="lead_created">Novo Lead</option><option value="deal_won">Venda Ganhada</option><option value="client_churn_risk">Risco de Churn</option><option value="ticket_created">Ticket Aberto</option></select></div>
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">URL de Destino</label><input required type="url" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 font-mono text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://hooks.zapier.com/..." value={newWebhookForm.url} onChange={e => setNewWebhookForm({...newWebhookForm, url: e.target.value})} /></div>
                                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-lg">Ativar Webhook</button>
                                </form>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-white">Conexões Ativas</h4></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {webhooks.map(wh => (
                                        <div key={wh.id} className="p-4 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-blue-400 transition group flex justify-between items-center bg-white dark:bg-slate-900">
                                            <div className="flex items-center gap-4"><div className="p-2 bg-blue-50 dark:bg-blue-900 rounded text-blue-600 dark:text-blue-400"><Link2 size={16}/></div><div><p className="text-sm font-bold text-slate-800 dark:text-white">{wh.name}</p><p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{wh.url}</p><div className="mt-1"><Badge color="blue">{wh.triggerEvent}</Badge></div></div></div>
                                            <button onClick={() => deleteWebhook(wh.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'strategic' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Painel de Controladoria" subtitle="Defina as metas e indicadores globais do negócio." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Trophy size={18} className="text-yellow-500"/> Alvos Estratégicos</h3>
                                <div className="space-y-4">
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Custo de Aquisição (Target CAC) R$</label><input type="number" className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={strategicForm.targetCAC} onChange={e => setStrategicForm({...strategicForm, targetCAC: Number(e.target.value)})} /></div>
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Limite Aceitável de Churn (%)</label><input type="number" className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={strategicForm.churnLimit} onChange={e => setStrategicForm({...strategicForm, churnLimit: Number(e.target.value)})} /></div>
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Multiplicador LTV/CAC Alvo</label><input type="number" className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={strategicForm.ltvMultiplier} onChange={e => setStrategicForm({...strategicForm, ltvMultiplier: Number(e.target.value)})} /></div>
                                    <button onClick={() => addSystemNotification("Estratégia", "Metas salvas com sucesso.", "success")} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-lg">Salvar Configuração</button>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl flex flex-col justify-center items-center text-center">
                                <PieIcon size={64} className="text-indigo-400 mb-6" />
                                <h3 className="text-white font-bold text-xl mb-4">Análise Preditiva IA</h3>
                                <p className="text-slate-400 text-sm mb-6">Com base nas suas metas e no histórico de faturamento, a IA estima que sua meta de crescimento de <strong>15%</strong> requer um incremento de R$ 45k em MRR nos próximos 3 meses.</p>
                                <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm font-bold border border-white/20 transition">Ver Simulação Completa</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'iugu' && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <SectionTitle title="Pagamentos Iugu" subtitle="Configurações para emissão automática de boletos e Pix." />
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400"><CreditCard size={24}/></div>
                                <div><p className="font-bold text-slate-900 dark:text-white">API Iugu Production</p><div className="flex items-center gap-2 mt-0.5"><div className={`w-2 h-2 rounded-full ${bridgeStatus.server === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`}></div><p className="text-xs text-slate-500">{bridgeStatus.server === 'ONLINE' ? 'Conectado ao Bridge' : 'Nexus Bridge Offline'}</p></div></div>
                            </div>
                            <form onSubmit={handleSaveIugu} className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">API Token (Secret)</label><input type="password" required className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={iuguForm.token} onChange={e => setIuguForm({...iuguForm, token: e.target.value})} placeholder="32 chars token..." /></div>
                                <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Account ID</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={iuguForm.accountId} onChange={e => setIuguForm({...iuguForm, accountId: e.target.value})} placeholder="ID da sua conta Iugu" /></div>
                                <button disabled={isSavingIugu} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition">{isSavingIugu ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Configuração</>}</button>
                            </form>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-3"><Info size={16} className="shrink-0"/><p>As faturas geradas no CRM serão automaticamente enviadas para a Iugu e o link de pagamento será disponibilizado no Portal do Cliente.</p></div>
                        </div>
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <SectionTitle title="Nexus Bridge Server" subtitle="Conecte seu WhatsApp e SMTP via servidor local." />
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-8">
                            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                                {bridgeStatus.server === 'ONLINE' ? (
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"><Power size={40} className="text-green-600 dark:text-green-400" /></div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Bridge Operacional</h3>
                                        <p className="text-slate-500 mb-6">O servidor local de automação está respondendo corretamente.</p>
                                        <button onClick={() => checkBridgeStatus().then(setBridgeStatus)} className="bg-slate-900 text-white px-8 py-2 rounded-lg font-bold">Testar Novamente</button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6"><WifiOff size={40} className="text-red-600 dark:text-red-400" /></div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Bridge Desconectado</h3>
                                        <p className="text-slate-500 mb-8 max-w-sm">Certifique-se que o processo <code>npm run start</code> está rodando na pasta <code>server/</code> e o proxy está ativo.</p>
                                        <button onClick={() => checkBridgeStatus().then(setBridgeStatus)} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black shadow-lg">Tentar Reconexão</button>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"><div><p className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</p><p className="font-bold dark:text-white">Offline</p></div><Smartphone size={24} className="text-slate-300"/></div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"><div><p className="text-[10px] font-bold text-slate-400 uppercase">SMTP Relay</p><p className="font-bold dark:text-white">Pronto</p></div><Mail size={24} className="text-slate-300"/></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <SectionTitle title="Nuvem Supabase" subtitle="Conecte seu frontend ao backend oficial." />
                        <form onSubmit={async (e) => { e.preventDefault(); setConnectionStatus('testing'); const result = await testSupabaseConnection(); setConnectionStatus(result.success ? 'success' : 'error'); if(result.success) setTimeout(() => window.location.reload(), 1500); }} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6">
                            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Project URL</label><input required type="url" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} placeholder="https://xyz.supabase.co" /></div>
                            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">API Key (Anon/Public)</label><input required type="password" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} /></div>
                            <button disabled={connectionStatus === 'testing'} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition transform active:scale-[0.98]">{connectionStatus === 'testing' ? <Loader2 className="animate-spin" size={20}/> : <><RefreshCw size={20}/> Salvar e Conectar</>}</button>
                        </form>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Trilha de Auditoria" subtitle="Histórico completo de ações realizadas no sistema." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[600px] flex flex-col">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-white">Registros Recentes</h4><button className="text-blue-600 text-xs font-bold flex items-center gap-1"><FileText size={14}/> Baixar CSV</button></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-100 dark:border-slate-700"><tr><th className="p-4">Data/Hora</th><th className="p-4">Usuário</th><th className="p-4">Ação</th><th className="p-4">Módulo</th><th className="p-4">Detalhes</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {displayLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="p-4 text-xs font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">{log.userName}</td>
                                                <td className="p-4"><Badge color="blue">{log.action}</Badge></td>
                                                <td className="p-4 text-xs font-bold text-slate-500">{log.module}</td>
                                                <td className="p-4 text-xs text-slate-600 dark:text-slate-400 italic">{log.details}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="space-y-6 animate-fade-in">
                        <SectionTitle title="Diagnóstico de Banco de Dados" subtitle="Auditoria de volumetria entre cache local e nuvem." />
                        
                        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl overflow-hidden mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                        <Terminal size={18} className="text-white"/>
                                    </div>
                                    Supabase Initial Schema (SQL)
                                </h3>
                                <button onClick={copySchema} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg transition flex items-center gap-2"><Copy size={14}/> COPIAR SCRIPT SQL</button>
                            </div>
                            <p className="text-slate-400 text-[10px] mb-4 uppercase font-bold tracking-widest">Utilize o script abaixo para inicializar todas as tabelas e políticas RLS no Supabase SQL Editor.</p>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-[10px] text-blue-300 max-h-48 overflow-y-auto custom-scrollbar border border-white/5 whitespace-pre scroll-smooth">{getSupabaseSchema()}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { k: 'leads', icon: Users, color: 'blue', label: 'Leads' },
                                { k: 'clients', icon: Building2, color: 'indigo', label: 'Clientes' },
                                { k: 'tickets', icon: MessageSquare, color: 'orange', label: 'Chamados' },
                                { k: 'invoices', icon: DollarSign, color: 'emerald', label: 'Faturas' },
                                { k: 'projects', icon: Wrench, color: 'purple', label: 'Projetos' },
                                { k: 'proposals', icon: FileText, color: 'amber', label: 'Propostas' },
                                { k: 'products', icon: Package, color: 'pink', label: 'SKUs' },
                                { k: 'issues', icon: Code, color: 'slate', label: 'Issues Dev' }
                            ].map(item => (
                                <div key={item.k} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400`}><item.icon size={20}/></div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div><p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Nuvem</p><p className="text-2xl font-black text-slate-900 dark:text-white">{loadingCounts ? '...' : (cloudCounts[item.k] || 0)}</p></div>
                                        <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Local</p><p className="text-lg font-bold text-slate-400">{(window as any).localStorage.getItem(`nexus_${item.k}`) ? JSON.parse((window as any).localStorage.getItem(`nexus_${item.k}`)).length : 0}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-2xl flex items-center justify-between">
                            <div className="flex gap-4"><AlertTriangle size={32} className="text-red-500"/><div className="text-red-700 dark:text-red-300"><h4 className="font-bold">Ações Críticas</h4><p className="text-xs">O Hard Reset forçará a limpeza total do cache local e recarregará a aplicação.</p></div></div>
                            <button onClick={handleHardReset} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-md">Executar Hard Reset</button>
                        </div>
                    </div>
                )}
            </main>

            {/* MODALS */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-900">Novo Membro</h3><button onClick={() => setIsTeamModalOpen(false)}><X className="text-slate-400"/></button></div>
                        <form onSubmit={(e) => { e.preventDefault(); addTeamMember(newMember.name, newMember.email, newMember.role); setIsTeamModalOpen(false); }} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo</label><input required className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label><input required type="email" className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Perfil de Acesso</label><select className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as Role})}>{Object.entries(ROLE_NAMES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg shadow-lg">Criar Acesso</button>
                        </form>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-900">Novo Produto</h3><button onClick={() => setIsProductModalOpen(false)}><X className="text-slate-400"/></button></div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Item</label><input required className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label><select className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}><option value="Subscription">Recorrência</option><option value="Service">Serviço Único</option><option value="Product">Hardware/Físico</option></select></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço de Tabela</label><input required type="number" className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label><textarea className="w-full border rounded-lg p-2 dark:bg-slate-700 dark:text-white resize-none h-20" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} /></div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">Adicionar ao Catálogo</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};