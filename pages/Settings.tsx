
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { 
    // Fix: Added AlertCircle to imports
    UserCircle, Shield, Activity, Trash2, Plus, Package, X, Save, 
    Database, Building2, Users, 
    AlertTriangle, AlertCircle, List,
    RefreshCw, Loader2, ListChecks,
    CreditCard, Power, Info, LayoutGrid,
    PieChart as PieIcon, Wallet, Server, Terminal, Copy, Zap, Settings2, Globe, CheckCircle, TrendingUp, DollarSign, MessageSquare, QrCode, Mail, UserPlus, Eye, Search, Layers, ToggleRight, Radio, Laptop
} from 'lucide-react';
import { SectionTitle, Badge, KPICard } from '../components/Widgets';
import { Role, Product, PermissionAction, CustomFieldDefinition, WebhookConfig, TriggerType, FinancialCategory, Organization, User } from '../types';
import { getSupabaseConfig, testSupabaseConnection, getSupabase, getSupabaseSchema, saveSupabaseConfig } from '../services/supabaseClient';
import { checkBridgeStatus, configureIugu } from '../services/bridgeService';

const ROLE_NAMES: Record<string, string> = {
    admin: 'Administrador',
    executive: 'Diretoria/Executivo',
    sales: 'Comercial (Sales)',
    support: 'Suporte (N1/N2)',
    dev: 'Desenvolvedor',
    finance: 'Financeiro',
    client: 'Cliente Externo (Portal)'
};

// Lista de e-mails com acesso Master SaaS
const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com', 'superadmin@nexus.com', 'admin@softcase.com.br'];

