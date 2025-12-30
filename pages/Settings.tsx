
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
    Laptop, Phone, LogOut, Code, Lock, Unlock, Key, Link as LinkIcon, Check, Target
} from 'lucide-react';
import { SectionTitle, Badge, KPICard } from '../components/Widgets';
import { Role, Product, CustomFieldDefinition, WebhookConfig, Organization, User } from '../types';
import { getSupabaseConfig, getSupabaseSchema, saveSupabaseConfig } from '../services/supabaseClient';
import { checkBridgeStatus, disconnectWhatsApp } from '../services/bridgeService';

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
    
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ category: 'Service', price: 0, active: true });
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [newField, setNewField] = useState<Partial<CustomFieldDefinition>>({ type: 'text', module: 'leads' });
    const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
    const [newWebhook, setNewWebhook] = useState<Partial<WebhookConfig>>({ method: 'POST', active: true, triggerEvent: 'deal_won' });
    const [supabaseForm, setSupabaseForm] = useState({ url: '', key: '' });
    const [bridgeStatus, setBridgeStatus] = useState<any>(null);
    const [masterActionModal, setMasterActionModal] = useState<{ isOpen: boolean, org: Organization | null, action: 'approve' | 'suspend' | 'reactivate' | null }>({
        isOpen: false, org: null, action: null
    });
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
        <div className="flex h-full bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden font-sans">
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-full shadow-sm z-10">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Configurações</h1>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {menuItems.filter(i => !i.hidden).map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)} 
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {activeTab === 'profile' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Meu Perfil" subtitle="Gerencie seus dados e acesso pessoal." />
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border p-10 shadow-sm">
                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-24 h-24 rounded-[2rem] bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-300 border-4 border-white dark:border-slate-700 shadow-xl">{currentUser?.avatar || 'U'}</div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{currentUser?.name}</h3>
                                    <p className="text-slate-500">{currentUser?.email}</p>
                                    <Badge color="blue">{currentUser?.role.toUpperCase()}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nome</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent" defaultValue={currentUser?.name} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">E-mail</label><input disabled className="w-full border-2 border-slate-50 dark:border-slate-800 rounded-2xl p-4 font-bold bg-slate-50 dark:bg-slate-800 text-slate-400" value={currentUser?.email} /></div>
                            </div>
                            <button className="mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition shadow-xl shadow-indigo-500/20">Salvar Alterações</button>
                        </div>
                    </div>
                )}

                {activeTab === 'organization' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Dados da Empresa" subtitle="Informações da sua instância corporativa." />
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border p-10 shadow-sm space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Razão Social</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent" value={currentOrganization?.name || ''} readOnly /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Slug (ID Único)</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-mono text-indigo-600 bg-transparent" value={currentOrganization?.slug || ''} readOnly /></div>
                            </div>
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Plano Ativo</p>
                                    <p className="text-xl font-black text-indigo-900 dark:text-indigo-100 uppercase">{currentOrganization?.plan || 'ENTERPRISE'}</p>
                                </div>
                                <div className="text-right">
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
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="p-6">Módulo do Sistema</th>
                                            {roles.map(role => <th key={role} className="p-6 text-center">{role}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {modules.map(mod => (
                                            <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                                <td className="p-6 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                    {mod.label}
                                                </td>
                                                {roles.map(role => {
                                                    const hasView = permissionMatrix[role]?.[mod.id]?.view;
                                                    return (
                                                        <td key={role} className="p-6 text-center">
                                                            <button 
                                                                onClick={() => updatePermission(role, mod.id, 'view', !hasView)}
                                                                className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${hasView ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}
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
                        <div className="flex justify-between items-end">
                            <SectionTitle title="Catálogo de Portfólio" subtitle="Produtos e serviços disponíveis para propostas." />
                            <button onClick={() => setIsProductModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/20 flex items-center gap-2 mb-4">
                                <Plus size={18}/> Novo Item
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map(p => (
                                <div key={p.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:border-indigo-600 transition-all">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl text-indigo-600"><Package size={28}/></div>
                                            <Badge color={p.active ? 'green' : 'gray'}>{p.category === 'Product' ? 'Equipamento' : 'Serviço'}</Badge>
                                        </div>
                                        <h4 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter mb-2">{p.name}</h4>
                                        <p className="text-xs text-slate-500 font-mono">{p.sku || 'SEM SKU'}</p>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">R$ {p.price.toLocaleString()}</p>
                                        <button onClick={() => removeProduct(currentUser, p.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="animate-fade-in space-y-6 max-w-4xl">
                        <SectionTitle title="Indicadores de Crescimento" subtitle="Calibre as metas para os algoritmos de I.A." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-tighter"><Target className="text-indigo-600" size={24}/> Metas de Performance</h4>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Meta Mensal (R$)</label>
                                        <input type="number" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black text-2xl text-indigo-600 bg-transparent outline-none focus:border-indigo-600" defaultValue={250000} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Churn Máximo Aceitável (%)</label>
                                        <input type="number" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black text-2xl text-red-500 bg-transparent outline-none focus:border-red-500" defaultValue={1.2} />
                                    </div>
                                    <button className="w-full bg-slate-900 dark:bg-slate-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition shadow-xl mt-4">Atualizar Parâmetros</button>
                                </div>
                            </div>
                            <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-white flex flex-col justify-center items-center text-center shadow-2xl shadow-indigo-500/40">
                                <PieIcon size={80} className="text-indigo-300 mb-8" />
                                <h4 className="font-black text-3xl uppercase tracking-tighter leading-none mb-4">Saúde do Negócio</h4>
                                <p className="text-indigo-100 text-sm font-medium leading-relaxed">Seu ecossistema está configurado para um crescimento sustentável de <strong className="text-white text-lg">15%</strong> ao ano baseado no quadro atual.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'custom_fields' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-end">
                            <SectionTitle title="Engine de Campos" subtitle="Personalize as entidades com campos técnicos únicos." />
                            <button onClick={() => setIsFieldModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/20 flex items-center gap-2 mb-4">
                                <Plus size={18}/> Novo Campo
                            </button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                    <tr><th className="p-8">Rótulo</th><th className="p-8">Chave Técnica</th><th className="p-8">Tipo</th><th className="p-8">Módulo</th><th className="p-8 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {customFields.map(field => (
                                        <tr key={field.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                            <td className="p-8 font-black uppercase text-slate-700 dark:text-slate-200 tracking-tight">{field.label}</td>
                                            <td className="p-8 font-mono text-xs text-indigo-500">{field.key}</td>
                                            <td className="p-8"><Badge color="blue">{field.type.toUpperCase()}</Badge></td>
                                            <td className="p-8 font-bold uppercase text-[10px] text-slate-400">{field.module}</td>
                                            <td className="p-8 text-right"><button onClick={() => deleteCustomField(field.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={20}/></button></td>
                                        </tr>
                                    ))}
                                    {customFields.length === 0 && <tr><td colSpan={5} className="p-16 text-center text-slate-400 italic font-bold">Nenhum campo personalizado definido.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-end">
                            <SectionTitle title="Automação RPA (Webhooks)" subtitle="Envie eventos em tempo real para plataformas externas." />
                            <button onClick={() => setIsWebhookModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/20 flex items-center gap-2 mb-4">
                                <LinkIcon size={18}/> Novo Endpoint
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {webhooks.map(wh => (
                                <div key={wh.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 flex items-center justify-between group shadow-sm hover:border-indigo-600 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-5 rounded-[1.5rem] ${wh.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Zap size={32}/></div>
                                        <div>
                                            <h4 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter">{wh.name}</h4>
                                            <p className="text-xs font-mono text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border dark:border-slate-700">{wh.url}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Gatilho</p>
                                            <Badge color="purple">{wh.triggerEvent.toUpperCase()}</Badge>
                                        </div>
                                        <button onClick={() => deleteWebhook(wh.id)} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={24}/></button>
                                    </div>
                                </div>
                            ))}
                            {webhooks.length === 0 && <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-black uppercase tracking-widest">Nenhum webhook registrado</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'bridge' && (
                    <div className="animate-fade-in space-y-6 max-w-4xl">
                        <SectionTitle title="Controlador Nexus Bridge" subtitle="Interface com o hardware local para disparos e telefonia." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col justify-between ${bridgeStatus?.server === 'ONLINE' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                <Server size={32} className="mb-6" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Servidor Local</p>
                                    <p className="text-2xl font-black">{bridgeStatus?.server || 'OFFLINE'}</p>
                                </div>
                            </div>
                            <div className={`p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col justify-between ${bridgeStatus?.whatsapp === 'CONNECTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                                <MessageCircle size={32} className="mb-6" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Instância WhatsApp</p>
                                    <p className="text-2xl font-black uppercase">{bridgeStatus?.whatsapp === 'CONNECTED' ? 'Conectado' : 'Pendente'}</p>
                                </div>
                            </div>
                            <div className="p-8 rounded-[2.5rem] border-2 bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm flex flex-col justify-between">
                                <Laptop size={32} className="mb-6" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Escuta Ativa</p>
                                    <p className="text-2xl font-black">Porta 3001</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border p-10 shadow-sm">
                            <h4 className="font-black text-slate-800 dark:text-white mb-8 uppercase tracking-tighter">Manutenção de Conexão</h4>
                            <div className="flex flex-col md:flex-row gap-4">
                                <button onClick={handleTestBridge} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition shadow-xl">Ping Bridge</button>
                                <button onClick={() => disconnectWhatsApp()} className="flex-1 bg-red-50 text-red-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest border border-red-100 hover:bg-red-100 transition">Resetar WhatsApp</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-3xl animate-fade-in space-y-6">
                        <SectionTitle title="Infraestrutura Cloud" subtitle="Chaves de conexão direta com o banco de dados." />
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border p-10 shadow-sm space-y-8">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-start gap-5">
                                <Info className="text-blue-600 shrink-0" size={28}/>
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-bold">Importante: Alterar estas chaves desconectará a instância atual. Certifique-se de que a nova base possui o schema v43.0 migrado.</p>
                            </div>
                            <div className="space-y-6">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">URL do Projeto</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-mono text-sm bg-transparent" value={supabaseForm.url} onChange={e => setSupabaseForm({...supabaseForm, url: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Chave Anon (Public)</label><input type="password" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-mono text-sm bg-transparent" value={supabaseForm.key} onChange={e => setSupabaseForm({...supabaseForm, key: e.target.value})} /></div>
                            </div>
                            <button onClick={() => saveSupabaseConfig(supabaseForm.url, supabaseForm.key)} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition shadow-2xl">Conectar Nova Nuvem</button>
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle title="Audit Logs" subtitle="Rastreabilidade completa de ações de usuários." />
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                        <tr><th className="p-8">Agente</th><th className="p-8">Comando</th><th className="p-8">Módulo</th><th className="p-8 text-right">Data/Hora</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {displayLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="p-8">
                                                    <p className="font-black text-slate-700 dark:text-slate-200">{log.userName || 'Sistema'}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{log.userId || 'nexus-core'}</p>
                                                </td>
                                                <td className="p-8"><code className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-lg text-xs font-black">{log.action}</code></td>
                                                <td className="p-8 text-slate-500 font-bold uppercase text-[10px]">{log.module}</td>
                                                <td className="p-8 text-right font-mono text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {displayLogs.length === 0 && (
                                            <tr><td colSpan={4} className="p-16 text-center text-slate-400 italic">Nenhum log registrado ainda.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'database' && isSuperAdmin && (
                    <div className="max-w-4xl animate-fade-in space-y-6">
                        <SectionTitle title="Manutenção SQL" subtitle="Script de restauração de schema e permissões." />
                        <div className="bg-slate-950 rounded-[2.5rem] p-10 shadow-2xl border border-slate-800">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3 text-indigo-400 font-black text-xs uppercase tracking-widest"><Code size={20}/> Nexus Enterprise SQL Engine</div>
                                <button onClick={() => { navigator.clipboard.writeText(getSupabaseSchema()); addSystemNotification("Copiado", "Script SQL copiado com sucesso.", "success"); }} className="text-slate-500 hover:text-white transition flex items-center gap-2 text-xs font-black uppercase tracking-widest"><Copy size={16}/> Copiar Tudo</button>
                            </div>
                            <textarea 
                                className="w-full h-[450px] bg-black/40 border border-slate-800 rounded-3xl p-8 text-emerald-400 font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none custom-scrollbar shadow-inner leading-relaxed"
                                value={getSupabaseSchema()}
                                readOnly
                            />
                            <div className="mt-8 p-6 bg-red-600/10 border-2 border-red-600/20 rounded-3xl flex items-center gap-5">
                                <AlertTriangle className="text-red-500 shrink-0" size={32}/>
                                <p className="text-xs text-red-200 font-bold leading-relaxed">AVISO: A execução deste script deve ser feita manualmente no SQL Editor do Supabase. Ele mudará o tipo de dados para TEXT, evitando erros de UUID.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'saas' && isSuperAdmin && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-end">
                            <SectionTitle title="Governança Multi-Tenant" subtitle="Gestão global de todas as instâncias e empresas do ecossistema." />
                            <button onClick={() => refreshData()} className="p-5 bg-white dark:bg-slate-800 border rounded-3xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><RefreshCw size={28} /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <KPICard title="Empresas" value={allOrganizations.length.toString()} icon={Building2} color="bg-indigo-600" />
                            <KPICard title="Operação Ativa" value={allOrganizations.filter(o => o.status === 'active').length.toString()} icon={CheckCircle} color="bg-emerald-600" />
                            <KPICard title="Bloqueadas" value={allOrganizations.filter(o => o.status === 'suspended').length.toString()} icon={Lock} color="bg-red-600" />
                            <KPICard title="Pendentes" value={allOrganizations.filter(o => o.status === 'pending').length.toString()} icon={AlertTriangle} color="bg-orange-600" />
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] border shadow-2xl overflow-hidden mt-10">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400">
                                    <tr><th className="p-10">Razão Social / ID</th><th className="p-10">Slug</th><th className="p-10">Status de Rede</th><th className="p-10 text-right">Comandos Master</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {allOrganizations.map(org => (
                                        <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition group">
                                            <td className="p-10">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl leading-none mb-2">{org.name}</p>
                                                <p className="text-[10px] font-mono text-slate-400">{org.id}</p>
                                            </td>
                                            <td className="p-10"><code className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">{org.slug}</code></td>
                                            <td className="p-10"><Badge color={org.status === 'active' ? 'green' : org.status === 'suspended' ? 'red' : 'yellow'}>{org.status === 'active' ? 'EM OPERAÇÃO' : org.status === 'suspended' ? 'ACESSO BLOQUEADO' : 'AGUARDANDO RELEASE'}</Badge></td>
                                            <td className="p-10 text-right">
                                                <div className="flex justify-end gap-3 items-center">
                                                    {org.status !== 'active' && <button onClick={() => setMasterActionModal({ isOpen: true, org, action: 'approve' })} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.05] transition-all">LIBERAR</button>}
                                                    {org.status === 'active' && <button onClick={() => setMasterActionModal({ isOpen: true, org, action: 'suspend' })} className="px-8 py-3 bg-white text-red-600 border-2 border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:scale-[1.05] transition-all">BLOQUEAR</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {isProductModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter">Novo Item de Catálogo</h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-red-500 p-2"><X size={32}/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Descrição Comercial</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600 bg-transparent" placeholder="Nome do Produto/Serviço" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Preço Sugerido</label><input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:border-indigo-600 bg-transparent" placeholder="0.00" type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /></div>
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Categoria</label><select className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none bg-transparent" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}><option value="Service">Serviço / Mensal</option><option value="Product">Equipamento</option></select></div>
                            </div>
                            <button onClick={() => { addProduct(currentUser, { id: `PROD-${Date.now()}`, ...newProduct } as Product); setIsProductModalOpen(false); addSystemNotification("Sucesso", "Produto adicionado.", "success"); }} className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition">Cadastrar Portfolio</button>
                        </div>
                    </div>
                </div>
            )}

            {isFieldModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter">Novo Campo Custom</h3>
                            <button onClick={() => setIsFieldModalOpen(false)} className="text-slate-400 hover:text-red-500 p-2"><X size={32}/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none bg-transparent" placeholder="Nome de Exibição (Label)" value={newField.label || ''} onChange={e => setNewField({...newField, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s/g, '_')})} />
                            <div className="grid grid-cols-2 gap-4">
                                <select className="border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none bg-transparent" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}><option value="text">Texto</option><option value="number">Número</option><option value="date">Data</option><option value="boolean">Booleano</option></select>
                                <select className="border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none bg-transparent" value={newField.module} onChange={e => setNewField({...newField, module: e.target.value as any})}><option value="leads">Leads</option><option value="clients">Carteira</option></select>
                            </div>
                            <button onClick={() => { addCustomField({ id: `F-${Date.now()}`, ...newField } as CustomFieldDefinition); setIsFieldModalOpen(false); }} className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition">Criar Campo Técnico</button>
                        </div>
                    </div>
                </div>
            )}

            {isWebhookModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter">Novo Webhook RPA</h3>
                            <button onClick={() => setIsWebhookModalOpen(false)} className="text-slate-400 hover:text-red-500 p-2"><X size={32}/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none bg-transparent" placeholder="Nome da Integração" value={newWebhook.name || ''} onChange={e => setNewWebhook({...newWebhook, name: e.target.value})} />
                            <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-mono text-xs bg-transparent" placeholder="https://api.hook.com/..." value={newWebhook.url || ''} onChange={e => setNewWebhook({...newWebhook, url: e.target.value})} />
                            <select className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none bg-transparent" value={newWebhook.triggerEvent} onChange={e => setNewWebhook({...newWebhook, triggerEvent: e.target.value as any})}><option value="deal_won">Negócio Ganho</option><option value="lead_created">Novo Lead</option><option value="ticket_created">Ticket Aberto</option></select>
                            <button onClick={() => { addWebhook({ id: `WH-${Date.now()}`, ...newWebhook } as WebhookConfig); setIsWebhookModalOpen(false); }} className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-500/30 transition">Registrar Endpoint</button>
                        </div>
                    </div>
                </div>
            )}

            {masterActionModal.isOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
                        <div className={`p-12 text-center ${masterActionModal.action === 'suspend' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-indigo-50 dark:bg-indigo-950/20'}`}>
                            <div className={`w-28 h-28 rounded-[2.5rem] mx-auto flex items-center justify-center mb-8 shadow-2xl ${masterActionModal.action === 'suspend' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                {masterActionModal.action === 'suspend' ? <Lock size={56}/> : <Zap size={56}/>}
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-2">Comando Master</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">Alterando Status: {masterActionModal.org?.name}</p>
                        </div>
                        <div className="p-12 space-y-6">
                            <div className="flex gap-4">
                                <button onClick={() => setMasterActionModal({ isOpen: false, org: null, action: null })} className="flex-1 py-6 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition">Cancelar</button>
                                <button 
                                    disabled={isActionExecuting}
                                    onClick={async () => {
                                        setIsActionExecuting(true);
                                        const res = await updateOrganizationStatus(masterActionModal.org!.id, masterActionModal.action === 'suspend' ? 'suspended' : 'active');
                                        if (res.success) {
                                            addSystemNotification("Master SaaS", "Status atualizado.", "success");
                                            await refreshData();
                                            setMasterActionModal({ isOpen: false, org: null, action: null });
                                        }
                                        setIsActionExecuting(false);
                                    }}
                                    className={`flex-[2] py-6 rounded-3xl font-black text-xs uppercase tracking-widest text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${masterActionModal.action === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {isActionExecuting ? <Loader2 className="animate-spin" size={24}/> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
