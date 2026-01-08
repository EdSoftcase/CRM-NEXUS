
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
    Laptop, Phone, LogOut, Code, Lock, Unlock, Key, Link as LinkIcon, Check, Target, Send, Group, Edit2
} from 'lucide-react';
import { SectionTitle, Badge, KPICard } from '../components/Widgets';
import { Role, Product, CustomFieldDefinition, WebhookConfig, Organization, User } from '../types';
import { getSupabaseConfig, getSupabaseSchema, saveSupabaseConfig, getSupabase } from '../services/supabaseClient';
import { checkBridgeStatus, sendBridgeEmail } from '../services/bridgeService';

export const Settings: React.FC = () => {
    const { currentUser, updateOrganizationStatus, currentOrganization, permissionMatrix, updatePermission } = useAuth();
    const { 
        products, addProduct, removeProduct, refreshData,
        addSystemNotification, logs: contextLogs,
        allOrganizations, customFields, addCustomField, deleteCustomField,
        webhooks, addWebhook, deleteWebhook
    } = useData();
    
    const { data: auditLogs } = useAuditLogs();
    const displayLogs = useMemo(() => {
        const remote = auditLogs || [];
        const local = contextLogs || [];
        const combined = [...remote, ...local];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [auditLogs, contextLogs]);

    const isSuperAdmin = useMemo(() => {
        const email = currentUser?.email?.toLowerCase().trim();
        return email && SUPER_ADMIN_EMAILS.includes(email);
    }, [currentUser]);

    const [activeTab, setActiveTab] = useState('profile');
    const [bridgeStatus, setBridgeStatus] = useState<any>(null);
    const [testEmailLoading, setTestEmailLoading] = useState(false);
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    
    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: 'Service', price: 0, active: true });
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [newField, setNewField] = useState<Partial<CustomFieldDefinition>>({ type: 'text', module: 'leads' });
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [newWebhook, setNewWebhook] = useState<Partial<WebhookConfig>>({ method: 'POST', active: true, triggerEvent: 'deal_won' });
    
    // SaaS Master State
    const [masterActionModal, setMasterActionModal] = useState<{ isOpen: boolean, org: Organization | null, action: 'edit' | 'approve' | 'suspend' | 'reactivate' | null }>({
        isOpen: false, org: null, action: null
    });
    const [editOrgForm, setEditOrgForm] = useState({ name: '', groupName: '' });
    const [isActionExecuting, setIsActionExecuting] = useState(false);

    useEffect(() => {
        if (activeTab === 'integrations') {
            const config = getSupabaseConfig();
            setSupabaseForm({ url: config.url || '', key: config.key || '' });
        }
        if (activeTab === 'bridge') {
            handleTestBridge();
        }
    }, [activeTab]);

    const handleTestBridge = async () => {
        const status = await checkBridgeStatus();
        setBridgeStatus(status);
    };

    const handleSaveOrgDetails = async () => {
        if (!masterActionModal.org) return;
        setIsActionExecuting(true);
        const sb = getSupabase();
        if (!sb) {
            setIsActionExecuting(false);
            return;
        }

        try {
            const { error } = await sb.from('organizations').update({
                name: editOrgForm.name,
                group_name: editOrgForm.groupName.trim().toUpperCase()
            }).eq('id', masterActionModal.org.id);

            if (error) throw error;

            addSystemNotification("Sucesso", "Organização atualizada e agrupada.", "success");
            await refreshData();
            setMasterActionModal({ isOpen: false, org: null, action: null });
        } catch (e: any) {
            addSystemNotification("Erro ao Salvar", e.message, "alert");
        } finally {
            setIsActionExecuting(false);
        }
    };

    const roles: Role[] = ['admin', 'executive', 'sales', 'support', 'dev', 'finance', 'client'];
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
        { id: 'permissions', label: 'Permissões (Abas)', icon: Shield },
        { id: 'products', label: 'Catálogo', icon: Package },
        { id: 'financial', label: 'Metas B.I.', icon: Wallet },
        { id: 'custom_fields', label: 'Campos Custom', icon: ListChecks },
        { id: 'webhooks', label: 'Webhooks', icon: Zap },
        { id: 'bridge', label: 'Nexus Bridge', icon: Laptop }, 
        { id: 'integrations', label: 'Nuvem Supabase', icon: Database }, 
        { id: 'audit', label: 'Auditoria', icon: List },
        { id: 'database', label: 'SQL Patch', icon: Terminal, hidden: !isSuperAdmin },
        { id: 'saas', label: 'Master SaaS', icon: LayoutGrid, hidden: !isSuperAdmin },
    ];

    return (
        <div className="flex flex-col md:flex-row h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden font-sans">
            <aside className="w-full md:w-64 bg-white dark:bg-slate-800 border-b md:border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-10 shadow-sm">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700">
                    <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Configurações</h1>
                </div>
                <nav className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 md:p-4 space-x-2 md:space-x-0 md:space-y-1 custom-scrollbar no-scrollbar scroll-smooth">
                    {menuItems.filter(i => !i.hidden).map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)} 
                            className={`flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
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
                        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] border p-6 md:p-10 shadow-sm">
                            <div className="flex flex-col md:flex-row items-center gap-6 mb-10 text-center md:text-left">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-300 border-4 border-white dark:border-slate-700 shadow-xl">{currentUser?.avatar || 'U'}</div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{currentUser?.name}</h3>
                                    <p className="text-slate-500 text-sm">{currentUser?.email}</p>
                                    <div className="mt-2"><Badge color="blue">{currentUser?.role.toUpperCase()}</Badge></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nome</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" defaultValue={currentUser?.name} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">E-mail</label><input disabled className="w-full border-2 border-slate-50 dark:border-slate-800 rounded-2xl p-4 font-bold bg-slate-50 dark:bg-slate-800 text-slate-400" value={currentUser?.email} /></div>
                            </div>
                            <button className="w-full md:w-auto mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition shadow-xl shadow-indigo-500/20">Salvar Alterações</button>
                        </div>
                    </div>
                )}

                {activeTab === 'organization' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Dados da Empresa" subtitle="Informações da sua instância corporativa." />
                        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] border p-6 md:p-10 shadow-sm space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Razão Social</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent" value={currentOrganization?.name || ''} readOnly /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Slug (ID Único)</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-mono text-indigo-600 bg-transparent" value={currentOrganization?.slug || ''} readOnly /></div>
                            </div>
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl md:rounded-[2rem] border border-indigo-100 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Plano Ativo</p>
                                    <p className="text-xl font-black text-indigo-900 dark:text-indigo-100 uppercase">{currentOrganization?.plan || 'ENTERPRISE'}</p>
                                </div>
                                <div className="text-center sm:text-right">
                                    <Badge color="green">ATIVO</Badge>
                                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Vence em 12 meses</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Matriz de Liberação" subtitle="Controle quais abas e módulos cada cargo pode acessar." />
                        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[800px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="p-4 md:p-6 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-sm">Módulo do Sistema</th>
                                            {roles.map(role => <th key={role} className="p-4 md:p-6 text-center">{role}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {modules.map(mod => (
                                            <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                                <td className="p-4 md:p-6 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-3 sticky left-0 bg-white dark:bg-slate-800 z-10">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                    {mod.label}
                                                </td>
                                                {roles.map(role => {
                                                    const hasView = permissionMatrix[role]?.[mod.id]?.view;
                                                    return (
                                                        <td key={role} className="p-4 md:p-6 text-center">
                                                            <button 
                                                                onClick={() => updatePermission(role, mod.id, 'view', !hasView)}
                                                                className={`mx-auto w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${hasView ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}
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
                                    {products.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="p-4 font-bold">{p.name}</td>
                                            <td className="p-4"><Badge color={p.category === 'Product' ? 'blue' : 'purple'}>{p.category}</Badge></td>
                                            <td className="p-4 text-right font-mono">R$ {p.price.toLocaleString()}</td>
                                            <td className="p-4 text-right"><button onClick={() => removeProduct(currentUser, p.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Metas e B.I." subtitle="Configure as metas financeiras globais." />
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border shadow-sm">
                             <div className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border mb-6">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Wallet size={24}/></div>
                                <div><p className="text-xs font-bold text-slate-500 uppercase">Meta de MRR</p><p className="text-2xl font-black text-slate-900 dark:text-white">R$ 450.000,00</p></div>
                             </div>
                             <p className="text-sm text-slate-500 italic">Módulo de configuração de B.I. em desenvolvimento.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campos Customizados" subtitle="Personalize os formulários do sistema." />
                            <button onClick={() => setIsFieldModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> Novo Campo</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {customFields.map(field => (
                                <div key={field.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border shadow-sm flex justify-between items-center">
                                    <div><p className="font-bold text-slate-900 dark:text-white">{field.label}</p><p className="text-[10px] text-slate-500 uppercase">{field.module} • {field.type}</p></div>
                                    <button onClick={() => deleteCustomField(field.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Integrações Webhooks" subtitle="Envie dados do Nexus para outras plataformas." />
                            <button onClick={() => setIsWebhookModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> Novo Webhook</button>
                        </div>
                        <div className="space-y-4">
                            {webhooks.map(hook => (
                                <div key={hook.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border shadow-sm flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${hook.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                        <div><p className="font-bold text-slate-900 dark:text-white">{hook.name}</p><p className="text-xs text-slate-500 font-mono">{hook.url}</p></div>
                                    </div>
                                    <button onClick={() => deleteWebhook(hook.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nexus Bridge" subtitle="Automação local para hardware e serviços externos." />
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-10 border shadow-sm space-y-8">
                             <div className="flex items-center justify-between p-6 rounded-2xl border bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${bridgeStatus?.error ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}><Laptop size={32}/></div>
                                    <div><p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Status do Bridge</p><p className="text-xs text-slate-500">{bridgeStatus?.error ? 'Desconectado' : 'Operacional v2.1'}</p></div>
                                </div>
                                <button onClick={handleTestBridge} className="p-3 bg-white dark:bg-slate-700 border rounded-xl hover:text-indigo-600 transition shadow-sm"><RefreshCw size={20}/></button>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="p-6 rounded-2xl border space-y-4">
                                     <div className="flex items-center gap-3 text-indigo-600"><Mail size={20}/><h4 className="font-bold">Servidor SMTP</h4></div>
                                     <p className="text-xs text-slate-500">Envio de e-mails via servidor local configurado.</p>
                                     <button disabled={testEmailLoading} onClick={() => addSystemNotification('Teste Bridge', 'Comando enviado ao servidor local.', 'info')} className="w-full py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition">Testar SMTP</button>
                                 </div>
                                 <div className="p-6 rounded-2xl border space-y-4">
                                     <div className="flex items-center gap-3 text-emerald-600"><MessageCircle size={20}/><h4 className="font-bold">WhatsApp Instance</h4></div>
                                     <p className="text-xs text-slate-500">Instância ativa via Nexus Bridge v2.</p>
                                     <Badge color="green">ATIVO</Badge>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Nuvem Supabase" subtitle="Configuração de sincronização externa." />
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-10 border shadow-sm space-y-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                                <Info className="text-blue-600 mt-1 shrink-0" size={20}/>
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">Estes dados conectam o CRM ao seu banco de dados na nuvem. Altere apenas se tiver certeza das novas credenciais.</p>
                            </div>
                            <div className="space-y-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Supabase URL</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 font-mono text-sm bg-transparent" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Anon Key</label><input type="password" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 font-mono text-sm bg-transparent" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} /></div>
                            </div>
                            <button onClick={() => { saveSupabaseConfig(supabaseForm.url, supabaseForm.key); window.location.reload(); }} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-xl">Salvar e Reiniciar</button>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Logs de Auditoria" subtitle="Rastreamento de todas as ações importantes no sistema." />
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[800px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                        <tr><th className="p-4">Data/Hora</th><th className="p-4">Usuário</th><th className="p-4">Módulo</th><th className="p-4">Ação</th><th className="p-4">Detalhes</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {displayLogs.slice(0, 50).map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="p-4 font-mono text-[11px] whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="p-4 font-bold">{log.userName}</td>
                                                <td className="p-4 text-xs font-black uppercase text-indigo-500">{log.module}</td>
                                                <td className="p-4">{log.action}</td>
                                                <td className="p-4 text-slate-500 text-xs italic">{log.details}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && isSuperAdmin && (
                    <div className="animate-fade-in space-y-6 max-w-4xl">
                        <SectionTitle title="SQL Patch & Schema" subtitle="Scripts de manutenção e atualização de banco." />
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl">
                             <div className="flex justify-between items-center mb-4">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Code size={14}/> master-reset-v56.sql</p>
                                <button onClick={() => { navigator.clipboard.writeText(getSupabaseSchema()); addSystemNotification('Sucesso', 'SQL copiado.', 'success'); }} className="text-[10px] bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-700 transition"><Copy size={12}/> Copiar Script</button>
                             </div>
                             <pre className="bg-black/50 p-6 rounded-xl font-mono text-[11px] text-emerald-500 overflow-x-auto custom-scrollbar h-96 border border-white/5">
                                {getSupabaseSchema()}
                             </pre>
                        </div>
                    </div>
                )}

                {activeTab === 'saas' && isSuperAdmin && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                            <SectionTitle title="Governança Multi-Tenant" subtitle="Gestão global de todas as instâncias e empresas do ecossistema." />
                            <button onClick={() => refreshData()} className="p-4 bg-white dark:bg-slate-800 border rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><RefreshCw size={24} /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <KPICard title="Empresas" value={allOrganizations.length.toString()} icon={Building2} color="bg-indigo-600" />
                            <KPICard title="Operação Ativa" value={allOrganizations.filter(o => o.status === 'active').length.toString()} icon={CheckCircle} color="bg-emerald-600" />
                            <KPICard title="Bloqueadas" value={allOrganizations.filter(o => o.status === 'suspended').length.toString()} icon={Lock} color="bg-red-600" />
                            <KPICard title="Pendentes" value={allOrganizations.filter(o => o.status === 'pending').length.toString()} icon={AlertTriangle} color="bg-orange-600" />
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[3rem] border shadow-2xl overflow-hidden mt-6 md:mt-10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[800px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                        <tr><th className="p-6 md:p-10">Razão Social / ID</th><th className="p-6 md:p-10">Grupo</th><th className="p-6 md:p-10">Status</th><th className="p-6 md:p-10 text-right">Ações</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {allOrganizations.map(org => (
                                            <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition group">
                                                <td className="p-6 md:p-10">
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg md:text-xl leading-none mb-2">{org.name}</p>
                                                    <p className="text-[9px] font-mono text-slate-400">{org.id}</p>
                                                </td>
                                                <td className="p-6 md:p-10">
                                                    {org.groupName ? (
                                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                            <Group size={14}/> {org.groupName}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 italic text-xs">Sem Grupo</span>
                                                    )}
                                                </td>
                                                <td className="p-6 md:p-10"><Badge color={org.status === 'active' ? 'green' : org.status === 'suspended' ? 'red' : 'yellow'}>{org.status?.toUpperCase()}</Badge></td>
                                                <td className="p-6 md:p-10 text-right">
                                                    <div className="flex justify-end gap-2 md:gap-3 items-center">
                                                        <button onClick={() => { 
                                                            setMasterActionModal({ isOpen: true, org, action: 'edit' });
                                                            setEditOrgForm({ name: org.name, groupName: org.groupName || '' });
                                                        }} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl hover:text-indigo-600 transition shadow-sm"><Edit2 size={16}/></button>
                                                        
                                                        {org.status !== 'active' && <button onClick={() => setMasterActionModal({ isOpen: true, org, action: 'approve' })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition">LIBERAR</button>}
                                                        {org.status === 'active' && <button onClick={() => setMasterActionModal({ isOpen: true, org, action: 'suspend' })} className="px-4 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition">BLOQUEAR</button>}
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
            </main>

            {/* MODALS */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border">
                        <div className="p-8 border-b flex justify-between bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-black text-xl uppercase tracking-tighter">Novo Item de Catálogo</h3>
                            <button onClick={() => setIsProductModalOpen(false)}><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome</label><input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Categoria</label><select className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}><option value="Product">Equipamento</option><option value="Service">Serviço</option></select></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Preço Base</label><input type="number" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                            </div>
                            <button onClick={() => { addProduct(currentUser, { ...newProduct, id: `P-${Date.now()}` } as Product); setIsProductModalOpen(false); }} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl">Salvar no Catálogo</button>
                        </div>
                    </div>
                </div>
            )}

            {isFieldModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in border">
                        <div className="p-6 border-b flex justify-between">
                            <h3 className="font-bold">Novo Campo Customizado</h3>
                            <button onClick={() => setIsFieldModalOpen(false)}><X size={24}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input className="w-full border rounded p-2 bg-transparent" placeholder="Nome do Campo" value={newField.label || ''} onChange={e => setNewField({...newField, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s/g, '_')})} />
                            <select className="w-full border rounded p-2 bg-white dark:bg-slate-800" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}><option value="text">Texto</option><option value="number">Número</option><option value="date">Data</option><option value="boolean">Sim/Não</option></select>
                            <select className="w-full border rounded p-2 bg-white dark:bg-slate-800" value={newField.module} onChange={e => setNewField({...newField, module: e.target.value as any})}><option value="leads">Leads</option><option value="clients">Clientes</option></select>
                            <button onClick={() => { addCustomField({ ...newField, id: `CF-${Date.now()}` } as CustomFieldDefinition); setIsFieldModalOpen(false); }} className="w-full bg-indigo-600 text-white font-bold py-2 rounded">Criar Campo</button>
                        </div>
                    </div>
                </div>
            )}

            {isWebhookModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in border">
                        <div className="p-6 border-b flex justify-between">
                            <h3 className="font-bold">Novo Webhook</h3>
                            <button onClick={() => setIsWebhookModalOpen(false)}><X size={24}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input className="w-full border rounded p-2 bg-transparent" placeholder="Nome da Integração" value={newWebhook.name || ''} onChange={e => setNewWebhook({...newWebhook, name: e.target.value})} />
                            <input className="w-full border rounded p-2 bg-transparent" placeholder="URL do Endpoint" value={newWebhook.url || ''} onChange={e => setNewWebhook({...newWebhook, url: e.target.value})} />
                            <button onClick={() => { addWebhook({ ...newWebhook, id: `WH-${Date.now()}` } as WebhookConfig); setIsWebhookModalOpen(false); }} className="w-full bg-indigo-600 text-white font-bold py-2 rounded">Salvar Webhook</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MASTER DE AÇÕES */}
            {masterActionModal.isOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl md:rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800 my-auto">
                        <div className={`p-8 text-center ${masterActionModal.action === 'edit' ? 'bg-indigo-50 dark:bg-indigo-950/20' : masterActionModal.action === 'suspend' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-emerald-50 dark:bg-emerald-950/20'}`}>
                            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl ${masterActionModal.action === 'edit' ? 'bg-indigo-600 text-white' : masterActionModal.action === 'suspend' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                {masterActionModal.action === 'edit' ? <Settings2 size={32}/> : masterActionModal.action === 'suspend' ? <Lock size={32}/> : <Zap size={32}/>}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-1">
                                {masterActionModal.action === 'edit' ? 'Editar Organização' : 'Comando Master'}
                            </h3>
                            <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">{masterActionModal.org?.name}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            {masterActionModal.action === 'edit' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Razão Social</label>
                                        <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={editOrgForm.name} onChange={e => setEditOrgForm({...editOrgForm, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Grupo Econômico (Visão Master)</label>
                                        <div className="relative">
                                            <Group className="absolute left-4 top-4 text-indigo-500" size={18}/>
                                            <input 
                                                className="w-full pl-12 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4 font-black uppercase tracking-tighter bg-transparent outline-none focus:border-indigo-600" 
                                                placeholder="EX: GRUPO SOFTCASE" 
                                                value={editOrgForm.groupName} 
                                                onChange={e => setEditOrgForm({...editOrgForm, groupName: e.target.value})} 
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-2 italic px-1">Empresas com o mesmo nome de grupo serão unificadas na visão do gestor.</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-center text-slate-600 dark:text-slate-300 font-medium">
                                    Deseja realmente {masterActionModal.action === 'approve' ? 'liberar o acesso operacional' : 'bloquear temporariamente'} para esta unidade?
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setMasterActionModal({ isOpen: false, org: null, action: null })} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition">Cancelar</button>
                                <button 
                                    disabled={isActionExecuting}
                                    onClick={async () => {
                                        if (masterActionModal.action === 'edit') {
                                            await handleSaveOrgDetails();
                                        } else {
                                            setIsActionExecuting(true);
                                            const res = await updateOrganizationStatus(masterActionModal.org!.id, masterActionModal.action === 'suspend' ? 'suspended' : 'active');
                                            if (res.success) {
                                                addSystemNotification("Master SaaS", "Status atualizado.", "success");
                                                await refreshData();
                                                setMasterActionModal({ isOpen: false, org: null, action: null });
                                            }
                                            setIsActionExecuting(false);
                                        }
                                    }}
                                    className={`flex-[2] py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-2xl transition-all flex items-center justify-center gap-2 ${masterActionModal.action === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {isActionExecuting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Confirmar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