export const Settings: React.FC = () => {
    const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, permissionMatrix, updatePermission } = useAuth();
    const { 
        products, addProduct, removeProduct, 
        customFields, addCustomField, deleteCustomField, 
        webhooks, addWebhook, deleteWebhook, 
        addSystemNotification, logs: contextLogs,
        financialCategories,
        clients
    } = useData();
    
    const { data: auditLogs, isLoading: loadingLogs } = useAuditLogs();
    const displayLogs = auditLogs && auditLogs.length > 0 ? auditLogs : contextLogs;

    // Lógica Master SaaS
    const isSuperAdmin = useMemo(() => {
        return currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
    }, [currentUser]);

    const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'team' | 'permissions' | 'products' | 'financial' | 'custom_fields' | 'webhooks' | 'integrations' | 'bridge' | 'audit' | 'database' | 'saas'>('profile');
    
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar: '' });
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('sales');
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [bridgeForm, setBridgeForm] = useState({ url: 'http://127.0.0.1:3001', iuguToken: '', iuguAccountId: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [bridgeStatus, setBridgeStatus] = useState<any>(null);
    
    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0 });
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });

    useEffect(() => {
        if (currentUser) setProfileForm({ name: currentUser.name || '', email: currentUser.email || '', avatar: currentUser.avatar || '' });
    }, [currentUser]);

    // Carregar configurações do Bridge do localStorage ao entrar na aba
    useEffect(() => {
        if (activeTab === 'bridge') {
            const savedBridge = localStorage.getItem('nexus_bridge_config');
            if (savedBridge) {
                setBridgeForm(JSON.parse(savedBridge));
            }
            handleTestBridge();
        }
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
        }
    }, [activeTab]);

    const chartData = useMemo(() => {
        const expenses = financialCategories.filter(c => c.type === 'Expense');
        const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const pie = expenses.map((c, i) => ({ name: c.name, value: c.budget || 1000, fill: COLORS[i % COLORS.length] }));
        const bar = financialCategories.slice(0, 8).map(c => ({ name: c.name.split(' ')[0], Orçado: c.budget || 0, Realizado: (c.budget || 0) * (0.7 + Math.random() * 0.4) }));
        return { pie, bar };
    }, [financialCategories]);

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateUser({ name: profileForm.name });
        setIsEditingProfile(false);
        addSystemNotification("Sucesso", "Perfil atualizado.", "success");
    };

    const handleSaveCloudConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConnectionStatus('testing');
        saveSupabaseConfig(supabaseForm.url, supabaseForm.key);
        const res = await testSupabaseConnection();
        setConnectionStatus(res.success ? 'success' : 'error');
    };

    const handleSaveBridgeConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('nexus_bridge_config', JSON.stringify(bridgeForm));
        setConnectionStatus('testing');
        
        try {
            if (bridgeForm.iuguToken) {
                await configureIugu(bridgeForm.iuguToken, bridgeForm.iuguAccountId);
            }
            await handleTestBridge();
            setConnectionStatus('success');
            addSystemNotification("Sucesso", "Configurações do Bridge salvas.", "success");
        } catch (error) {
            setConnectionStatus('error');
        }
    };

    const handleTestBridge = async () => {
        const status = await checkBridgeStatus();
        setBridgeStatus(status);
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await addTeamMember(newMember.name, newMember.email, newMember.role);
        if (res.success) {
            setIsTeamModalOpen(false);
            setNewMember({ name: '', email: '', role: 'sales' });
            addSystemNotification("Membro Convidado", "Um novo membro foi adicionado à equipe.", "success");
        }
    };

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        const prod: Product = {
            id: `PRD-${Date.now()}`,
            name: newProduct.name || '',
            description: newProduct.description || '',
            price: Number(newProduct.price) || 0,
            sku: newProduct.sku || '',
            category: newProduct.category as any || 'Product',
            active: true
        };
        addProduct(currentUser, prod);
        setIsProductModalOpen(false);
        setNewProduct({ active: true, category: 'Subscription', price: 0 });
    };

    const menuItems = [
        { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
        { id: 'organization', label: 'Empresa', icon: Building2 },
        { id: 'team', label: 'Equipe', icon: Users },
        { id: 'permissions', label: 'Permissões', icon: Shield },
        { id: 'products', label: 'Catálogo', icon: Package },
        { id: 'financial', label: 'BI Financeiro', icon: Wallet },
        { id: 'custom_fields', label: 'Campos Custom', icon: ListChecks },
        { id: 'webhooks', label: 'Automações/Webhooks', icon: Zap },
        { id: 'bridge', label: 'Nexus Bridge', icon: Laptop }, 
        { id: 'integrations', label: 'Nuvem Supabase', icon: Database }, 
        { id: 'audit', label: 'Auditoria', icon: List },
        { id: 'database', label: 'Patch SQL', icon: Terminal },
        { id: 'saas', label: 'Master SaaS', icon: LayoutGrid, hidden: !isSuperAdmin },
    ];

    const modulesList = ['dashboard', 'commercial', 'clients', 'finance', 'support', 'dev', 'reports', 'settings', 'proposals', 'projects', 'marketing', 'automation', 'operations', 'inbox', 'prospecting'];

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-full">
                <div className="p-6 border-b"><h1 className="text-xl font-bold text-slate-900 dark:text-white">Configurações</h1></div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {menuItems.filter(i => !i.hidden).map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id as any)} 
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {activeTab === 'profile' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Meu Perfil" subtitle="Gerencie seus dados pessoais e de acesso." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input disabled={!isEditingProfile} className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label><input disabled className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700" value={profileForm.email} /></div>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">{isEditingProfile ? 'Cancelar' : 'Editar Perfil'}</button>
                                    {isEditingProfile && <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Salvar Alterações</button>}
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'organization' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Minha Organização" subtitle="Dados institucionais e branding." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Razão Social</label><p className="font-bold text-lg text-slate-900 dark:text-white">{currentOrganization?.name}</p></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID / Slug</label><p className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded inline-block text-slate-600 dark:text-slate-300">{currentOrganization?.slug}</p></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Plano Atual</label><Badge color="blue">{currentOrganization?.plan}</Badge></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status da Licença</label><Badge color="green">Ativa</Badge></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nexus Bridge" subtitle="Configuração do servidor local para WhatsApp e Pagamentos." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className={`p-4 rounded-xl border flex items-center gap-3 ${bridgeStatus?.server === 'ONLINE' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                <div className={`p-2 rounded-full ${bridgeStatus?.server === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'} text-white`}><Power size={16}/></div>
                                <div><p className="text-[10px] font-bold uppercase text-slate-500">Servidor</p><p className={`text-sm font-black ${bridgeStatus?.server === 'ONLINE' ? 'text-green-600' : 'text-red-600'}`}>{bridgeStatus?.server || 'OFFLINE'}</p></div>
                            </div>
                            <div className={`p-4 rounded-xl border flex items-center gap-3 ${bridgeStatus?.iugu === 'CONFIGURED' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-green-800' : 'bg-slate-50 border-slate-200'}`}>
                                <div className={`p-2 rounded-full ${bridgeStatus?.iugu === 'CONFIGURED' ? 'bg-blue-500' : 'bg-slate-400'} text-white`}><CreditCard size={16}/></div>
                                <div><p className="text-[10px] font-bold uppercase text-slate-500">Iugu API</p><p className="text-sm font-black">{bridgeStatus?.iugu === 'CONFIGURED' ? 'PRONTO' : 'PENDENTE'}</p></div>
                            </div>
                            <button onClick={handleTestBridge} className="bg-white dark:bg-slate-800 border rounded-xl flex flex-col items-center justify-center hover:bg-slate-50 transition p-2">
                                <RefreshCw size={20} className="text-slate-400 mb-1"/>
                                <span className="text-[10px] font-bold uppercase text-slate-500">Atualizar Status</span>
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                            <form onSubmit={handleSaveBridgeConfig} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Bridge Server URL</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3 text-slate-400" size={18}/>
                                        <input className="w-full border rounded-lg p-2.5 pl-10 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={bridgeForm.url} onChange={e => setBridgeForm({...bridgeForm, url: e.target.value})} placeholder="http://127.0.0.1:3001" />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Geralmente http://127.0.0.1:3001 para instalações locais.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Iugu API Token</label>
                                        <input type="password" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={bridgeForm.iuguToken} onChange={e => setBridgeForm({...bridgeForm, iuguToken: e.target.value})} placeholder="Live Token da Iugu" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Iugu Account ID</label>
                                        <input className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={bridgeForm.iuguAccountId} onChange={e => setBridgeForm({...bridgeForm, iuguAccountId: e.target.value})} placeholder="ID da Conta Iugu" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button type="submit" disabled={connectionStatus === 'testing'} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">
                                        {connectionStatus === 'testing' ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Configurações
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Equipe & Colaboradores" subtitle="Gerencie os usuários que acessam seu CRM." />
                            <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md"><UserPlus size={18}/> Novo Membro</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Nome</th><th className="p-4">E-mail</th><th className="p-4">Cargo / Role</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {usersList.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{user.name}</td>
                                            <td className="p-4 text-slate-500 dark:text-slate-400">{user.email}</td>
                                            <td className="p-4"><Badge color="blue">{ROLE_NAMES[user.role]}</Badge></td>
                                            <td className="p-4"><Badge color={user.active ? 'green' : 'red'}>{user.active ? 'Ativo' : 'Pendente'}</Badge></td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => adminDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
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
                        <SectionTitle title="Matriz de Permissões" subtitle="Controle o que cada cargo pode ver e fazer." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                                {Object.keys(ROLE_NAMES).map(role => (
                                    <button key={role} onClick={() => setSelectedRoleForPerms(role as Role)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${selectedRoleForPerms === role ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{ROLE_NAMES[role]}</button>
                                ))}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                        <tr><th className="p-3 text-left">Módulo</th><th className="p-3 text-center">Visualizar</th><th className="p-3 text-center">Criar</th><th className="p-3 text-center">Editar</th><th className="p-3 text-center">Excluir</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {modulesList.sort().map(mod => (
                                            <tr key={mod} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                                <td className="p-3 font-medium capitalize text-slate-700 dark:text-slate-300">{mod.replace('-', ' ')}</td>
                                                {['view', 'create', 'edit', 'delete'].map(action => (
                                                    <td key={action} className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={permissionMatrix[selectedRoleForPerms]?.[mod]?.[action as PermissionAction] || false}
                                                            onChange={(e) => updatePermission(selectedRoleForPerms, mod, action as PermissionAction, e.target.checked)}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
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
                            <SectionTitle title="Catálogo de Produtos & Serviços" subtitle="Itens disponíveis para propostas e contratos." />
                            <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md"><Plus size={18}/> Novo Item</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Item</th><th className="p-4">SKU</th><th className="p-4">Categoria</th><th className="p-4 text-right">Preço Sugerido</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {products.map(prod => (
                                        <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-800 dark:text-white">{prod.name}</p>
                                                <p className="text-xs text-slate-400">{prod.description}</p>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-slate-500">{prod.sku}</td>
                                            <td className="p-4"><Badge color={prod.category === 'Product' ? 'green' : 'blue'}>{prod.category}</Badge></td>
                                            <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-200">R$ {prod.price.toLocaleString()}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => removeProduct(currentUser, prod.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum item cadastrado no catálogo.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="animate-fade-in space-y-8">
                        <SectionTitle title="BI Financeiro" subtitle="Dashboard analítico de custos e receitas." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <KPICard title="Budget Orçado" value="R$ 150.000" icon={Wallet} color="bg-blue-500" />
                            <KPICard title="Custo Operacional" value="R$ 85.000" icon={TrendingUp} color="bg-red-500" trend="12% vs planejado" trendUp={false} />
                            <KPICard title="Margem Contrib." value="43%" icon={DollarSign} color="bg-emerald-500" trend="Alta" trendUp={true} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                                <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Gastos por Categoria</h3>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.pie} innerRadius={60} outerRadius={80} dataKey="value">{chartData.pie.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                                <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Orçado vs Realizado</h3>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.bar}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}}/><Tooltip /><Bar dataKey="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]}/><Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campos Personalizados" subtitle="Adicione campos extras aos formulários de leads e clientes." />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md"><Plus size={18}/> Novo Campo</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['leads', 'clients'].map(module => (
                                <div key={module} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 font-bold capitalize text-slate-800 dark:text-white">{module}</div>
                                    <div className="p-4 flex-1 space-y-2">
                                        {customFields.filter(f => f.module === module).map(field => (
                                            <div key={field.id} className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:border-blue-300 transition">
                                                <div><p className="font-bold text-sm text-slate-800 dark:text-white">{field.label}</p><p className="text-[10px] text-slate-400 uppercase font-mono">{field.type}</p></div>
                                                <button onClick={() => deleteCustomField(field.id)} className="text-slate-400 hover:text-red-500 transition"><X size={16}/></button>
                                            </div>
                                        ))}
                                        {customFields.filter(f => f.module === module).length === 0 && <p className="text-center py-8 text-slate-400 text-xs italic">Nenhum campo customizado.</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Webhooks de Sistema" subtitle="Conecte o Nexus com outras ferramentas via API." />
                            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition shadow-md"><Zap size={18}/> Criar Endpoint</button>
                        </div>
                        <div className="space-y-4">
                            {webhooks.map(wh => (
                                <div key={wh.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg text-indigo-600 dark:text-indigo-400"><Globe size={24}/></div>
                                        <div><h4 className="font-bold text-slate-800 dark:text-white">{wh.name}</h4><p className="text-xs font-mono text-slate-400 truncate max-w-md">{wh.url}</p></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge color="blue">{wh.triggerEvent}</Badge>
                                        <button onClick={() => deleteWebhook(wh.id)} className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                            {webhooks.length === 0 && <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-xl italic">Sem webhooks ativos.</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nuvem Supabase" subtitle="Configuração de sincronização e persistência oficial." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                            <form onSubmit={handleSaveCloudConfig} className="space-y-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Project URL</label><input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Anon Key</label><input required type="password" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} /></div>
                                
                                {connectionStatus === 'success' && <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm flex items-center gap-2"><CheckCircle size={16}/> Conectado com sucesso!</div>}
                                {connectionStatus === 'error' && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-center gap-2"><AlertTriangle size={16}/> Falha na conexão. Verifique os dados.</div>}

                                <button type="submit" disabled={connectionStatus === 'testing'} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                                    {connectionStatus === 'testing' ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Testar e Conectar
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Auditoria de Sistema" subtitle="Logs históricos de todas as ações importantes." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[600px] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10">
                                        <tr><th className="p-3">Timestamp</th><th className="p-3">Usuário</th><th className="p-3">Ação</th><th className="p-3">Módulo</th><th className="p-3">Detalhes</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {displayLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                                <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{log.userName}</td>
                                                <td className="p-3"><span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">{log.action}</span></td>
                                                <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">{log.module}</td>
                                                <td className="p-3 text-slate-400 truncate max-w-xs">{log.details}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Gestão de Esquema" subtitle="Manutenção avançada do banco de dados (Patch SQL)." />
                        <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Terminal size={20} className="text-emerald-500"/> SQL Schema v24.0 (Definitivo)</h3>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                Este script corrige recursões infinitas no RLS, adiciona colunas ausentes (como <code className="text-emerald-400">proposal_id</code>) 
                                e garante que as tabelas essenciais para o SOFT-CRM Enterprise estejam com a estrutura correta. 
                                <br/><br/>
                                <strong>Instruções:</strong> Copie o código abaixo e execute-o no Editor SQL do seu projeto Supabase.
                            </p>
                            <button onClick={() => { navigator.clipboard.writeText(getSupabaseSchema()); addSystemNotification("Copiado", "SQL Patch copiado para área de transferência.", "success"); }} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-all shadow-lg active:scale-95"><Copy size={18}/> Copiar SQL Patch</button>
                        </div>
                    </div>
                )}

                {activeTab === 'saas' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Painel Master SaaS" subtitle="Gestão global de todas as organizações e licenças." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <KPICard title="Total Empresas" value="1" icon={Building2} color="bg-indigo-600" />
                            <KPICard title="Total Usuários" value={usersList.length.toString()} icon={Users} color="bg-blue-600" />
                            <KPICard title="Licenças Ativas" value="1" icon={CheckCircle} color="bg-emerald-600" />
                            <KPICard title="Tickets Master" value="0" icon={AlertCircle} color="bg-red-600" />
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white">Organizações Registradas</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2 text-slate-400" size={14}/>
                                    <input className="pl-8 pr-4 py-1.5 border rounded-lg text-xs outline-none bg-white dark:bg-slate-800" placeholder="Buscar org..." />
                                </div>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] font-bold uppercase text-slate-400 border-b">
                                    <tr><th className="p-4">Empresa / ID</th><th className="p-4">Plano</th><th className="p-4">Expiração</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Master Actions</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="p-4">
                                            <p className="font-bold text-slate-900 dark:text-white">{currentOrganization?.name}</p>
                                            <p className="text-[10px] font-mono text-slate-400">ID: {currentOrganization?.id}</p>
                                        </td>
                                        <td className="p-4"><Badge color="purple">{currentOrganization?.plan}</Badge></td>
                                        <td className="p-4 text-slate-500 font-mono text-xs">{currentOrganization?.licenseExpiresAt ? new Date(currentOrganization.licenseExpiresAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className="p-4 text-center"><Badge color="green">Active</Badge></td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="p-2 text-slate-400 hover:text-blue-600 transition" title="Editar Limites"><Settings2 size={16}/></button>
                                                <button className="p-2 text-slate-400 hover:text-amber-600 transition" title="Bloquear Acesso"><Power size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>

            {/* MODALS */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">Convidar Membro</h3>
                            <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
                        </div>
                        <form onSubmit={handleAddMember} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label><input required className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome completo" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Corporativo</label><input required type="email" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@suaempresa.com" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} /></div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo / Função</label>
                                <select className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as Role})}>
                                    {Object.entries(ROLE_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                                </select>
                            </div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg">Enviar Convite</button>
                        </form>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white">Novo Item no Catálogo</h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
                        </div>
                        <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Comercial</label><input required className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Licenciamento Mensal LPR" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label><textarea className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" placeholder="O que este item includes?" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço Sugerido (R$)</label><input required type="number" step="0.01" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU / Cód. Int.</label><input className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" placeholder="SOFT-XXXX" value={newProduct.sku || ''} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria Comercial</label>
                                <select className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}>
                                    <option value="Product">Equipamento (Venda)</option>
                                    <option value="Service">Serviço / Instalação</option>
                                    <option value="Subscription">Mensalidade / Recorrência</option>
                                </select>
                            </div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg">Cadastrar Item</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
