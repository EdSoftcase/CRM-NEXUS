
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
    AlertTriangle, AlertCircle, List,
    RefreshCw, Loader2, ListChecks,
    CreditCard, Power, Info, LayoutGrid,
    PieChart as PieIcon, Wallet, Server, Terminal, Copy, Zap, Settings2, Globe, CheckCircle, TrendingUp, DollarSign, MessageSquare, QrCode, Mail, UserPlus, Eye, Search, Layers, ToggleRight, Radio, Laptop, Phone, LogOut, Code
} from 'lucide-react';
import { SectionTitle, Badge, KPICard } from '../components/Widgets';
import { Role, Product, PermissionAction, CustomFieldDefinition, WebhookConfig, TriggerType, FinancialCategory, Organization, User } from '../types';
import { getSupabaseConfig, testSupabaseConnection, getSupabase, getSupabaseSchema, saveSupabaseConfig } from '../services/supabaseClient';
import { checkBridgeStatus, configureIugu, disconnectWhatsApp } from '../services/bridgeService';

const ROLE_NAMES: Record<string, string> = {
    admin: 'Administrador',
    executive: 'Diretoria/Executivo',
    sales: 'Comercial (Sales)',
    support: 'Suporte (N1/N2)',
    dev: 'Desenvolvedor',
    finance: 'Financeiro',
    client: 'Cliente Externo (Portal)'
};

const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com', 'superadmin@nexus.com', 'admin@softcase.com.br'];

