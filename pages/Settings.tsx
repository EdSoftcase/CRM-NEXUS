
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { 
    UserCircle, Shield, Activity, Trash2, Plus, Package, X, Save, 
    Database, Building2, Users, 
    AlertTriangle, List,
    RefreshCw, Loader2, ListChecks,
    CreditCard, Power, Info, LayoutGrid,
    PieChart as PieIcon, Wallet, Server, Terminal, Copy, Zap, Settings2, Globe, CheckCircle, TrendingUp, DollarSign, MessageSquare, QrCode
} from 'lucide-react';
import { SectionTitle, Badge, KPICard } from '../components/Widgets';
import { Role, Product, PermissionAction, CustomFieldDefinition, WebhookConfig, TriggerType, FinancialCategory, Organization, User } from '../types';
import { getSupabaseConfig, testSupabaseConnection, getSupabase, getSupabaseSchema, saveSupabaseConfig } from '../services/supabaseClient';
import { checkBridgeStatus } from '../services/bridgeService';
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

const TRIGGER_LABELS: Record<string, string> = {
    lead_created: 'Novo Lead Criado',
    deal_won: 'Negócio Ganho',
    deal_lost: 'Negócio Perdido',
    ticket_created: 'Ticket Aberto',
    client_churn_risk: 'Risco de Churn Detectado',
    project_stagnated: 'Projeto Estagnado'
};

const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com', 'superadmin@nexus.com'];

