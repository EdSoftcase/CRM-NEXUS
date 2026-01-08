
import React, { useState, useMemo, useEffect } from 'react';
import { Client, Invoice, Lead, Ticket, InvoiceStatus, ClientDocument, Activity, Product } from '../types';
import { Badge } from './Widgets';
import { Phone, Mail, Clock, DollarSign, MessageSquare, Briefcase, FileText, TrendingUp, HeartPulse, Activity as ActivityIcon, Upload, Paperclip, Download, Trash2, Calendar, Plus, Save, History, CalendarCheck, Globe, Key, Copy, CheckCircle, ChevronDown, ChevronUp, Mic, Share2, MessageCircle, Package, ArrowUpRight, Zap, GripVertical, Sparkles, AlertTriangle, BookOpen, Send, CalendarPlus, Loader2, ShieldCheck, XCircle, ExternalLink, LifeBuoy, X, ChevronRight, Edit2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { sendBridgeWhatsApp, checkWhatsAppNumber } from '../services/bridgeService';

interface Client360Props {
    client: Client;
    leads: Lead[];
    tickets: Ticket[];
    invoices: Invoice[];
    onClose: () => void;
}

export const Client360: React.FC<Client360Props> = ({ client: propClient, leads, tickets, invoices, onClose }) => {
    const { clients, updateClient, clientDocuments, addClientDocument, removeClientDocument, activities, logs, addActivity, products, addLog, addSystemNotification } = useData();
    const { currentUser, createClientAccess } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'support' | 'documents' | 'portal' | 'products'>('overview');
    
    const client = clients.find(c => c.id === propClient.id) || propClient;

    // States
    const [waStatus, setWaStatus] = useState<'idle' | 'checking' | 'verified' | 'invalid' | 'error'>('idle');
    const [portalEmail, setPortalEmail] = useState(client.portalEmail || client.email || '');
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provisionedData, setProvisionedData] = useState<{email: string, password?: string} | null>(
        client.portalPassword ? { email: client.portalEmail || '', password: client.portalPassword } : null
    );

    useEffect(() => {
        if (client.phone) {
            handleCheckWhatsApp();
        }
        setPortalEmail(client.portalEmail || client.email || '');
        setProvisionedData(client.portalPassword ? { email: client.portalEmail || '', password: client.portalPassword } : null);
    }, [client.id, client.email, client.portalEmail, client.portalPassword]);

    const handleCheckWhatsApp = async () => {
        setWaStatus('checking');
        try {
            const result = await checkWhatsAppNumber(client.phone);
            setWaStatus(result.registered ? 'verified' : 'invalid');
        } catch (e) {
            setWaStatus('error');
        }
    };

    const handleProvisionAccess = async () => {
        const cleanEmail = portalEmail.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            addSystemNotification("Dados Incompletos", "Um e-mail válido é obrigatório.", "warning");
            return;
        }

        setIsProvisioning(true);
        try {
            // 1. Gera a senha via AuthContext
            const result = await createClientAccess(client, cleanEmail);
            
            if (result.success && result.password) {
                // 2. Prepara objeto de atualização
                const updatedClient: Client = {
                    ...client,
                    portalEmail: cleanEmail,
                    portalPassword: result.password
                };
                
                // 3. Aguarda persistência REAL no Supabase
                await updateClient(currentUser, updatedClient);
                
                // 4. Atualiza UI local
                setProvisionedData({ email: cleanEmail, password: result.password });
                addSystemNotification("Acesso Gerado e Salvo", `Credenciais registradas no banco de dados Cloud.`, "success");
            } else {
                addSystemNotification("Erro", result.error || "Falha ao gerar acesso.", "alert");
            }
        } catch (e: any) {
            console.error("Erro no provisionamento:", e);
            addSystemNotification("Erro de Persistência", "Verifique o SQL Patch em Configurações.", "alert");
        } finally {
            setIsProvisioning(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addSystemNotification("Copiado!", `${label} copiado para a área de transferência.`, "info");
    };

    const sendCredsViaWhatsApp = () => {
        if (!provisionedData) return;
        const msg = `Olá ${client.contactPerson},\n\nSeu acesso ao Portal SOFT-CRM foi liberado!\n\nLink: https://soft-crm.vercel.app\nLogin: ${provisionedData.email}\nSenha Provisória: ${provisionedData.password}\n\nPor segurança, altere sua senha no primeiro acesso.`;
        const url = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const toggleProduct = (productName: string) => {
        const currentProducts = client.contractedProducts || [];
        let newProducts;
        if (currentProducts.includes(productName)) {
            newProducts = currentProducts.filter(p => p !== productName);
        } else {
            newProducts = [...currentProducts, productName];
        }
        updateClient(currentUser, { ...client, contractedProducts: newProducts });
        addSystemNotification("Portfólio Atualizado", `Item ${productName} atualizado para ${client.name}`, "info");
    };

    // Tabs Data Filtering
    const clientTickets = tickets.filter(t => t.customer === client.name);
    const clientInvoices = invoices.filter(i => i.customer === client.name);
    const clientDocs = clientDocuments.filter(d => d.clientId === client.id);
    const contractedProducts = client.contractedProducts || [];

    const timelineEvents = useMemo(() => {
        return [
            ...activities.filter(a => a.relatedTo === client.name).map(a => ({
                id: a.id, date: a.dueDate, title: a.title, type: 'Activity', desc: a.description || a.type
            })),
            ...logs.filter(l => l.details.includes(client.name)).map(l => ({
                id: l.id, date: l.timestamp, title: l.action, type: 'Log', desc: l.details
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [activities, logs, client.name]);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex justify-end animate-fade-in overflow-hidden">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full shadow-2xl animate-slide-in-right flex flex-col relative border-l border-slate-200 dark:border-slate-800">
                
                {/* Header */}
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
                        <button onClick={onClose} className="text-white/30 hover:text-white bg-white/10 p-3 rounded-2xl transition-all hover:scale-110">
                            <X size={28}/>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">Health Score</p>
                            <p className="font-black text-lg md:text-xl">{client.healthScore || 0}/100</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">LTV Atual</p>
                            <p className="font-black text-lg md:text-xl text-emerald-400">R$ {client.ltv.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">Status Base</p>
                            <Badge color={client.status === 'Active' ? 'green' : 'red'}>{client.status.toUpperCase()}</Badge>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">NPS</p>
                            <p className="font-black text-lg md:text-xl">{client.nps || '--'}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 bg-white dark:bg-slate-900 sticky top-0 z-20 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'overview', label: 'Overview', icon: ActivityIcon },
                        { id: 'financial', label: 'Contas', icon: DollarSign },
                        { id: 'support', label: 'Suporte', icon: LifeBuoy },
                        { id: 'products', label: 'Inventário', icon: Package },
                        { id: 'documents', label: 'Arquivos', icon: FileText },
                        { id: 'portal', label: 'Acesso', icon: Key },
                    ].map((tab) => (
                         <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex items-center gap-2 px-6 py-5 font-black text-[10px] uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon size={16}/> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950 custom-scrollbar pb-24">
                    
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fade-in max-w-3xl">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-tighter text-lg">
                                    <History size={24} className="text-indigo-50"/> Jornada
                                </h3>
                                <div className="space-y-8 ml-3 border-l-4 border-slate-100 dark:border-slate-800 pl-8">
                                    {timelineEvents.map((event, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[42px] w-6 h-6 rounded-xl border-4 border-white dark:border-slate-900 shadow-sm ${event.type === 'Log' ? 'bg-slate-400' : 'bg-indigo-600'}`}></div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase">{new Date(event.date).toLocaleString('pt-BR')}</p>
                                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{event.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1 italic">"{event.desc}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'portal' && (
                        <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
                            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center shadow-2xl">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-[1.5rem] flex items-center justify-center text-indigo-600 mb-6 shadow-inner"><Key size={40}/></div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Central de Autoatendimento</h3>
                                <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Provisione o acesso para que o cliente gerencie faturas e suporte.</p>
                                
                                <div className="w-full space-y-6">
                                    {!provisionedData ? (
                                        <>
                                            <div className="text-left">
                                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2 tracking-widest">E-mail de Login (Corporativo)</label>
                                                <input 
                                                    className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-600 outline-none transition" 
                                                    value={portalEmail}
                                                    onChange={(e) => setPortalEmail(e.target.value)}
                                                    placeholder="cliente@email.com"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleProvisionAccess}
                                                disabled={isProvisioning}
                                                className="w-full bg-[#0f172a] dark:bg-white dark:text-[#0f172a] text-white font-black py-5 rounded-2xl hover:scale-[1.02] transition shadow-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {isProvisioning ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18}/>}
                                                <span>Gerar Nova Senha e Ativar Portal</span>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/30 rounded-3xl p-8 animate-scale-in text-left">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3 text-emerald-700">
                                                    <ShieldCheck size={24}/>
                                                    <h4 className="font-black uppercase tracking-tighter">Acesso Ativado!</h4>
                                                </div>
                                                <Badge color="green">CLOUD OK</Badge>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Login</p>
                                                        <button onClick={() => copyToClipboard(provisionedData.email, "E-mail")} className="text-indigo-600 hover:text-indigo-800"><Copy size={14}/></button>
                                                    </div>
                                                    <p className="font-bold text-slate-800 dark:text-white">{provisionedData.email}</p>
                                                </div>

                                                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Senha Gerada</p>
                                                        <button onClick={() => copyToClipboard(provisionedData.password || '', "Senha")} className="text-indigo-600 hover:text-indigo-800"><Copy size={14}/></button>
                                                    </div>
                                                    <p className="font-mono font-black text-indigo-600 text-2xl tracking-[0.2em]">{provisionedData.password}</p>
                                                </div>
                                            </div>

                                            <div className="mt-8 grid grid-cols-1 gap-3">
                                                <button 
                                                    onClick={sendCredsViaWhatsApp}
                                                    className="w-full bg-[#25D366] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-[#128C7E] transition shadow-lg uppercase text-[10px] tracking-widest"
                                                >
                                                    <MessageCircle size={18}/> Enviar por WhatsApp
                                                </button>
                                                <button 
                                                    onClick={() => setProvisionedData(null)}
                                                    className="w-full py-4 text-slate-400 hover:text-slate-600 font-black uppercase text-[10px] tracking-widest transition"
                                                >
                                                    Gerar Outro Acesso
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-emerald-600 uppercase tracking-tighter">Histórico Financeiro</h3>
                                <div className="space-y-3">
                                    {clientInvoices.length > 0 ? clientInvoices.map(inv => (
                                        <div key={inv.id} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                            <div>
                                                <p className="font-bold text-sm">{inv.description}</p>
                                                <p className="text-xs text-slate-400">Vencimento: {new Date(inv.dueDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black">R$ {inv.amount.toLocaleString()}</p>
                                                <Badge color={inv.status === 'Pago' ? 'green' : 'yellow'}>{inv.status.toUpperCase()}</Badge>
                                            </div>
                                        </div>
                                    )) : <p className="text-center text-slate-400 py-10 italic">Nenhuma fatura localizada.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-indigo-600 uppercase tracking-tighter">Chamados de Suporte</h3>
                                <div className="space-y-3">
                                    {clientTickets.length > 0 ? clientTickets.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                            <div>
                                                <p className="font-bold text-sm">{t.subject}</p>
                                                <p className="text-xs text-slate-400">Aberto em: {new Date(t.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <Badge color={t.status === 'Resolvido' ? 'green' : 'blue'}>{t.status.toUpperCase()}</Badge>
                                        </div>
                                    )) : <p className="text-center text-slate-400 py-10 italic">Nenhum chamado aberto.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-black text-xl mb-2 flex items-center gap-3 text-indigo-600 uppercase tracking-tighter">Inventário da Unidade</h3>
                                <p className="text-slate-500 text-sm mb-8 font-medium">Selecione os produtos que o cliente já possui instalados nesta unidade.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map((prod) => {
                                        const isOwned = contractedProducts.includes(prod.name);
                                        return (
                                            <div 
                                                key={prod.id} 
                                                onClick={() => toggleProduct(prod.name)}
                                                className={`flex items-center justify-between p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${isOwned ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOwned ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                        <Package size={20}/>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-xs text-slate-900 dark:text-slate-100 uppercase tracking-tight">{prod.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{prod.category === 'Product' ? 'Hardware' : 'Serviço'}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isOwned ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                                    {isOwned && <CheckCircle size={14} className="text-white"/>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                <FileText size={48} className="mx-auto text-slate-200 mb-4"/>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Módulo de Documentos Ativo</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