export const Settings: React.FC = () => {
    const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, permissionMatrix, updatePermission } = useAuth();
    const { 
        products, addProduct, removeProduct, 
        customFields, addCustomField, deleteCustomField, 
        webhooks, addWebhook, deleteWebhook, 
        addSystemNotification, logs: contextLogs,
        financialCategories
    } = useData();
    
    const { data: auditLogs } = useAuditLogs();
    const displayLogs = auditLogs && auditLogs.length > 0 ? auditLogs : contextLogs;

    const isSuperAdmin = useMemo(() => {
        return currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
    }, [currentUser]);

    const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'team' | 'permissions' | 'products' | 'financial' | 'custom_fields' | 'webhooks' | 'integrations' | 'bridge' | 'audit' | 'database' | 'saas'>('profile');
    
    // Form States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar: '' });
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('sales');
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [bridgeForm, setBridgeForm] = useState({ url: 'http://127.0.0.1:3001', iuguToken: '', iuguAccountId: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [bridgeStatus, setBridgeStatus] = useState<any>(null);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    
    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0 });
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });

    useEffect(() => {
        if (currentUser) setProfileForm({ name: currentUser.name || '', email: currentUser.email || '', avatar: currentUser.avatar || '' });
    }, [currentUser]);

    // Bridge Status Monitoring
    useEffect(() => {
        let interval: number;
        if (activeTab === 'bridge') {
            const savedBridge = localStorage.getItem('nexus_bridge_config');
            if (savedBridge) setBridgeForm(JSON.parse(savedBridge));
            handleTestBridge();
            interval = window.setInterval(handleTestBridge, 5000);
        }
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
        }
        return () => clearInterval(interval);
    }, [activeTab]);

    const handleTestBridge = async () => {
        const status = await checkBridgeStatus();
        setBridgeStatus(status);
    };

    const handleDisconnectWA = async () => {
        if (!confirm("Isso desconectará o WhatsApp atual. Você precisará escanear o QR Code novamente para trocar o número. Continuar?")) return;
        setIsDisconnecting(true);
        try {
            await disconnectWhatsApp();
            addSystemNotification("WhatsApp", "Sessão encerrada. Aguarde o novo QR Code.", "success");
            handleTestBridge();
        } catch (e) {
            addSystemNotification("Erro", "Falha ao desconectar.", "alert");
        } finally {
            setIsDisconnecting(false);
        }
    };

    const handleSaveBridgeConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('nexus_bridge_config', JSON.stringify(bridgeForm));
        setConnectionStatus('testing');
        try {
            if (bridgeForm.iuguToken) await configureIugu(bridgeForm.iuguToken, bridgeForm.iuguAccountId);
            await handleTestBridge();
            setConnectionStatus('success');
            addSystemNotification("Configuração", "Nexus Bridge atualizado.", "success");
        } catch (error) { setConnectionStatus('error'); }
    };

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateUser({ name: profileForm.name });
        setIsEditingProfile(false);
        addSystemNotification("Perfil", "Dados salvos.", "success");
    };

    const handleSaveCloudConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setConnectionStatus('testing');
        saveSupabaseConfig(supabaseForm.url, supabaseForm.key);
        const res = await testSupabaseConnection();
        setConnectionStatus(res.success ? 'success' : 'error');
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await addTeamMember(newMember.name, newMember.email, newMember.role);
        if (res.success) {
            setIsTeamModalOpen(false);
            setNewMember({ name: '', email: '', role: 'sales' });
            addSystemNotification("Equipe", "Novo membro convidado.", "success");
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

    const chartData = useMemo(() => {
        const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const expenses = financialCategories.filter(c => c.type === 'Expense');
        const pie = expenses.map((c, i) => ({ name: c.name, value: c.budget || 1000, fill: COLORS[i % COLORS.length] }));
        const bar = financialCategories.slice(0, 8).map(c => ({ 
            name: c.name.split(' ')[0], 
            Orçado: c.budget || 0, 
            Realizado: (c.budget || 0) * (0.8 + Math.random() * 0.4) 
        }));
        return { pie, bar };
    }, [financialCategories]);

    const menuItems = [
        { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
        { id: 'organization', label: 'Empresa', icon: Building2 },
        { id: 'team', label: 'Equipe', icon: Users },
        { id: 'permissions', label: 'Permissões', icon: Shield },
        { id: 'products', label: 'Catálogo', icon: Package },
        { id: 'financial', label: 'BI Financeiro', icon: Wallet },
        { id: 'custom_fields', label: 'Campos Custom', icon: ListChecks },
        { id: 'webhooks', label: 'Webhooks', icon: Zap },
        { id: 'bridge', label: 'Nexus Bridge', icon: Laptop }, 
        { id: 'integrations', label: 'Nuvem Supabase', icon: Database }, 
        { id: 'audit', label: 'Auditoria', icon: List },
        { id: 'database', label: 'Patch SQL', icon: Terminal },
        { id: 'saas', label: 'Master SaaS', icon: LayoutGrid, hidden: !isSuperAdmin },
    ];

    const modulesList = [
        'dashboard', 'commercial', 'clients', 'finance', 'support', 'dev', 'reports', 
        'settings', 'proposals', 'projects', 'marketing', 'automation', 'operations', 'inbox', 'prospecting'
    ];

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
                        <SectionTitle title="Meu Perfil" subtitle="Dados de acesso e informações pessoais." />
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
                        <SectionTitle title="Empresa" subtitle="Dados institucionais da organização." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm grid grid-cols-2 gap-8">
                            <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Razão Social</p><p className="font-bold text-lg text-slate-900 dark:text-white">{currentOrganization?.name}</p></div>
                            <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Identificador (Slug)</p><code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm text-slate-600 dark:text-slate-300">{currentOrganization?.slug}</code></div>
                            <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Plano Atual</p><Badge color="blue">{currentOrganization?.plan}</Badge></div>
                            <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">ID da Org</p><p className="text-slate-500 font-mono text-xs">{currentOrganization?.id}</p></div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Equipe & Colaboradores" subtitle="Gerencie os usuários que possuem acesso ao CRM." />
                            <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md"><UserPlus size={18}/> Novo Membro</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {usersList.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4"><p className="font-bold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                                            <td className="p-4"><Badge color="blue">{ROLE_NAMES[user.role]}</Badge></td>
                                            <td className="p-4"><Badge color={user.active ? 'green' : 'red'}>{user.active ? 'Ativo' : 'Pendente'}</Badge></td>
                                            <td className="p-4 text-right"><button onClick={() => adminDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Matriz de Permissões" subtitle="Controle o que cada cargo pode fazer no sistema." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-hidden">
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                                {Object.keys(ROLE_NAMES).map(role => (
                                    <button key={role} onClick={() => setSelectedRoleForPerms(role as Role)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${selectedRoleForPerms === role ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{ROLE_NAMES[role]}</button>
                                ))}
                            </div>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                        <tr><th className="p-3 text-left">Módulo</th><th className="p-3 text-center">Ver</th><th className="p-3 text-center">Criar</th><th className="p-3 text-center">Editar</th><th className="p-3 text-center">Excluir</th></tr>
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
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                            <SectionTitle title="Catálogo de Produtos & Serviços" subtitle="Itens disponíveis para orçamentos e propostas." />
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
                                            <td className="p-4"><p className="font-bold">{prod.name}</p><p className="text-xs text-slate-400">{prod.description}</p></td>
                                            <td className="p-4 font-mono text-xs">{prod.sku}</td>
                                            <td className="p-4"><Badge color={prod.category === 'Product' ? 'green' : 'blue'}>{prod.category}</Badge></td>
                                            <td className="p-4 text-right font-bold">R$ {prod.price.toLocaleString()}</td>
                                            <td className="p-4 text-right"><button onClick={() => removeProduct(currentUser, prod.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum item cadastrado.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="animate-fade-in space-y-8">
                        <SectionTitle title="BI Financeiro" subtitle="Gestão de fluxo de caixa e orçamentos operacionais." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <KPICard title="Budget Orçado" value="R$ 150.000" icon={Wallet} color="bg-blue-500" />
                            <KPICard title="Custo Realizado" value="R$ 82.400" icon={TrendingUp} color="bg-red-500" trend="12% vs planejado" trendUp={false} />
                            <KPICard title="Saldo Livre" value="R$ 67.600" icon={DollarSign} color="bg-emerald-500" trend="Em alta" trendUp={true} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
                                <h3 className="font-bold mb-4">Gastos por Categoria</h3>
                                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.pie} innerRadius={60} outerRadius={80} dataKey="value">{chartData.pie.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
                                <h3 className="font-bold mb-4">Orçado vs Realizado</h3>
                                <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.bar}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} /><Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campos Personalizados" subtitle="Adicione propriedades extras aos formulários do sistema." />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow-md"><Plus size={18}/> Novo Campo</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['leads', 'clients'].map(module => (
                                <div key={module} className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden flex flex-col min-h-[300px]">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b font-bold capitalize">{module}</div>
                                    <div className="p-4 flex-1 space-y-2">
                                        {customFields.filter(f => f.module === module).map(field => (
                                            <div key={field.id} className="flex justify-between items-center p-3 border rounded-lg hover:border-blue-300 transition group">
                                                <div><p className="font-bold text-sm">{field.label}</p><p className="text-[10px] uppercase text-slate-400 font-mono">{field.type}</p></div>
                                                <button onClick={() => deleteCustomField(field.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                        {customFields.filter(f => f.module === module).length === 0 && <div className="text-center py-12 text-slate-400 italic text-sm">Sem campos customizados.</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Webhooks de Sistema" subtitle="Integre o SOFT-CRM com outras ferramentas via API." />
                            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition shadow-md"><Zap size={18}/> Criar Endpoint</button>
                        </div>
                        <div className="space-y-4">
                            {webhooks.map(wh => (
                                <div key={wh.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg text-indigo-600"><Globe size={24}/></div>
                                        <div><h4 className="font-bold">{wh.name}</h4><p className="text-xs font-mono text-slate-400">{wh.url}</p></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge color="blue">{wh.triggerEvent}</Badge>
                                        <button onClick={() => deleteWebhook(wh.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                            {webhooks.length === 0 && <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-xl italic">Nenhum webhook ativo no momento.</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nexus Bridge" subtitle="Configuração do servidor local para WhatsApp e Gateway de Pagamento." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-5 rounded-2xl border flex items-center gap-4 ${bridgeStatus?.whatsapp === 'CONNECTED' ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : 'bg-slate-50 border-slate-200 dark:bg-slate-800'}`}>
                                <div className={`p-3 rounded-xl ${bridgeStatus?.whatsapp === 'CONNECTED' ? 'bg-green-500' : 'bg-slate-400'} text-white`}><Phone size={24}/></div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-slate-500">WhatsApp Status</p>
                                    <p className={`text-sm font-black ${bridgeStatus?.whatsapp === 'CONNECTED' ? 'text-green-600' : 'text-slate-400'}`}>{bridgeStatus?.whatsapp === 'CONNECTED' ? `ATIVO (${bridgeStatus.whatsapp_user})` : 'DESCONECTADO'}</p>
                                </div>
                                {bridgeStatus?.whatsapp === 'CONNECTED' && <button onClick={handleDisconnectWA} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Logout / Trocar Número"><LogOut size={20}/></button>}
                            </div>
                            <div className={`p-5 rounded-2xl border flex items-center gap-4 ${bridgeStatus?.iugu === 'CONFIGURED' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20' : 'bg-slate-50 border-slate-200 dark:bg-slate-800'}`}>
                                <div className={`p-3 rounded-xl ${bridgeStatus?.iugu === 'CONFIGURED' ? 'bg-blue-500' : 'bg-slate-400'} text-white`}><CreditCard size={24}/></div>
                                <div><p className="text-[10px] font-black uppercase text-slate-500">Checkout Iugu</p><p className="text-sm font-black">{bridgeStatus?.iugu === 'CONFIGURED' ? 'CONFIGURADO' : 'PENDENTE'}</p></div>
                            </div>
                        </div>
                        {bridgeStatus?.whatsapp === 'QR_READY' && (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-indigo-500 p-8 shadow-2xl text-center">
                                <QrCode className="mx-auto text-indigo-500 mb-4" size={48}/><h3 className="text-xl font-black">Conectar Novo Número</h3><p className="text-slate-500 text-sm mb-6">Escaneie o código abaixo para vincular o WhatsApp ao sistema.</p>
                                <div className="bg-white p-4 rounded-xl inline-block shadow-inner"><img src={bridgeStatus.qr_code} alt="QR Code" className="w-64 h-64" /></div>
                            </div>
                        )}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border p-8 shadow-sm">
                            <form onSubmit={handleSaveBridgeConfig} className="space-y-6">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Bridge Server URL</label><div className="relative"><Globe className="absolute left-3 top-3 text-slate-400" size={18}/><input className="w-full border rounded-lg p-2.5 pl-10 bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={bridgeForm.url} onChange={e => setBridgeForm({...bridgeForm, url: e.target.value})} placeholder="http://127.0.0.1:3001" /></div></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Iugu API Token</label><input type="password" placeholder="Live Token" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700" value={bridgeForm.iuguToken} onChange={e => setBridgeForm({...bridgeForm, iuguToken: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Iugu Account ID</label><input placeholder="Account ID" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700" value={bridgeForm.iuguAccountId} onChange={e => setBridgeForm({...bridgeForm, iuguAccountId: e.target.value})} /></div>
                                </div>
                                <button type="submit" disabled={connectionStatus === 'testing'} className="w-full bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg">{connectionStatus === 'testing' ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar e Testar Bridge</button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nuvem Supabase" subtitle="Configuração de sincronização e banco de dados remoto." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border p-8 shadow-sm">
                            <form onSubmit={handleSaveCloudConfig} className="space-y-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Project URL</label><input required className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-400 mb-1">Anon Key</label><input required type="password" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} /></div>
                                <button type="submit" disabled={connectionStatus === 'testing'} className="w-full bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">{connectionStatus === 'testing' ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>} Testar e Conectar Nuvem</button>
                                {connectionStatus === 'success' && <p className="text-green-600 text-xs font-bold text-center mt-2 flex items-center justify-center gap-1"><CheckCircle size={14}/> Sincronização Ativa!</p>}
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Auditoria de Sistema" subtitle="Registro histórico de todas as alterações." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden h-[500px] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold sticky top-0 border-b">
                                        <tr><th className="p-3">Data/Hora</th><th className="p-3">Usuário</th><th className="p-3">Módulo</th><th className="p-3">Ação</th><th className="p-3">Detalhes</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {displayLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="p-3 font-bold">{log.userName}</td>
                                                <td className="p-3"><Badge color="purple">{log.module}</Badge></td>
                                                <td className="p-3 font-medium text-blue-600">{log.action}</td>
                                                <td className="p-3 text-slate-500 truncate max-w-xs">{log.details}</td>
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
                        <SectionTitle title="Manutenção de Banco (SQL Patch)" subtitle="Aplicação de scripts definitivos para esquema e permissões." />
                        <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Terminal size={20} className="text-emerald-500"/> SQL Schema Enterprise v24.0</h3>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">Utilize o script abaixo para corrigir problemas de recursão RLS, colunas ausentes na tabela 'projects' (proposal_id) e garantir a estrutura de portfólio.</p>
                            <button onClick={() => { navigator.clipboard.writeText(getSupabaseSchema()); addSystemNotification("Copiado", "Script SQL copiado para transferência.", "success"); }} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition shadow-lg active:scale-95"><Copy size={18}/> Copiar SQL Patch</button>
                        </div>
                    </div>
                )}

                {activeTab === 'saas' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Painel Master SaaS" subtitle="Controle global de todas as organizações e licenças." />
                        <div className="grid grid-cols-4 gap-4">
                            <KPICard title="Empresas" value="1" icon={Building2} color="bg-indigo-600" />
                            <KPICard title="Usuários Ativos" value={usersList.length.toString()} icon={Users} color="bg-blue-600" />
                            <KPICard title="Contratos Master" value="1" icon={CheckCircle} color="bg-emerald-600" />
                            <KPICard title="Tickets Master" value="0" icon={AlertTriangle} color="bg-red-600" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden mt-8">
                            <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex justify-between items-center"><h3 className="font-bold">Organizações Registradas</h3></div>
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] font-bold uppercase text-slate-400 border-b">
                                    <tr><th className="p-4">Empresa / ID</th><th className="p-4">Plano</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="p-4"><p className="font-bold">{currentOrganization?.name}</p><p className="text-[10px] font-mono text-slate-400">ID: {currentOrganization?.id}</p></td>
                                        <td className="p-4"><Badge color="purple">{currentOrganization?.plan}</Badge></td>
                                        <td className="p-4 text-center"><Badge color="green">Active</Badge></td>
                                        <td className="p-4 text-right"><button className="p-2 text-slate-400 hover:text-blue-600 transition" title="Configurar Limites"><Settings2 size={16}/></button></td>
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
                        <div className="p-4 border-b flex justify-between bg-slate-50 dark:bg-slate-900"><h3 className="font-bold">Convidar Novo Membro</h3><button onClick={() => setIsTeamModalOpen(false)}><X/></button></div>
                        <form onSubmit={handleAddMember} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label><input required className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">E-mail Corporativo</label><input required type="email" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Cargo</label><select className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as Role})}>{Object.entries(ROLE_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}</select></div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg">Enviar Convite</button>
                        </form>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b flex justify-between bg-slate-50 dark:bg-slate-900"><h3 className="font-bold">Novo Item no Catálogo</h3><button onClick={() => setIsProductModalOpen(false)}><X/></button></div>
                        <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Nome Comercial</label><input required className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Preço Sugerido (R$)</label><input required type="number" step="0.01" className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">SKU</label><input className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.sku || ''} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label><select className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}><option value="Product">Equipamento (Venda)</option><option value="Service">Serviço / Instalação</option><option value="Subscription">Recorrência / SLA</option></select></div>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg">Cadastrar Item</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