export const Settings: React.FC = () => {
    const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, permissionMatrix, updatePermission, approveOrganization } = useAuth();
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

    const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'team' | 'permissions' | 'products' | 'financial' | 'custom_fields' | 'webhooks' | 'integrations' | 'bridge' | 'audit' | 'database' | 'saas'>('profile');
    
    // Forms State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar: '' });
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('sales');
    const [cloudCounts, setCloudCounts] = useState<Record<string, number>>({});
    const [loadingCounts, setLoadingCounts] = useState(false);
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    
    // Bridge States
    const [bridgeStatus, setBridgeStatus] = useState({ server: 'OFFLINE', whatsapp: 'OFFLINE', iugu: 'PENDING' });
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [loadingQR, setLoadingQR] = useState(false);

    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);

    // Modals State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [isFinModalOpen, setIsFinModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    // New Item Forms
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0 });
    const [newField, setNewField] = useState<Partial<CustomFieldDefinition>>({ type: 'text', module: 'leads', required: false });
    const [newWebhook, setNewWebhook] = useState<Partial<WebhookConfig>>({ active: true, method: 'POST', triggerEvent: 'lead_created' });
    const [newFinCat, setNewFinCat] = useState<Partial<FinancialCategory>>({ type: 'Revenue' });
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });

    useEffect(() => {
        if (currentUser) setProfileForm({ name: currentUser.name || '', email: currentUser.email || '', avatar: currentUser.avatar || '' });
    }, [currentUser]);

    useEffect(() => {
        if (activeTab === 'database') fetchCloudCounts();
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
        }
        if (activeTab === 'bridge') checkBridgeStatus().then(setBridgeStatus);
        if (activeTab === 'saas') fetchOrganizations();
    }, [activeTab]);

    const handleShowWhatsAppQR = async () => {
        setLoadingQR(true);
        setIsQRModalOpen(true);
        try {
            // Tenta buscar o QR Code do servidor local (Nexus Bridge)
            const response = await fetch('http://127.0.0.1:3001/whatsapp/qr');
            const data = await response.json();
            if (data.qr) {
                setQrCode(data.qr);
            } else {
                setQrCode(null);
            }
        } catch (e) {
            console.error("Erro ao buscar QR Code. Verifique se o Bridge está rodando.");
            setQrCode(null);
        } finally {
            setLoadingQR(false);
        }
    };

    // Data for Finance Charts
    const chartData = useMemo(() => {
        const expenses = financialCategories.filter(c => c.type === 'Expense');
        const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        
        const pie = expenses.map((c, i) => ({
            name: c.name,
            value: c.budget || 1000,
            fill: COLORS[i % COLORS.length]
        }));

        const bar = financialCategories.slice(0, 8).map(c => ({
            name: c.name.split(' ')[0],
            Orçado: c.budget || 0,
            Realizado: (c.budget || 0) * (0.7 + Math.random() * 0.4) 
        }));

        return { pie, bar };
    }, [financialCategories]);

    const financialStats = useMemo(() => {
        const totalBudget = financialCategories.reduce((acc, c) => acc + (c.budget || 0), 0);
        const revenue = financialCategories.filter(c => c.type === 'Revenue').reduce((acc, c) => acc + (c.budget || 0), 0);
        const expenses = financialCategories.filter(c => c.type === 'Expense').reduce((acc, c) => acc + (c.budget || 0), 0);
        return { totalBudget, revenue, expenses };
    }, [financialCategories]);

    const fetchOrganizations = async () => {
        setLoadingOrgs(true);
        const supabase = getSupabase();
        if (!supabase) { setOrgs(MOCK_ORGANIZATIONS); setLoadingOrgs(false); return; }
        try {
            const { data } = await supabase.from('organizations').select('*');
            if (data) setOrgs(data);
        } catch (e) { console.error(e); } finally { setLoadingOrgs(false); }
    };

    const fetchCloudCounts = async () => {
        setLoadingCounts(true);
        const supabase = getSupabase();
        if (!supabase) { setLoadingCounts(false); return; }
        try {
            const tables = ['leads', 'clients', 'tickets', 'invoices'];
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

    const handleSaveField = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newField.label || !newField.key) return;
        addCustomField({
            id: `field-${Date.now()}`,
            label: newField.label,
            key: newField.key,
            type: newField.type as any,
            module: newField.module as any,
            required: !!newField.required,
            organizationId: currentOrganization?.id
        });
        setIsFieldModalOpen(false);
        setNewField({ type: 'text', module: 'leads', required: false });
    };

    const handleSaveFinCat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFinCat.name || !newFinCat.code) return;
        addFinancialCategory({
            id: `cat-${Date.now()}`,
            name: newFinCat.name,
            code: newFinCat.code,
            type: newFinCat.type as any,
            description: newFinCat.description,
            budget: Number(newFinCat.budget) || 0,
            organizationId: currentOrganization?.id
        });
        setIsFinModalOpen(false);
        setNewFinCat({ type: 'Revenue' });
    };

    const handleSaveWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWebhook.name || !newWebhook.url) return;
        addWebhook({
            id: `wh-${Date.now()}`,
            name: newWebhook.name,
            url: newWebhook.url,
            triggerEvent: newWebhook.triggerEvent as any,
            method: newWebhook.method as any,
            active: true,
            organizationId: currentOrganization?.id
        });
        setIsWebhookModalOpen(false);
        setNewWebhook({ active: true, method: 'POST', triggerEvent: 'lead_created' });
    };

    const handleSaveProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.price) return;
        addProduct(currentUser, {
            id: `prod-${Date.now()}`,
            name: newProduct.name,
            description: newProduct.description || '',
            price: Number(newProduct.price),
            sku: newProduct.sku || '',
            category: newProduct.category as any,
            active: true,
            organizationId: currentOrganization?.id
        });
        setIsProductModalOpen(false);
        setNewProduct({ active: true, category: 'Subscription', price: 0 });
    };

    const handleAddTeamMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await addTeamMember(newMember.name, newMember.email, newMember.role);
        if (res.success) {
            addSystemNotification("Equipe", "Membro convidado com sucesso.", "success");
            setIsTeamModalOpen(false);
            setNewMember({ name: '', email: '', role: 'sales' });
        }
    };

    const handleSaveCloudConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConnectionStatus('testing');
        saveSupabaseConfig(supabaseForm.url, supabaseForm.key);
        const res = await testSupabaseConnection();
        setConnectionStatus(res.success ? 'success' : 'error');
        if (res.success) addSystemNotification("Cloud", "Conexão com Supabase estabelecida.", "success");
    };

    const copySchema = () => {
        navigator.clipboard.writeText(getSupabaseSchema());
        alert("Schema SQL copiado!");
    };

    const menuItems = [
        { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
        { id: 'organization', label: 'Empresa', icon: Building2 },
        { id: 'team', label: 'Equipe', icon: Users },
        { id: 'permissions', label: 'Permissões', icon: Shield },
        { id: 'products', label: 'Produtos/Serviços', icon: Package },
        { id: 'financial', label: 'Dashboard Financeiro', icon: Wallet },
        { id: 'custom_fields', label: 'Campos Extras', icon: ListChecks },
        { id: 'webhooks', label: 'Webhooks & API', icon: Globe },
        { id: 'integrations', label: 'Cloud Supabase', icon: Database }, 
        { id: 'bridge', label: 'Nexus Bridge', icon: Server }, 
        { id: 'audit', label: 'Auditoria', icon: List },
        { id: 'database', label: 'Status BD', icon: Activity },
        { id: 'saas', label: 'Master SaaS', icon: LayoutGrid, hidden: !isSuperAdmin },
    ];

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-full">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Configurações</h1>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {menuItems.filter(i => !i.hidden).map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {activeTab === 'profile' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Meu Perfil" subtitle="Gerencie seus dados pessoais e de acesso." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 p-8 shadow-sm">
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                <div className="flex items-center gap-6 pb-6 border-b">
                                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                        {profileForm.name.charAt(0)}
                                    </div>
                                    <button type="button" className="text-sm font-bold text-blue-600 hover:underline">Trocar foto</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input disabled={!isEditingProfile} className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label><input disabled className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400" value={profileForm.email} /></div>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">{isEditingProfile ? 'Cancelar' : 'Editar Perfil'}</button>
                                    {isEditingProfile && <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Salvar Alterações</button>}
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'organization' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Dados da Empresa" subtitle="Informações da sua organização para faturamento e portal." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 p-8 shadow-sm">
                            <div className="space-y-6">
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social</label><input className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white" defaultValue={currentOrganization?.name} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Slug (Identificador Único)</label><input disabled className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 font-mono" value={currentOrganization?.slug} /></div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 flex justify-between items-center">
                                    <div><p className="text-sm font-bold text-blue-900 dark:text-blue-200">Plano Atual: {currentOrganization?.plan}</p><p className="text-xs text-blue-700 dark:text-blue-300">Expira em: {currentOrganization?.licenseExpiresAt ? new Date(currentOrganization.licenseExpiresAt).toLocaleDateString() : 'N/A'}</p></div>
                                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Upgrade</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Gestão de Equipe" subtitle="Controle quem acessa o sistema e seus níveis de permissão." />
                            <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> Convidar Usuário</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Usuário</th><th className="p-4">Cargo</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {usersList.filter(u => u.role !== 'client').map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-xs">{user.avatar}</div>
                                                    <div><p className="font-bold text-slate-800 dark:text-white">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div>
                                                </div>
                                            </td>
                                            <td className="p-4"><Badge color="blue">{ROLE_NAMES[user.role]}</Badge></td>
                                            <td className="p-4"><Badge color={user.active ? 'green' : 'gray'}>{user.active ? 'Ativo' : 'Inativo'}</Badge></td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => adminDeleteUser(user.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
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
                        <SectionTitle title="Matriz de Permissões" subtitle="Defina o que cada cargo pode visualizar ou editar no sistema." />
                        <div className="flex gap-2 mb-6 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
                            {Object.entries(ROLE_NAMES).filter(([r]) => r !== 'client').map(([role, label]) => (
                                <button key={role} onClick={() => setSelectedRoleForPerms(role as Role)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${selectedRoleForPerms === role ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{label}</button>
                            ))}
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Módulo</th><th className="p-4 text-center">Ver</th><th className="p-4 text-center">Criar</th><th className="p-4 text-center">Editar</th><th className="p-4 text-center">Excluir</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {Object.keys(permissionMatrix[selectedRoleForPerms]).map(module => (
                                        <tr key={module} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                            <td className="p-4 font-bold capitalize text-slate-800 dark:text-white">{module.replace('-', ' ')}</td>
                                            {['view', 'create', 'edit', 'delete'].map(action => (
                                                <td key={action} className="p-4 text-center">
                                                    <input type="checkbox" checked={permissionMatrix[selectedRoleForPerms][module][action as PermissionAction]} onChange={(e) => updatePermission(selectedRoleForPerms, module, action as PermissionAction, e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Produtos & Serviços" subtitle="Itens disponíveis para propostas e faturamento." />
                            <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> Novo Produto</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map(prod => (
                                <div key={prod.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-blue-400 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge color="purple">{prod.category}</Badge>
                                        <button onClick={() => removeProduct(currentUser, prod.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{prod.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 h-8">{prod.description}</p>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-lg font-bold text-indigo-600">R$ {prod.price.toLocaleString()}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{prod.sku}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Dashboard Financeiro & Plano de Contas" subtitle="Visão executiva do orçamento e categorias DRE." />
                            <button onClick={() => setIsFinModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition">
                                <Plus size={18}/> Nova Categoria
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <KPICard title="Orçamento Total" value={`R$ ${financialStats.totalBudget.toLocaleString()}`} icon={Wallet} color="bg-blue-500" trend="Snapshot Planejado" />
                            <KPICard title="Receita Prevista" value={`R$ ${financialStats.revenue.toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500" trend="Entradas" trendUp={true} />
                            <KPICard title="Despesas Totais" value={`R$ ${financialStats.expenses.toLocaleString()}`} icon={DollarSign} color="bg-red-500" trend="Saídas" trendUp={false} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[350px] flex flex-col">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><PieIcon size={18} className="text-blue-500"/> Distribuição de Despesas</h3>
                                <div className="flex-1 w-full min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={chartData.pie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {chartData.pie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[350px] flex flex-col">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> Budget vs Realizado</h3>
                                <div className="flex-1 w-full min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.bar}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} />
                                            <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} />
                                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                            <Legend />
                                            <Bar dataKey="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-700 dark:text-white text-sm">Categorias do Plano de Contas</h3>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Código</th><th className="p-4">Nome da Categoria</th><th className="p-4">Tipo</th><th className="p-4 text-right">Budget (R$)</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {financialCategories.map(cat => (
                                        <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                            <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{cat.code}</td>
                                            <td className="p-4"><p className="font-bold text-slate-800 dark:text-white">{cat.name}</p><p className="text-xs text-slate-500">{cat.description}</p></td>
                                            <td className="p-4"><Badge color={cat.type === 'Revenue' ? 'green' : 'red'}>{cat.type === 'Revenue' ? 'Receita' : 'Despesa'}</Badge></td>
                                            <td className="p-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">R$ {cat.budget?.toLocaleString() || '0'}</td>
                                            <td className="p-4 text-right"><button onClick={() => deleteFinancialCategory(cat.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campos Personalizados" subtitle="Adicione campos extras aos módulos de Leads e Clientes." />
                            <button onClick={() => setIsFieldModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={18}/> Novo Campo</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['leads', 'clients'].map(mod => (
                                <div key={mod} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                    <h3 className="font-bold capitalize mb-4 flex items-center gap-2 text-slate-800 dark:text-white">{mod}</h3>
                                    <div className="space-y-2">
                                        {customFields.filter(f => f.module === mod).map(field => (
                                            <div key={field.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                                <div><p className="text-sm font-bold text-slate-800 dark:text-white">{field.label}</p><p className="text-[10px] text-slate-500 font-mono">{field.key} | {field.type}</p></div>
                                                <button onClick={() => deleteCustomField(field.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Webhooks & API" subtitle="Envie dados para outros sistemas em tempo real." />
                            <button onClick={() => setIsWebhookModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={18}/> Novo Webhook</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Nome / URL</th><th className="p-4">Evento</th><th className="p-4">Método</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {webhooks.map(wh => (
                                        <tr key={wh.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                            <td className="p-4"><p className="font-bold text-slate-800 dark:text-white">{wh.name}</p><p className="text-xs text-blue-600 truncate max-w-xs">{wh.url}</p></td>
                                            <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{wh.triggerEvent}</td>
                                            <td className="p-4 font-mono font-bold text-orange-600">{wh.method}</td>
                                            <td className="p-4 text-right"><button onClick={() => deleteWebhook(wh.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Supabase Cloud Config" subtitle="Conecte seu frontend a um projeto Supabase real." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 p-8 shadow-sm">
                            <form onSubmit={handleSaveCloudConfig} className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Project URL</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} placeholder="https://xyz.supabase.co" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">API Key (Anon Public)</label><input required type="password" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} placeholder="eyJ..." /></div>
                                <div className="flex items-center gap-4">
                                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">Salvar e Conectar</button>
                                    {connectionStatus === 'testing' && <Loader2 className="animate-spin text-indigo-600" />}
                                    {connectionStatus === 'success' && <div className="flex items-center gap-1 text-green-600 font-bold text-sm"><CheckCircle size={16}/> Sucesso!</div>}
                                    {connectionStatus === 'error' && <div className="flex items-center gap-1 text-red-600 font-bold text-sm"><AlertTriangle size={16}/> Falha na Conexão</div>}
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Nexus Bridge Server" subtitle="Status do servidor local de automação de WhatsApp e E-mail." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-slate-800 dark:text-white">Servidor Local</h4><div className={`w-3 h-3 rounded-full ${bridgeStatus.server === 'ONLINE' ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`}></div></div>
                                <p className="text-sm text-slate-500">Status: {bridgeStatus.server}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">Direct: 127.0.0.1:3001</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-slate-800 dark:text-white">WhatsApp VoIP</h4><div className={`w-3 h-3 rounded-full ${bridgeStatus.whatsapp === 'ONLINE' ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`}></div></div>
                                <p className="text-sm text-slate-500">Sessão: {bridgeStatus.whatsapp}</p>
                                <button onClick={handleShowWhatsAppQR} className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><QrCode size={12}/> Ver QR Code</button>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-slate-800 dark:text-white">Financeiro Iugu</h4><div className={`w-3 h-3 rounded-full ${bridgeStatus.iugu === 'CONFIGURED' ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-yellow-500'}`}></div></div>
                                <p className="text-sm text-slate-500">API: {bridgeStatus.iugu}</p>
                                <button className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Configurar Token</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Logs de Auditoria" subtitle="Rastro completo de ações executadas pelos usuários." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Timestamp</th><th className="p-4">Usuário</th><th className="p-4">Ação</th><th className="p-4">Módulo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {displayLogs.slice(0, 50).map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                            <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{log.userName}</td>
                                            <td className="p-4"><p className="font-medium text-slate-700 dark:text-slate-300">{log.action}</p><p className="text-[10px] text-slate-400">{log.details}</p></td>
                                            <td className="p-4"><Badge>{log.module}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Status do Banco de Dados" subtitle="Estatísticas de armazenamento e volume de dados." />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {Object.entries(cloudCounts).map(([table, count]) => (
                                <div key={table} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">{table}</h4>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{count}</p>
                                    <p className="text-[10px] text-slate-400 mt-2">Registros em nuvem</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Terminal size={20} className="text-emerald-500"/> Script de Inicialização (SQL)</h3>
                            <p className="text-slate-400 text-sm mb-6">Se você acabou de conectar um novo projeto Supabase, execute este script no SQL Editor para criar as tabelas necessárias.</p>
                            <button onClick={copySchema} className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all"><Copy size={18}/> Copiar SQL Schema</button>
                        </div>
                    </div>
                )}

                {activeTab === 'saas' && isSuperAdmin && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Master Admin - SaaS" subtitle="Painel exclusivo para controle de organizações e licenças." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Empresa</th><th className="p-4">Plano</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {orgs.map(org => (
                                        <tr key={org.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{org.name}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-400">{org.plan}</td>
                                            <td className="p-4"><Badge color={org.status === 'active' ? 'green' : 'yellow'}>{org.status}</Badge></td>
                                            <td className="p-4 text-right">
                                                {org.status === 'pending' && <button onClick={() => approveOrganization(org.id)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Aprovar</button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>

            {/* MODAL WHATSAPP QR */}
            {isQRModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageSquare className="text-green-500"/> Conectar WhatsApp</h3>
                            <button onClick={() => setIsQRModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={20}/></button>
                        </div>
                        <div className="p-8 flex flex-col items-center text-center">
                            {loadingQR ? (
                                <div className="py-12"><Loader2 className="animate-spin text-blue-600" size={48}/> <p className="text-sm text-slate-500 mt-4">Gerando código...</p></div>
                            ) : qrCode ? (
                                <>
                                    <div className="bg-white p-4 rounded-2xl shadow-inner mb-6 border border-slate-100">
                                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">Abra o WhatsApp no seu celular e escaneie o código para ativar o VoIP.</p>
                                </>
                            ) : (
                                <div className="py-8">
                                    <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48}/>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">QR Code não disponível.</p>
                                    <p className="text-xs text-slate-500 mt-1 px-4">Certifique-se que o Nexus Bridge Server está rodando localmente ou se o WhatsApp já está conectado.</p>
                                </div>
                            )}
                            <button onClick={handleShowWhatsAppQR} className="mt-4 px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition">Atualizar QR Code</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAIS GERAIS (MANTIDOS) */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Convidar Membro</h3><button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={20}/></button></div>
                        <form onSubmit={handleAddTeamMember} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">E-mail</label><input required type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Cargo</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as any})}>
                                {Object.entries(ROLE_NAMES).filter(([r]) => r !== 'client').map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                            </select></div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-md transition transform active:scale-95">Enviar Convite</button>
                        </form>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Novo Produto/Serviço</h3><button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={20}/></button></div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Preço (R$)</label><input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Categoria</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}><option value="Subscription">Recorrente</option><option value="Service">Serviço Único</option><option value="Product">Equipamento</option></select></div>
                            </div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Salvar Produto</button>
                        </form>
                    </div>
                </div>
            )}

            {isFieldModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Novo Campo Personalizado</h3><button onClick={() => setIsFieldModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={20}/></button></div>
                        <form onSubmit={handleSaveField} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Rótulo</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Placa do Carro" value={newField.label || ''} onChange={e => setNewField({...newField, label: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Key (ID Único)</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="ex: car_plate" value={newField.key || ''} onChange={e => setNewField({...newField, key: e.target.value.replace(/\s+/g, '_').toLowerCase()})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}><option value="text">Texto</option><option value="number">Número</option><option value="date">Data</option></select></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Módulo</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newField.module} onChange={e => setNewField({...newField, module: e.target.value as any})}><option value="leads">Leads</option><option value="clients">Clientes</option></select></div>
                            </div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg">Adicionar Campo</button>
                        </form>
                    </div>
                </div>
            )}

            {isFinModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Nova Categoria Financeira</h3><button onClick={() => setIsFinModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={20}/></button></div>
                        <form onSubmit={handleSaveFinCat} className="p-6 space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1"><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Código</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="1.01" value={newFinCat.code || ''} onChange={e => setNewFinCat({...newFinCat, code: e.target.value})} /></div>
                                <div className="col-span-3"><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newFinCat.name || ''} onChange={e => setNewFinCat({...newFinCat, name: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newFinCat.type} onChange={e => setNewFinCat({...newFinCat, type: e.target.value as any})}><option value="Revenue">Receita (+)</option><option value="Expense">Despesa (-)</option></select></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Budget (R$)</label><input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newFinCat.budget || ''} onChange={e => setNewFinCat({...newFinCat, budget: Number(e.target.value)})} /></div>
                            </div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Salvar Categoria</button>
                        </form>
                    </div>
                </div>
            )}

            {isWebhookModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Novo Webhook</h3><button onClick={() => setIsWebhookModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={20}/></button></div>
                        <form onSubmit={handleSaveWebhook} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome da Integração</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Envio para Zapier" value={newWebhook.name || ''} onChange={e => setNewWebhook({...newWebhook, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">URL de Destino</label><input required type="url" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" value={newWebhook.url || ''} onChange={e => setNewWebhook({...newWebhook, url: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Gatilho (Trigger)</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none text-sm" value={newWebhook.triggerEvent} onChange={e => setNewWebhook({...newWebhook, triggerEvent: e.target.value as any})}>{Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg">Ativar Webhook</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
