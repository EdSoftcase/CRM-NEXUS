
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, SUPER_ADMIN_EMAILS } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { 
    UserCircle, Shield, Activity, Trash2, Plus, Package, X, Save, 
    Database, Building2, Users, AlertTriangle, AlertCircle, List,
    RefreshCw, Loader2, ListChecks, CreditCard, Power, Info, LayoutGrid,
    PieChart as PieIcon, Wallet, Server, Terminal, Copy, Zap, Settings2, 
    Globe, CheckCircle, TrendingUp, DollarSign, MessageSquare, MessageCircle, 
    QrCode, Mail, UserPlus, Eye, Search, Layers, ToggleRight, Radio, 
    Laptop, Phone, LogOut, Code, Lock, Unlock, Key, Link as LinkIcon, Check, Target, Send, Group, Edit2, ShieldCheck, MailPlus,
    Play
} from 'lucide-react';
import { SectionTitle, Badge, KPICard } from '../components/Widgets';
import { Role, Product, CustomFieldDefinition, WebhookConfig, Organization, User } from '../types';
import { getSupabaseConfig, getSupabaseSchema, saveSupabaseConfig, getSupabase } from '../services/supabaseClient';
import { checkBridgeStatus, sendBridgeEmail } from '../services/bridgeService';

export const Settings: React.FC = () => {
    const { currentUser, currentOrganization, permissionMatrix, updatePermission, usersList, addTeamMember, adminDeleteUser, refreshUsers } = useAuth();
    const { 
        products, addProduct, removeProduct, refreshData,
        addSystemNotification, logs,
        customFields, addCustomField, deleteCustomField,
        webhooks, addWebhook, deleteWebhook, restoreDefaults
    } = useData();
    
    const isSuperAdmin = useMemo(() => {
        const email = currentUser?.email?.toLowerCase().trim();
        return email && SUPER_ADMIN_EMAILS.includes(email);
    }, [currentUser]);

    const [activeTab, setActiveTab] = useState('profile');
    const [bridgeStatus, setBridgeStatus] = useState<any>(null);
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: 'Service', price: 0, active: true });
    
    // New Modals
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [newField, setNewField] = useState<Partial<CustomFieldDefinition>>({ module: 'leads', type: 'text', required: false });
    
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [newWebhook, setNewWebhook] = useState<Partial<WebhookConfig>>({ active: true, method: 'POST' });

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'sales' as Role });
    const [provisionedUser, setProvisionedUser] = useState<{email: string, password?: string} | null>(null);
    const [isActionExecuting, setIsActionExecuting] = useState(false);

    const [sqlQuery, setSqlQuery] = useState(getSupabaseSchema());
    const [sqlResult, setSqlResult] = useState<{success: boolean, message: string} | null>(null);

    useEffect(() => {
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
        }
        if (activeTab === 'bridge') {
            handleTestBridge();
        }
        if (activeTab === 'team') {
            refreshUsers();
        }
    }, [activeTab, refreshUsers]);

    const handleTestBridge = async () => {
        const status = await checkBridgeStatus();
        setBridgeStatus(status);
    };

    const handleSaveSupabase = () => {
        saveSupabaseConfig(supabaseForm.url, supabaseForm.key);
        addSystemNotification("Cloud", "Configurações do Supabase salvas.", "success");
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleExecuteSQL = async () => {
        const sb = getSupabase();
        if (!sb) return;
        setIsActionExecuting(true);
        try {
            const { error } = await sb.rpc('exec_sql', { sql_query: sqlQuery });
            if (error) throw error;
            setSqlResult({ success: true, message: "Script executado com sucesso!" });
        } catch (e: any) {
            setSqlResult({ success: false, message: e.message || "Erro ao executar SQL." });
        } finally {
            setIsActionExecuting(false);
        }
    };

    const handleCreateMemberAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserForm.name || !newUserForm.email) return;
        setIsActionExecuting(true);
        try {
            const result = await addTeamMember(newUserForm.name, newUserForm.email, newUserForm.role);
            if (result.success) {
                setProvisionedUser({ email: newUserForm.email, password: result.password });
                addSystemNotification("Sucesso", "Credenciais geradas.", "success");
            } else {
                addSystemNotification("Erro", result.error || "Falha ao criar.", "alert");
            }
        } catch (e) {
            addSystemNotification("Erro", "Falha crítica.", "alert");
        } finally { setIsActionExecuting(false); }
    };

    const roles: Role[] = ['admin', 'executive', 'sales', 'support', 'dev', 'finance', 'client', 'production'];
    const modules = [
        { id: 'dashboard', label: 'Visão Geral' },
        { id: 'contact-center', label: 'Central de Contatos' },
        { id: 'inbox', label: 'Inbox Unificado' },
        { id: 'prospecting', label: 'Prospecção IA' },
        { id: 'competitive-intelligence', label: 'Nexus Spy' },
        { id: 'calendar', label: 'Agenda' },
        { id: 'marketing', label: 'Marketing Hub' },
        { id: 'commercial', label: 'Comercial/CRM' },
        { id: 'proposals', label: 'Propostas' },
        { id: 'operations', label: 'Produção' },
        { id: 'clients', label: 'Carteira' },
        { id: 'geo-intelligence', label: 'Mapa Inteligente' },
        { id: 'projects', label: 'Projetos' },
        { id: 'customer-success', label: 'C.S.' },
        { id: 'retention', label: 'Retenção' },
        { id: 'automation', label: 'Nexus Flow' },
        { id: 'finance', label: 'Financeiro' },
        { id: 'support', label: 'Suporte' },
        { id: 'dev', label: 'Dev' },
        { id: 'reports', label: 'Relatórios' }
    ];

    const menuItems = [
        { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
        { id: 'organization', label: 'Empresa', icon: Building2 },
        { id: 'team', label: 'Equipe', icon: Users },
        { id: 'permissions', label: 'Permissões (Abas)', icon: Shield },
        { id: 'products', label: 'Catálogo', icon: Package },
        { id: 'financial', label: 'Metas B.I.', icon: Wallet },
        { id: 'custom_fields', label: 'Campos Custom', icon: ListChecks },
        { id: 'webhooks', label: 'Webhooks', icon: Zap },
        { id: 'bridge', label: 'Nexus Bridge', icon: Laptop }, 
        { id: 'integrations', label: 'Nuvem Supabase', icon: Database }, 
        { id: 'audit', label: 'Auditoria', icon: List },
        { id: 'database', label: 'SQL Patch', icon: Terminal, hidden: !isSuperAdmin },
    ];

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden font-sans">
            <aside className="w-full md:w-64 bg-white dark:bg-slate-800 border-b md:border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-10 shadow-sm">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700">
                    <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Configurações</h1>
                </div>
                <nav className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 md:p-4 space-x-2 md:space-x-0 md:space-y-1 custom-scrollbar no-scrollbar">
                    {menuItems.filter(i => !i.hidden).map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)} 
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                            <item.icon size={18} className="shrink-0" /> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                
                {activeTab === 'profile' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Meu Perfil" subtitle="Gerencie seus dados e acesso pessoal." />
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border p-6 md:p-10 shadow-sm">
                            <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-3xl font-black text-indigo-600 border-4 border-white dark:border-slate-700 shadow-xl">{currentUser?.avatar}</div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase">{currentUser?.name}</h3>
                                    <p className="text-slate-500 text-sm">{currentUser?.email}</p>
                                    <div className="mt-2"><Badge color="blue">{currentUser?.role.toUpperCase()}</Badge></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" defaultValue={currentUser?.name} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">E-mail</label><input disabled className="w-full border-2 border-slate-50 dark:border-slate-800 rounded-2xl p-4 font-bold bg-slate-50 dark:bg-slate-800 text-slate-400" value={currentUser?.email} /></div>
                            </div>
                            <button className="w-full md:w-auto mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Salvar Alterações</button>
                        </div>
                    </div>
                )}

                {activeTab === 'organization' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Dados da Empresa" subtitle="Configurações globais da sua instância." />
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border p-10 shadow-sm">
                             <div className="flex items-center gap-4 mb-8">
                                <Building2 size={40} className="text-indigo-600"/>
                                <div>
                                    <h3 className="text-xl font-black uppercase">{currentOrganization?.name}</h3>
                                    <p className="text-xs text-slate-500">ID: {currentOrganization?.id}</p>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4 mb-10">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Plano Ativo</p>
                                    <p className="font-black text-indigo-600 uppercase">{currentOrganization?.plan}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Status Licença</p>
                                    <Badge color="green">OPERACIONAL</Badge>
                                </div>
                             </div>
                             <div className="space-y-4">
                                <button onClick={restoreDefaults} className="w-full text-left p-4 rounded-2xl border-2 border-red-50 text-red-600 font-bold text-sm hover:bg-red-50 transition">Restaurar Dados Padrão (Factory Reset)</button>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Gestão de Equipe" subtitle="Provisione acessos diretos para seus colaboradores." />
                            <button onClick={() => { setProvisionedUser(null); setIsUserModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"><UserPlus size={20}/> Provisionar Membro</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {usersList.length > 0 ? usersList.map(user => (
                                <div key={user.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-indigo-500 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{user.avatar || (user.name ? user.name.charAt(0) : 'U')}</div>
                                        <Badge color={user.active ? 'green' : 'gray'}>{user.active ? 'ATIVO' : 'INATIVO'}</Badge>
                                    </div>
                                    <h3 className="font-black text-lg uppercase tracking-tighter truncate">{user.name || 'Usuário sem nome'}</h3>
                                    <p className="text-xs text-slate-500 mb-6 truncate">{user.email}</p>
                                    <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase">Cargo</span>
                                            <span className="text-xs font-bold text-indigo-600 uppercase">{user.role}</span>
                                        </div>
                                        {user.email !== currentUser?.email && (
                                            <button onClick={() => adminDeleteUser(user.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest bg-white dark:bg-slate-800 rounded-2xl border flex flex-col items-center gap-4">
                                    <Loader2 className="animate-spin text-indigo-600" size={32}/>
                                    Carregando membros da equipe...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Matriz de Liberação" subtitle="Controle quais abas e módulos cada cargo pode acessar." />
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[800px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="p-6 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">Módulo do Sistema</th>
                                            {roles.map(role => <th key={role} className="p-6 text-center">{role}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {modules.map(mod => (
                                            <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                                <td className="p-6 font-bold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 z-10">{mod.label}</td>
                                                {roles.map(role => {
                                                    const hasView = permissionMatrix[role]?.[mod.id]?.view;
                                                    return (
                                                        <td key={role} className="p-6 text-center">
                                                            <button 
                                                                onClick={() => updatePermission(role, mod.id, 'view', !hasView)}
                                                                className={`mx-auto w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${hasView ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}
                                                            >
                                                                {hasView && <Check size={14} />}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
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
                            <SectionTitle title="Catálogo de Produtos" subtitle="Gerencie seus equipamentos e serviços." />
                            <button onClick={() => { setNewProduct({ category: 'Service', price: 0, active: true }); setIsProductModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"><Plus size={20}/> Novo Item</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                    <tr><th className="p-4">Item</th><th className="p-4">Categoria</th><th className="p-4 text-right">Preço Base</th><th className="p-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {products && products.length > 0 ? products.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="p-4 font-bold">{p.name || 'Item sem nome'}</td>
                                            <td className="p-4"><Badge color={p.category === 'Product' ? 'blue' : 'purple'}>{p.category || 'Service'}</Badge></td>
                                            <td className="p-4 text-right font-mono">R$ {(Number(p.price) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-4 text-right"><button onClick={() => removeProduct(currentUser, p.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Nenhum produto cadastrado no catálogo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Metas e B.I." subtitle="Configure as metas financeiras globais da organização." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border shadow-sm flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Target size={24}/></div>
                                    <h4 className="font-black uppercase tracking-tight">Meta de Receita (MRR)</h4>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">R$</span>
                                    <input type="number" className="w-full pl-12 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-3 font-black text-xl outline-none focus:border-indigo-600" defaultValue={450000} />
                                </div>
                                <p className="text-xs text-slate-500">Valor alvo para faturamento mensal recorrente.</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border shadow-sm flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={24}/></div>
                                    <h4 className="font-black uppercase tracking-tight">Meta de Vendas (New Deal)</h4>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">R$</span>
                                    <input type="number" className="w-full pl-12 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-3 font-black text-xl outline-none focus:border-indigo-600" defaultValue={50000} />
                                </div>
                                <p className="text-xs text-slate-500">Valor alvo para novos contratos fechados no mês.</p>
                            </div>
                        </div>
                        <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Salvar Metas</button>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campos Customizados" subtitle="Crie propriedades extras para Leads e Clientes." />
                            <button onClick={() => { setNewField({ module: 'leads', type: 'text', required: false }); setIsFieldModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"><Plus size={20}/> Novo Campo</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {customFields.length > 0 ? customFields.map(field => (
                                <div key={field.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border shadow-sm flex justify-between items-center group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-400"><ListChecks size={20}/></div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{field.label}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">{field.module} • {field.type}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteCustomField(field.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
                                </div>
                            )) : (
                                <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase border-2 border-dashed border-slate-100 rounded-3xl">Nenhum campo personalizado cadastrado.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Webhooks de Integração" subtitle="Envie atualizações em tempo real para outras apps." />
                            <button onClick={() => { setNewWebhook({ active: true, method: 'POST' }); setIsWebhookModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"><Plus size={20}/> Novo Webhook</button>
                        </div>
                        <div className="space-y-4">
                            {webhooks.length > 0 ? webhooks.map(hook => (
                                <div key={hook.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border shadow-sm flex justify-between items-center group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-xl shadow-inner ${hook.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Zap size={24}/></div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{hook.name}</p>
                                            <p className="text-xs text-slate-500 font-mono mt-1">{hook.url}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <Badge color="blue">{hook.triggerEvent?.toUpperCase()}</Badge>
                                                <Badge color="gray">{hook.method}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => deleteWebhook(hook.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-12 text-center text-slate-400 font-bold uppercase border-2 border-dashed border-slate-100 rounded-3xl">Nenhum webhook ativo no momento.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nexus Bridge" subtitle="Conectividade local para Hardware e SMTP." />
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border p-8 shadow-sm">
                            <div className={`p-6 rounded-2xl border-2 flex items-center justify-between mb-8 ${bridgeStatus?.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                <div className="flex items-center gap-4">
                                    <Laptop size={32}/>
                                    <div>
                                        <p className="font-black uppercase tracking-tighter">Status do Bridge</p>
                                        <p className="text-xs font-bold">{bridgeStatus?.error ? 'DESCONECTADO' : 'CONECTADO'}</p>
                                    </div>
                                </div>
                                <button onClick={handleTestBridge} className="bg-white px-4 py-2 rounded-xl text-xs font-black shadow-sm">RECONECTAR</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Cloud Connection" subtitle="Configuração de chaves do Supabase." />
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border p-8 shadow-sm space-y-6">
                            <div className="p-6 bg-slate-900 text-white rounded-2xl border border-white/10 flex items-center gap-4">
                                <Database size={32} className="text-indigo-400"/>
                                <div><p className="font-bold uppercase text-xs">Supabase Real-time</p><p className="text-xs text-slate-400">Configurações de persistência.</p></div>
                            </div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Project URL</label><input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4 font-mono text-xs bg-slate-50 dark:bg-slate-900" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Anon / Public Key</label><input type="password" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4 font-mono text-xs bg-slate-50 dark:bg-slate-900" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} /></div>
                            <button onClick={handleSaveSupabase} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest">Atualizar Conexão</button>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Log de Auditoria" subtitle="Histórico de ações críticas do sistema." />
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border shadow-sm overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-black uppercase">
                                    <tr><th className="p-6">Data/Hora</th><th className="p-6">Usuário</th><th className="p-6">Ação</th><th className="p-6">Módulo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {logs && logs.length > 0 ? logs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="p-6 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                            <td className="p-6 font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">{log.userName}</td>
                                            <td className="p-6 font-bold text-slate-600 dark:text-slate-400">{log.action}</td>
                                            <td className="p-6 uppercase font-black text-[9px] text-indigo-500">{log.module}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic font-bold uppercase tracking-widest">Nenhum log registrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="max-w-4xl animate-fade-in space-y-6">
                        <SectionTitle title="SQL Patch Editor" subtitle="Correções diretas no banco." />
                        <div className="bg-slate-900 rounded-3xl border border-white/10 p-8 shadow-2xl">
                             <textarea 
                                className="w-full h-80 bg-slate-950 border border-white/10 rounded-2xl p-6 font-mono text-sm text-indigo-300 outline-none focus:border-indigo-500"
                                value={sqlQuery}
                                onChange={e => setSqlQuery(e.target.value)}
                             />
                             <div className="flex justify-between items-center mt-6">
                                <button onClick={handleExecuteSQL} disabled={isActionExecuting} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2">
                                    {isActionExecuting ? <Loader2 className="animate-spin" size={16}/> : <Play size={16}/>}
                                    Executar Query
                                </button>
                             </div>
                             {sqlResult && (
                                 <div className={`mt-6 p-4 rounded-xl font-bold text-xs ${sqlResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                     {sqlResult.message}
                                 </div>
                             )}
                        </div>
                    </div>
                )}
            </main>

            {/* MODALS REUTILIZADOS */}
            {isFieldModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border">
                        <SectionTitle title="Novo Campo" />
                        <div className="space-y-4">
                            <input className="w-full border-2 rounded-xl p-3 font-bold bg-slate-50" placeholder="Nome do Campo (ex: Canal)" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s/g, '_')})} />
                            <select className="w-full border-2 rounded-xl p-3 font-bold" value={newField.module} onChange={e => setNewField({...newField, module: e.target.value as any})}>
                                <option value="leads">Módulo: Leads</option>
                                <option value="clients">Módulo: Clientes</option>
                            </select>
                            <select className="w-full border-2 rounded-xl p-3 font-bold" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})}>
                                <option value="text">Tipo: Texto</option>
                                <option value="number">Tipo: Número</option>
                                <option value="select">Tipo: Seleção</option>
                            </select>
                            <button onClick={() => { if(newField.label) addCustomField({ ...newField, id: `F-${Date.now()}` } as any); setIsFieldModalOpen(false); }} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl">CRIAR CAMPO</button>
                        </div>
                    </div>
                </div>
            )}

            {isWebhookModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border">
                        <SectionTitle title="Novo Webhook" />
                        <div className="space-y-4">
                            <input className="w-full border-2 rounded-xl p-3 font-bold bg-slate-50" placeholder="Nome do Alvo (ex: Slack Sales)" value={newWebhook.name} onChange={e => setNewWebhook({...newWebhook, name: e.target.value})} />
                            <input className="w-full border-2 rounded-xl p-3 font-mono text-xs" placeholder="URL do Endpoint" value={newWebhook.url} onChange={e => setNewWebhook({...newWebhook, url: e.target.value})} />
                            <select className="w-full border-2 rounded-xl p-3 font-bold" value={newWebhook.triggerEvent} onChange={e => setNewWebhook({...newWebhook, triggerEvent: e.target.value})}>
                                <option value="lead_created">Gatilho: Novo Lead</option>
                                <option value="deal_won">Gatilho: Venda Fechada</option>
                                <option value="ticket_created">Gatilho: Chamado Aberto</option>
                            </select>
                            <button onClick={() => { if(newWebhook.name && newWebhook.url) addWebhook({ ...newWebhook, id: `WH-${Date.now()}` } as any); setIsWebhookModalOpen(false); }} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl">SALVAR INTEGRAÇÃO</button>
                        </div>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="p-8 border-b flex justify-between bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-black text-xl uppercase tracking-tighter">Catálogo de Itens</h3>
                            <button onClick={() => setIsProductModalOpen(false)}><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome</label><input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Categoria</label><select className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}><option value="Product">Equipamento</option><option value="Service">Serviço</option></select></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Preço</label><input type="number" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                            </div>
                            <button onClick={() => { addProduct(currentUser, { ...newProduct, id: `P-${Date.now()}` } as Product); setIsProductModalOpen(false); }} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de Provisionamento de Equipe */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border shadow-2xl overflow-hidden">
                        {!provisionedUser ? (
                            <form onSubmit={handleCreateMemberAccess} className="p-8 space-y-6">
                                <SectionTitle title="Acesso Equipe" />
                                <input required className="w-full border-2 rounded-2xl p-4 font-bold" placeholder="Nome Completo" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} />
                                <input required type="email" className="w-full border-2 rounded-2xl p-4 font-bold" placeholder="E-mail" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} />
                                <select className="w-full border-2 rounded-2xl p-4 font-bold" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as any})}>
                                    <option value="sales">Vendas</option>
                                    <option value="support">Suporte</option>
                                    <option value="dev">Dev</option>
                                    <option value="finance">Financeiro</option>
                                    <option value="production">Produção</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <button type="submit" disabled={isActionExecuting} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl">
                                    {isActionExecuting ? "PROCESSANDO..." : "CRIAR ACESSO"}
                                </button>
                            </form>
                        ) : (
                            <div className="p-8 space-y-6 text-center">
                                <CheckCircle size={64} className="text-emerald-500 mx-auto" />
                                <h3 className="font-black uppercase tracking-tighter text-xl">Acesso Criado</h3>
                                <div className="bg-slate-50 p-6 rounded-2xl text-left border border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">E-mail: {provisionedUser.email}</p>
                                    <p className="text-xl font-mono font-black text-indigo-600 mt-2">Senha: {provisionedUser.password}</p>
                                </div>
                                <button onClick={() => { setIsUserModalOpen(false); setProvisionedUser(null); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase">CONCLUÍDO</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
