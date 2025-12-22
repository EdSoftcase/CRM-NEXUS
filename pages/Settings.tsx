
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
    PieChart as PieIcon, Wallet, Server, Terminal, Copy, Zap, Settings2, Globe, CheckCircle, TrendingUp, DollarSign, MessageSquare, QrCode, Mail, UserPlus, Eye, Search, Layers, ToggleRight
} from 'lucide-react';
import { SectionTitle, Badge, KPICard } from '../components/Widgets';
import { Role, Product, PermissionAction, CustomFieldDefinition, WebhookConfig, TriggerType, FinancialCategory, Organization, User } from '../types';
import { getSupabaseConfig, testSupabaseConnection, getSupabase, getSupabaseSchema, saveSupabaseConfig } from '../services/supabaseClient';

const ROLE_NAMES: Record<string, string> = {
    admin: 'Administrador',
    executive: 'Diretoria/Executivo',
    sales: 'Comercial (Sales)',
    support: 'Suporte (N1/N2)',
    dev: 'Desenvolvedor',
    finance: 'Financeiro',
    client: 'Cliente Externo (Portal)'
};

const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com', 'superadmin@nexus.com'];

export const Settings: React.FC = () => {
    const { currentUser, currentOrganization, updateUser, usersList, addTeamMember, adminDeleteUser, adminUpdateUser, permissionMatrix, updatePermission } = useAuth();
    const { 
        products, addProduct, removeProduct, 
        customFields, addCustomField, deleteCustomField, 
        webhooks, addWebhook, deleteWebhook, 
        addSystemNotification, logs: contextLogs,
        financialCategories
    } = useData();
    
    const { data: auditLogs, isLoading: loadingLogs } = useAuditLogs();
    const displayLogs = auditLogs && auditLogs.length > 0 ? auditLogs : contextLogs;

    const isSuperAdmin = currentUser?.email && SUPER_ADMIN_EMAILS.includes(currentUser.email);

    const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'team' | 'permissions' | 'products' | 'financial' | 'custom_fields' | 'webhooks' | 'integrations' | 'audit' | 'database' | 'saas'>('profile');
    
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar: '' });
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('sales');
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    
    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    const [newProduct, setNewProduct] = useState<Partial<Product>>({ active: true, category: 'Subscription', price: 0 });
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'sales' as Role });

    useEffect(() => {
        if (currentUser) setProfileForm({ name: currentUser.name || '', email: currentUser.email || '', avatar: currentUser.avatar || '' });
    }, [currentUser]);

    useEffect(() => {
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
        { id: 'integrations', label: 'Nuvem Supabase', icon: Database }, 
        { id: 'audit', label: 'Auditoria', icon: List },
        { id: 'database', label: 'Patch SQL', icon: Terminal },
        { id: 'saas', label: 'Master SaaS', icon: LayoutGrid, hidden: !isSuperAdmin },
    ];

    const modulesList = ['dashboard', 'commercial', 'clients', 'finance', 'support', 'dev', 'reports', 'settings', 'proposals', 'projects', 'marketing', 'automation'];

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-full">
                <div className="p-6 border-b"><h1 className="text-xl font-bold">Configurações</h1></div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input disabled={!isEditingProfile} className="w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label><input disabled className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400" value={profileForm.email} /></div>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold">{isEditingProfile ? 'Cancelar' : 'Editar Perfil'}</button>
                                    {isEditingProfile && <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Salvar Alterações</button>}
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'organization' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Minha Organização" subtitle="Dados institucionais e branding." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border p-8 shadow-sm space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Razão Social</label><p className="font-bold text-lg">{currentOrganization?.name}</p></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID / Slug</label><p className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded inline-block">{currentOrganization?.slug}</p></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Plano Atual</label><Badge color="blue">{currentOrganization?.plan}</Badge></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status da Licença</label><Badge color="green">Ativa</Badge></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Equipe & Colaboradores" subtitle="Gerencie os usuários que acessam seu CRM." />
                            <button onClick={() => setIsTeamModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><UserPlus size={18}/> Novo Membro</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Nome</th><th className="p-4">E-mail</th><th className="p-4">Cargo / Role</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {usersList.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 font-bold">{user.name}</td>
                                            <td className="p-4 text-slate-500">{user.email}</td>
                                            <td className="p-4"><Badge color="blue">{ROLE_NAMES[user.role]}</Badge></td>
                                            <td className="p-4"><Badge color={user.active ? 'green' : 'red'}>{user.active ? 'Ativo' : 'Pendente'}</Badge></td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => adminDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
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
                        <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden p-6">
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                {Object.keys(ROLE_NAMES).map(role => (
                                    <button key={role} onClick={() => setSelectedRoleForPerms(role as Role)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${selectedRoleForPerms === role ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{ROLE_NAMES[role]}</button>
                                ))}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                        <tr><th className="p-3 text-left">Módulo</th><th className="p-3 text-center">Visualizar</th><th className="p-3 text-center">Criar</th><th className="p-3 text-center">Editar</th><th className="p-3 text-center">Excluir</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {modulesList.map(mod => (
                                            <tr key={mod} className="hover:bg-slate-50">
                                                <td className="p-3 font-medium capitalize">{mod.replace('-', ' ')}</td>
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
                            <SectionTitle title="Catálogo de Produtos & Serviços" subtitle="Itens disponíveis para propostas e contratos." />
                            <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={18}/> Novo Item</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4">Item</th><th className="p-4">SKU</th><th className="p-4">Categoria</th><th className="p-4 text-right">Preço Sugerido</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {products.map(prod => (
                                        <tr key={prod.id} className="hover:bg-slate-50">
                                            <td className="p-4">
                                                <p className="font-bold">{prod.name}</p>
                                                <p className="text-xs text-slate-400">{prod.description}</p>
                                            </td>
                                            <td className="p-4 font-mono text-xs">{prod.sku}</td>
                                            <td className="p-4"><Badge color={prod.category === 'Product' ? 'green' : 'blue'}>{prod.category}</Badge></td>
                                            <td className="p-4 text-right font-bold">R$ {prod.price.toLocaleString()}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => removeProduct(currentUser, prod.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[350px]">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
                                <h3 className="font-bold mb-4">Gastos por Categoria</h3>
                                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.pie} innerRadius={60} outerRadius={80} dataKey="value">{chartData.pie.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
                                <h3 className="font-bold mb-4">Orçado vs Realizado</h3>
                                <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.bar}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="Orçado" fill="#3b82f6" /><Bar dataKey="Realizado" fill="#10b981" /></BarChart></ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campos Personalizados" subtitle="Adicione campos extras aos formulários de leads e clientes." />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={18}/> Novo Campo</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['leads', 'clients'].map(module => (
                                <div key={module} className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-4 bg-slate-50 border-b font-bold capitalize">{module}</div>
                                    <div className="p-4 flex-1">
                                        {customFields.filter(f => f.module === module).map(field => (
                                            <div key={field.id} className="flex justify-between items-center p-3 border rounded-lg mb-2">
                                                <div><p className="font-bold text-sm">{field.label}</p><p className="text-[10px] text-slate-400 uppercase">{field.type}</p></div>
                                                <button onClick={() => deleteCustomField(field.id)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
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
                            <SectionTitle title="Integrações & Webhooks" subtitle="Conecte o Nexus com outras ferramentas via API." />
                            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Zap size={18}/> Criar Endpoint</button>
                        </div>
                        <div className="space-y-4">
                            {webhooks.map(wh => (
                                <div key={wh.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600"><Globe size={24}/></div>
                                        <div><h4 className="font-bold">{wh.name}</h4><p className="text-xs font-mono text-slate-400">{wh.url}</p></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge color="blue">{wh.triggerEvent}</Badge>
                                        <button onClick={() => deleteWebhook(wh.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nuvem Supabase" subtitle="Configuração de sincronização e persistência." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border p-8 shadow-sm">
                            <form onSubmit={handleSaveCloudConfig} className="space-y-4">
                                <div><label className="block text-xs font-bold uppercase text-slate-400">Project URL</label><input required className="w-full border rounded p-2.5 bg-white dark:bg-slate-700" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold uppercase text-slate-400">Anon Key</label><input required type="password" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} /></div>
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded font-bold">Testar e Conectar</button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Auditoria de Sistema" subtitle="Logs históricos de todas as ações importantes." />
                        <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden h-[500px] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase font-bold sticky top-0">
                                        <tr><th className="p-3">Timestamp</th><th className="p-3">Usuário</th><th className="p-3">Ação</th><th className="p-3">Módulo</th><th className="p-3">Detalhes</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {displayLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="p-3 font-bold">{log.userName}</td>
                                                <td className="p-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{log.action}</span></td>
                                                <td className="p-3 text-slate-500 font-medium">{log.module}</td>
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
                        <SectionTitle title="Gestão de Esquema" subtitle="Manutenção avançada do banco de dados." />
                        <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Terminal size={20} className="text-emerald-500"/> SQL Schema v14.0</h3>
                            <p className="text-slate-400 text-sm mb-6">Execute este script no seu projeto Supabase para reconstruir tabelas e colunas necessárias.</p>
                            <button onClick={() => { navigator.clipboard.writeText(getSupabaseSchema()); alert("Copiado!"); }} className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-100 transition-all"><Copy size={18}/> Copiar SQL Patch</button>
                        </div>
                    </div>
                )}

            </main>

            {/* MODALS */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b flex justify-between">
                            <h3 className="font-bold">Convidar Membro</h3>
                            <button onClick={() => setIsTeamModalOpen(false)}><X/></button>
                        </div>
                        <form onSubmit={handleAddMember} className="p-6 space-y-4">
                            <input required className="w-full border rounded p-2" placeholder="Nome" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                            <input required type="email" className="w-full border rounded p-2" placeholder="E-mail" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                            <select className="w-full border rounded p-2" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as Role})}>
                                {Object.entries(ROLE_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                            <button className="w-full bg-blue-600 text-white font-bold py-2 rounded">Convidar</button>
                        </form>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b flex justify-between">
                            <h3 className="font-bold">Novo Item no Catálogo</h3>
                            <button onClick={() => setIsProductModalOpen(false)}><X/></button>
                        </div>
                        <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                            <input required className="w-full border rounded p-2" placeholder="Nome do Produto/Serviço" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                            <textarea className="w-full border rounded p-2" placeholder="Descrição curta" value={newProduct.description || ''} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                            <div className="grid grid-cols-2 gap-2">
                                <input required type="number" className="border rounded p-2" placeholder="Preço R$" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                                <input className="border rounded p-2" placeholder="SKU / Cód" value={newProduct.sku || ''} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                            </div>
                            <select className="w-full border rounded p-2" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}>
                                <option value="Product">Equipamento</option>
                                <option value="Service">Serviço/Horas</option>
                                <option value="Subscription">Mensalidade/Recorrência</option>
                            </select>
                            <button className="w-full bg-blue-600 text-white font-bold py-2 rounded">Cadastrar Item</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
