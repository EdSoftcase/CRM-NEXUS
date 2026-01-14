
import React, { useState, useMemo, useEffect } from 'react';
import { Client, Invoice, Lead, Ticket, InvoiceStatus, ClientDocument, Activity, Product } from '../types';
import { Badge } from './Widgets';
import { 
    Phone, Mail, Clock, DollarSign, MessageSquare, Briefcase, FileText, 
    TrendingUp, HeartPulse, Activity as ActivityIcon, Upload, Paperclip, 
    Download, Trash2, Calendar, Plus, Save, History, CalendarCheck, 
    Globe, Key, Copy, CheckCircle, ChevronDown, ChevronUp, Mic, Share2, 
    MessageCircle, Package, ArrowUpRight, Zap, GripVertical, Sparkles, 
    AlertTriangle, BookOpen, Send, CalendarPlus, Loader2, ShieldCheck, 
    XCircle, ExternalLink, LifeBuoy, X, ChevronRight, Edit2, Link as LinkIcon, Building2,
    CreditCard, Tag
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { checkWhatsAppNumber } from '../services/bridgeService';

interface Client360Props {
    client: Client;
    leads: Lead[];
    tickets: Ticket[];
    invoices: Invoice[];
    onClose: () => void;
}

export const Client360: React.FC<Client360Props> = ({ client: propClient, tickets: propTickets, invoices: propInvoices, onClose }) => {
    const { clients, updateClient, activities, logs, products, addSystemNotification, proposals } = useData();
    const { currentUser, createClientAccess } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'support' | 'documents' | 'portal' | 'products' | 'edit'>('overview');
    
    const client = useMemo(() => clients.find(c => c.id === propClient.id) || propClient, [clients, propClient]);

    // States
    const [waStatus, setWaStatus] = useState<'idle' | 'checking' | 'verified' | 'invalid' | 'error'>('idle');
    const [portalEmail, setPortalEmail] = useState(client.portalEmail || client.email || '');
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provisionedData, setProvisionedData] = useState<{email: string, password?: string} | null>(
        client.portalPassword ? { email: client.portalEmail || '', password: client.portalPassword } : null
    );

    // Edit State
    const [editForm, setEditForm] = useState<Partial<Client>>({...client});

    useEffect(() => {
        if (client.phone) handleCheckWhatsApp();
        setPortalEmail(client.portalEmail || client.email || '');
        setProvisionedData(client.portalPassword ? { email: client.portalEmail || '', password: client.portalPassword } : null);
        setEditForm({...client});
    }, [client.id, client]);

    const handleCheckWhatsApp = async () => {
        setWaStatus('checking');
        try {
            const result = await checkWhatsAppNumber(client.phone);
            setWaStatus(result.registered ? 'verified' : 'invalid');
        } catch (e) { setWaStatus('error'); }
    };

    const handleProvisionAccess = async () => {
        const cleanEmail = portalEmail.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            addSystemNotification("Dados Incompletos", "Um e-mail válido é obrigatório.", "warning");
            return;
        }
        setIsProvisioning(true);
        try {
            const result = await createClientAccess(client, cleanEmail);
            if (result.success && result.password) {
                const updatedClient: Client = { ...client, portalEmail: cleanEmail, portalPassword: result.password };
                await updateClient(currentUser, updatedClient);
                setProvisionedData({ email: cleanEmail, password: result.password });
            }
        } catch (e: any) { addSystemNotification("Erro", "Falha no provisionamento.", "alert"); } finally { setIsProvisioning(false); }
    };

    const toggleProduct = async (productName: string) => {
        const currentProducts = Array.isArray(client.contractedProducts) ? client.contractedProducts : [];
        let newProducts;
        if (currentProducts.includes(productName)) {
            newProducts = currentProducts.filter(p => p !== productName);
        } else {
            newProducts = [...currentProducts, productName];
        }
        await updateClient(currentUser, { ...client, contractedProducts: newProducts });
        addSystemNotification("Inventário Atualizado", `${productName} ${currentProducts.includes(productName) ? 'removido' : 'adicionado'}.`, "success");
    };

    const handleSaveEdit = async () => {
        await updateClient(currentUser, { ...client, ...editForm } as Client);
        addSystemNotification("Sucesso", "Informações da unidade atualizadas.", "success");
        setActiveTab('overview');
    };

    const clientTickets = useMemo(() => (propTickets || []).filter(t => t.customer === client.name), [propTickets, client.name]);
    const clientInvoices = useMemo(() => (propInvoices || []).filter(i => i.customer === client.name), [propInvoices, client.name]);
    const contractedProducts = useMemo(() => Array.isArray(client.contractedProducts) ? client.contractedProducts : [], [client.contractedProducts]);

    // Prováveis contratações baseadas em propostas OU marcações na Central
    const upsellInterests = useMemo(() => {
        const interests = new Set<string>();
        activities.filter(a => a.relatedTo === client.name && a.metadata?.interests).forEach(a => {
            a.metadata.interests.forEach((i: string) => interests.add(i));
        });
        return Array.from(interests);
    }, [activities, client.name]);

    const pendingOpportunities = useMemo(() => {
        return proposals.filter(p => p.companyName === client.name && (p.status === 'Sent' || p.status === 'Draft'));
    }, [proposals, client.name]);

    // NORMALIZAÇÃO PARA VÍNCULO DE INTERAÇÕES
    const normalize = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

    const timelineEvents = useMemo(() => {
        const clientNameNorm = normalize(client.name);
        
        const filteredActivities = activities.filter(a => {
            if (!a.relatedTo) return false;
            return normalize(a.relatedTo) === clientNameNorm;
        });

        const filteredLogs = logs.filter(l => {
            if (!l.details) return false;
            return normalize(l.details).includes(clientNameNorm);
        });

        return [
            ...filteredActivities.map(a => ({
                id: a.id, date: a.dueDate, title: a.title, type: 'Activity', desc: a.description || a.type
            })),
            ...filteredLogs.map(l => ({
                id: l.id, date: l.timestamp, title: l.action, type: 'Log', desc: l.details
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [activities, logs, client.name]);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex justify-end animate-fade-in overflow-hidden">
            {/* Fechamento ao clicar fora */}
            <div className="absolute inset-0 cursor-default" onClick={onClose}></div>
            
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full shadow-2xl animate-slide-in-right flex flex-col relative border-l border-slate-200 dark:border-slate-800 z-[10000]"
                onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar dentro do painel
            >
                
                <div className="bg-[#0f172a] text-white p-6 md:p-10 shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ActivityIcon size={180} /></div>
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-2xl md:text-3xl font-black shadow-2xl border-4 border-indigo-500/30">
                                {client.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <div className="flex wrap items-center gap-2">
                                    <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase truncate max-w-[200px] md:max-w-md">{client.name}</h2>
                                    {waStatus === 'verified' && <div className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[8px] font-black border border-emerald-500/30">WHATSAPP OK</div>}
                                </div>
                                <p className="text-indigo-200/60 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 mt-2">
                                    <Globe size={14}/> {client.segment} • <Phone size={14}/> {client.phone}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActiveTab('edit')} 
                                className="text-white/50 hover:text-white bg-white/10 p-3 rounded-2xl transition-all hover:bg-white/20 active:scale-95" 
                                title="Editar Unidade"
                            >
                                <Edit2 size={24}/>
                            </button>
                            <button 
                                onClick={onClose} 
                                className="text-white/50 hover:text-white bg-white/10 p-3 rounded-2xl transition-all hover:bg-red-500/20 hover:text-red-400 active:scale-95"
                                title="Fechar Painel"
                            >
                                <X size={28}/>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">Health Score</p>
                            <p className="font-black text-lg md:text-xl">{client.healthScore || 0}/100</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">LTV Atual</p>
                            <p className="font-black text-lg md:text-xl text-emerald-400">R$ {client.ltv?.toLocaleString() || '0'}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">Grupo Econômico</p>
                            <p className="font-black text-[10px] md:text-xs uppercase truncate px-1">{client.groupName || 'Independente'}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">NPS</p>
                            <p className="font-black text-lg md:text-xl">{client.nps || '--'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 bg-white dark:bg-slate-900 sticky top-0 z-20 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'overview', label: 'Overview', icon: ActivityIcon },
                        { id: 'financial', label: 'Contas', icon: DollarSign },
                        { id: 'support', label: 'Suporte', icon: LifeBuoy },
                        { id: 'products', label: 'Inventário', icon: Package },
                        { id: 'portal', label: 'Acesso', icon: Key },
                    ].map((tab) => (
                         <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-5 font-black text-[10px] uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><tab.icon size={16}/> {tab.label}</button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950 custom-scrollbar pb-24">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-tighter text-lg">
                                        <History size={24} className="text-indigo-600"/> Timeline de Interações
                                    </h3>
                                    {timelineEvents.length === 0 ? (
                                        <p className="text-slate-400 text-center py-10 italic">Nenhum evento registrado para esta unidade.</p>
                                    ) : (
                                        <div className="space-y-8 ml-3 border-l-4 border-slate-100 dark:border-slate-800 pl-8">
                                            {timelineEvents.slice(0, 10).map((event, i) => (
                                                <div key={i} className="relative">
                                                    <div className={`absolute -left-[42px] w-6 h-6 rounded-xl border-4 border-white dark:border-slate-900 shadow-sm ${event.type === 'Log' ? 'bg-slate-400' : 'bg-indigo-600'}`}></div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase">{new Date(event.date).toLocaleString('pt-BR')}</p>
                                                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{event.title}</h4>
                                                        <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">{event.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-800 shadow-sm">
                                    <h4 className="font-black text-amber-600 dark:text-amber-400 uppercase text-xs mb-4 flex items-center gap-2">
                                        <TrendingUp size={16}/> Radar de Oportunidades
                                    </h4>
                                    
                                    {upsellInterests.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">Interesses Detectados:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {upsellInterests.map((item, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-black border border-amber-200 text-amber-700 flex items-center gap-1">
                                                        <Tag size={10}/> {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {pendingOpportunities.length > 0 ? (
                                        <div className="space-y-3">
                                            {pendingOpportunities.map(opp => (
                                                <div key={opp.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-700 shadow-sm">
                                                    <p className="font-black text-[10px] text-slate-900 dark:text-white uppercase truncate">{opp.title}</p>
                                                    <p className="text-[9px] text-amber-600 font-bold mt-1">Status: {opp.status}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : upsellInterests.length === 0 && (
                                        <p className="text-[10px] text-slate-400 italic">Sem propostas ou interesses recentes.</p>
                                    )}
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
                                    <h4 className="font-black text-indigo-600 dark:text-indigo-400 uppercase text-xs mb-4">Produtos Principais</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {contractedProducts.length > 0 ? contractedProducts.map((p, i) => (
                                            <Badge key={i} color="blue">{p.toUpperCase()}</Badge>
                                        )) : <span className="text-[10px] text-slate-400">Nenhum produto vinculado.</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'edit' && (
                        <div className="space-y-8 animate-fade-in max-w-2xl bg-white dark:bg-slate-900 p-10 rounded-[3rem] border shadow-sm mx-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <Edit2 className="text-indigo-600" size={24}/>
                                <h3 className="font-black text-xl uppercase tracking-tighter">Editar Unidade</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Razão Social</label>
                                    <input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">ID Grupo (Vinculação)</label>
                                    <input className="w-full border-2 border-blue-100 dark:border-blue-900 rounded-2xl p-4 font-black uppercase bg-blue-50/10 outline-none focus:border-blue-600" value={editForm.groupId || ''} onChange={e => setEditForm({...editForm, groupId: e.target.value})} placeholder="MAUA-01" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nome do Grupo</label>
                                    <input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={editForm.groupName || ''} onChange={e => setEditForm({...editForm, groupName: e.target.value})} placeholder="GRUPO MAUÁ" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Valor Mensal (LTV)</label>
                                    <input type="number" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={editForm.ltv || 0} onChange={e => setEditForm({...editForm, ltv: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Segmento</label>
                                    <input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={editForm.segment || ''} onChange={e => setEditForm({...editForm, segment: e.target.value})} />
                                </div>
                            </div>
                            <button onClick={handleSaveEdit} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-600 transition shadow-2xl uppercase tracking-widest text-xs">Salvar Alterações</button>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                            <h3 className="font-black text-xl flex items-center gap-3 text-emerald-600 uppercase tracking-tighter mb-8"><DollarSign size={24}/> Histórico Financeiro</h3>
                            {clientInvoices.length > 0 ? clientInvoices.map(inv => (
                                <div key={inv.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border flex items-center justify-between hover:shadow-md transition">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${inv.status === 'Pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><CreditCard size={20}/></div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-white">{inv.description}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vencimento: {new Date(inv.dueDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-lg text-slate-900 dark:text-white">R$ {Number(inv.amount).toLocaleString()}</p>
                                        <Badge color={inv.status === 'Pago' ? 'green' : 'yellow'}>{inv.status.toUpperCase()}</Badge>
                                    </div>
                                </div>
                            )) : <p className="text-center text-slate-400 py-10 italic">Nenhuma fatura localizada.</p>}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-black text-2xl flex items-center gap-3 text-indigo-600 uppercase tracking-tighter">Gestão de Inventário</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Produtos e Serviços Habilitados para esta Unidade</p>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total: {contractedProducts.length} itens</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {products.length > 0 ? products.map((prod) => {
                                    const isOwned = contractedProducts.some(p => normalize(p) === normalize(prod.name));
                                    return (
                                        <div 
                                            key={prod.id} 
                                            onClick={() => toggleProduct(prod.name)}
                                            className={`group flex items-center justify-between p-5 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${isOwned ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 shadow-lg scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOwned ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-slate-200'}`}>
                                                    <Package size={24}/>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-[11px] text-slate-900 dark:text-white uppercase tracking-tight truncate leading-none mb-1">{prod.name}</p>
                                                    <Badge color={prod.category === 'Product' ? 'blue' : 'purple'}>{prod.category === 'Product' ? 'HW' : 'SVC'}</Badge>
                                                </div>
                                            </div>
                                            {isOwned ? (
                                                <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg"><CheckCircle size={16} fill="currentColor" className="text-white"/></div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full border-2 border-slate-100 dark:border-slate-700 group-hover:border-slate-300 flex items-center justify-center"><Plus size={14} className="text-slate-300 group-hover:text-slate-500"/></div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-full py-16 text-center bg-slate-100 dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <Package size={48} className="mx-auto text-slate-300 mb-4 opacity-30"/>
                                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Catálogo de produtos não carregado.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'portal' && (
                        <div className="max-w-md mx-auto animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border shadow-sm text-center flex flex-col items-center">
                                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-6 shadow-xl shadow-indigo-500/10"><Key size={40}/></div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Portal do Cliente</h3>
                                <p className="text-slate-500 text-sm mb-10 font-medium">Provisione as credenciais de acesso externo.</p>
                                {!provisionedData ? (
                                    <div className="w-full space-y-4">
                                        <div className="text-left space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">E-mail do Gestor</label>
                                            <input className="w-full border-2 rounded-2xl p-4 font-bold text-sm bg-slate-50 dark:bg-slate-800 outline-none focus:border-indigo-600 transition" value={portalEmail} onChange={(e) => setPortalEmail(e.target.value)} placeholder="financeiro@empresa.com" />
                                        </div>
                                        <button onClick={handleProvisionAccess} disabled={isProvisioning} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-5 rounded-2xl hover:scale-[1.02] transition shadow-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50">{isProvisioning ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18} fill="currentColor"/>}{isProvisioning ? 'PROVISIONANDO...' : 'ATIVAR ACESSO AO PORTAL'}</button>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 dark:bg-emerald-950 p-8 rounded-[2.5rem] border border-emerald-200 text-left w-full relative overflow-hidden">
                                        <div className="absolute top-[-20px] right-[-20px] text-emerald-500/10 rotate-12"><ShieldCheck size={120}/></div>
                                        <p className="text-[10px] font-black uppercase text-emerald-600 mb-6 flex items-center gap-2"><ShieldCheck size={14}/> Acesso Ativado</p>
                                        <div className="space-y-5 relative z-10">
                                            <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Login de Acesso</p><p className="font-bold text-slate-800 dark:text-white">{provisionedData.email}</p></div>
                                            <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Senha Provisória</p><p className="font-mono font-black text-indigo-600 text-2xl tracking-[0.2em]">{provisionedData.password}</p></div>
                                            <div className="pt-4 border-t border-emerald-100 dark:border-emerald-900 flex justify-between">
                                                <button onClick={() => { navigator.clipboard.writeText(`Email: ${provisionedData.email}\nSenha: ${provisionedData.password}`); addSystemNotification("Copiado", "Credenciais copiadas.", "success"); }} className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-2 hover:underline"><Copy size={12}/> Copiar Tudo</button>
                                                <button onClick={() => setProvisionedData(null)} className="text-[10px] font-black text-red-400 uppercase hover:text-red-600">Resetar</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
