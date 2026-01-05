
import React, { useState, useMemo, useEffect } from 'react';
import { Client, Invoice, Lead, Ticket, InvoiceStatus, ClientDocument, Activity } from '../types';
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
    const [portalEmail, setPortalEmail] = useState(client.email || '');
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provisionedData, setProvisionedData] = useState<{email: string, password?: string} | null>(null);

    useEffect(() => {
        if (client.phone) {
            handleCheckWhatsApp();
        }
        setPortalEmail(client.email || '');
        setProvisionedData(null);
    }, [client.id, client.email]);

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
        setProvisionedData(null);

        // Timeout de segurança
        const timeoutId = setTimeout(() => {
            if (isProvisioning) {
                setIsProvisioning(false);
                addSystemNotification("Tempo Esgotado", "A nuvem demorou muito para responder.", "alert");
            }
        }, 20000);

        try {
            const result = await createClientAccess(client, cleanEmail);
            clearTimeout(timeoutId);

            if (result.success) {
                setProvisionedData({ email: cleanEmail, password: result.password });
                addSystemNotification("Portal Liberado", `Acesso criado com sucesso!`, "success");
                addLog({
                    id: `LOG-PRV-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    userId: currentUser?.id || 'admin',
                    userName: currentUser?.name || 'Admin',
                    action: 'Portal Access Created',
                    details: `Acesso criado para ${client.name} (Email: ${cleanEmail})`,
                    module: 'Clients'
                });
            } else {
                addSystemNotification("Falha no Provisionamento", result.error || "Erro desconhecido.", "alert");
            }
        } catch (e: any) {
            clearTimeout(timeoutId);
            addSystemNotification("Erro Crítico", e.message || "Falha na comunicação com o Auth Server.", "alert");
        } finally {
            setIsProvisioning(false);
        }
    };

    const copyAccessData = () => {
        if (!provisionedData) return;
        const text = `Dados de Acesso - Portal do Cliente Softpark\n\nLogin: ${provisionedData.email}\nSenha Temporária: ${provisionedData.password}\nLink: ${window.location.origin}`;
        navigator.clipboard.writeText(text);
        addSystemNotification("Copiado", "Dados de acesso copiados para a área de transferência.", "success");
    };

    // Tabs Data Filtering
    const clientTickets = tickets.filter(t => t.customer === client.name);
    const clientInvoices = invoices.filter(i => i.customer === client.name);
    const clientDocs = clientDocuments.filter(d => d.clientId === client.id);
    const contractedProducts = client.contractedProducts || [];

    const financialAnalysis = useMemo(() => {
        const totalPaid = clientInvoices.filter(i => i.status === InvoiceStatus.PAID).reduce((acc, c) => acc + c.amount, 0);
        const totalOverdue = clientInvoices.filter(i => i.status === InvoiceStatus.OVERDUE).reduce((acc, c) => acc + c.amount, 0);
        const openProposalsValue = leads.filter(l => l.company === client.name).reduce((acc, l) => acc + l.value, 0);
        
        let healthStatus = 'Healthy';
        if (totalOverdue > 0 || client.status === 'Churn Risk') healthStatus = 'Risk';
        if (client.status === 'Inactive') healthStatus = 'Critical';

        return { totalPaid, totalOverdue, openProposalsValue, healthStatus };
    }, [client, clientInvoices, leads]);

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
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase truncate max-w-[200px] md:max-w-md">{client.name}</h2>
                                    {waStatus === 'verified' && <div className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[8px] font-black border border-emerald-500/30">WHATSAPP OK</div>}
                                </div>
                                <p className="text-indigo-200/60 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 mt-2">
                                    <Globe size={14}/> {client.segment} • <Phone size={14}/> {client.phone}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/30 hover:text-white bg-white/10 p-3 rounded-2xl transition-all hover:scale-110 active:scale-90">
                            <X size={28}/>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-slate-400 text-[9px] uppercase font-black tracking-widest mb-1">Health Score</p>
                            <div className="flex items-center gap-2">
                                <HeartPulse size={16} className={client.healthScore! > 70 ? 'text-emerald-400' : 'text-red-400'} />
                                <p className="font-black text-lg md:text-xl">{client.healthScore || 0}/100</p>
                            </div>
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
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 bg-white dark:bg-slate-900 sticky top-0 z-20 overflow-x-auto no-scrollbar scroll-smooth shadow-sm">
                    {[
                        { id: 'overview', label: 'Overview', icon: ActivityIcon },
                        { id: 'financial', label: 'Contas', icon: DollarSign },
                        { id: 'support', label: 'Suporte', icon: LifeBuoy },
                        { id: 'products', label: 'Portfólio', icon: Package },
                        { id: 'documents', label: 'Arquivos', icon: FileText },
                        { id: 'portal', label: 'Acesso', icon: Key },
                    ].map((tab) => (
                         <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex items-center gap-2 px-6 py-5 font-black text-[10px] uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <tab.icon size={16}/> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 dark:bg-slate-950 custom-scrollbar pb-36 md:pb-24">
                    
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fade-in max-w-3xl">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                <h3 className="font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-tighter text-lg">
                                    <History size={24} className="text-indigo-500"/> Jornada de Relacionamento
                                </h3>
                                <div className="space-y-8 ml-3 border-l-4 border-slate-100 dark:border-slate-800 pl-8 relative">
                                    {timelineEvents.map((event, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[42px] w-6 h-6 rounded-xl border-4 border-white dark:border-slate-900 shadow-sm ${event.type === 'Log' ? 'bg-slate-400' : 'bg-indigo-600'}`}></div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(event.date).toLocaleString('pt-BR')}</p>
                                                <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1 uppercase tracking-tight">{event.title}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium italic">"{event.desc}"</p>
                                            </div>
                                        </div>
                                    ))}
                                    {timelineEvents.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum evento registrado na linha do tempo.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido (PAGO)</p>
                                    <p className="text-3xl font-black text-emerald-600">R$ {financialAnalysis.totalPaid.toLocaleString()}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dívida / Em Aberto</p>
                                    <p className="text-3xl font-black text-red-600">R$ {financialAnalysis.totalOverdue.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b font-black uppercase text-xs tracking-widest text-slate-400">Extrato de Cobranças</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm min-w-[600px]">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400">
                                            <tr><th className="p-6">Descrição</th><th className="p-6">Vencimento</th><th className="p-6 text-right">Valor Bruto</th><th className="p-6 text-center">Status</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {clientInvoices.map(inv => (
                                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                    <td className="p-6 font-bold text-slate-700 dark:text-slate-200">{inv.description}</td>
                                                    <td className="p-6 text-slate-500 font-medium">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                                    <td className="p-6 text-right font-black text-slate-900 dark:text-white">R$ {inv.amount.toLocaleString()}</td>
                                                    <td className="p-6 text-center"><Badge color={inv.status === 'Pago' ? 'green' : 'red'}>{inv.status.toUpperCase()}</Badge></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="space-y-6 animate-fade-in max-w-4xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-lg md:text-xl text-slate-900 dark:text-white uppercase tracking-tighter">Histórico de Chamados</h3>
                                <button className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:underline"><Plus size={16}/> Abrir Ticket</button>
                            </div>
                            {clientTickets.map(ticket => (
                                <div key={ticket.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800 flex justify-between items-center group hover:border-indigo-400 transition-all shadow-sm">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[10px] font-black text-slate-400 font-mono">#{ticket.id}</span>
                                            <Badge color={ticket.status === 'Aberto' ? 'blue' : 'green'}>{ticket.status.toUpperCase()}</Badge>
                                        </div>
                                        <h4 className="font-black text-slate-800 dark:text-white truncate text-base uppercase tracking-tight">{ticket.subject}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-2 uppercase tracking-widest"><Clock size={12}/> Última Interação: {new Date(ticket.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight size={24}/>
                                    </div>
                                </div>
                            ))}
                            {clientTickets.length === 0 && <div className="text-center py-20 text-slate-400 font-black uppercase tracking-widest italic opacity-20">Nenhum chamado aberto.</div>}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-black text-xl mb-8 flex items-center gap-3 text-indigo-600 uppercase tracking-tighter"><Package size={28}/> Portfólio de Soluções Ativas</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {contractedProducts.map((prod, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-white dark:bg-indigo-900/40 p-3 rounded-2xl shadow-sm text-indigo-600"><CheckCircle size={20}/></div>
                                                <span className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">{prod}</span>
                                            </div>
                                            <button className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                    {contractedProducts.length === 0 && <p className="text-sm text-slate-400 italic font-bold py-10 text-center col-span-2">Nenhum produto vinculado ao quadro de recorrência.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter">Repositório Cloud</h3>
                                <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition"><Upload size={16}/> Upload</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {clientDocs.map(doc => (
                                    <div key={doc.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center gap-6 hover:shadow-xl transition-all group">
                                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-slate-400 group-hover:text-indigo-600 transition-colors"><FileText size={32}/></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-sm text-slate-800 dark:text-white truncate uppercase tracking-tight">{doc.title}</h4>
                                            <p className="text-[10px] text-slate-400 uppercase font-black mt-1 tracking-widest">{doc.size} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition"><Download size={20}/></button>
                                            <button onClick={() => removeClientDocument(currentUser, doc.id)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition"><Trash2 size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {clientDocs.length === 0 && <div className="text-center py-24 text-slate-400 font-black uppercase tracking-widest opacity-20 italic">Base de documentos vazia.</div>}
                        </div>
                    )}

                    {activeTab === 'portal' && (
                        <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
                            <div className="bg-white dark:bg-slate-800 p-10 md:p-14 rounded-[3rem] border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center shadow-2xl">
                                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-8 shadow-inner"><Key size={48}/></div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Central de Autoatendimento</h3>
                                <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Habilite o acesso para que seu cliente possa baixar boletos, assinar contratos e gerenciar suporte remotamente.</p>
                                
                                <div className="w-full space-y-6">
                                    {!provisionedData ? (
                                        <>
                                            <div className="text-left">
                                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2 tracking-widest">E-mail de Login do Cliente</label>
                                                <input 
                                                    className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-600 outline-none transition" 
                                                    value={portalEmail}
                                                    onChange={(e) => setPortalEmail(e.target.value)}
                                                    placeholder="cliente@email.com"
                                                    disabled={isProvisioning}
                                                />
                                            </div>
                                            <button 
                                                onClick={handleProvisionAccess}
                                                disabled={isProvisioning}
                                                className="w-full bg-[#0f172a] dark:bg-white dark:text-[#0f172a] text-white font-black py-5 rounded-2xl hover:scale-[1.02] transition shadow-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {isProvisioning ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={18}/>
                                                        <span>Sincronizando com Cloud...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={18}/>
                                                        <span>Provisionar Acesso Agora</span>
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500/30 rounded-3xl p-6 md:p-8 animate-scale-in">
                                            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase text-xs tracking-widest mb-4">
                                                <CheckCircle size={18}/> Acesso Criado
                                            </div>
                                            <div className="space-y-4 text-left">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">E-mail de Login</p>
                                                    <p className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">{provisionedData.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Senha Temporária</p>
                                                    <p className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-lg">{provisionedData.password}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={copyAccessData}
                                                className="mt-6 w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                                            >
                                                <Copy size={16}/> Copiar Dados para o Cliente
                                            </button>
                                            <button 
                                                onClick={() => setProvisionedData(null)}
                                                className="mt-3 w-full text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase"
                                            >
                                                Provisionar outro e-mail
                                            </button>
                                        </div>
                                    )}
                                    {isProvisioning && (
                                        <p className="text-[10px] text-slate-400 animate-pulse">Este processo pode levar alguns segundos. Não recarregue a página.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 absolute bottom-0 left-0 w-full z-30 md:pb-6 pb-12">
                    <div className="flex gap-3">
                        <button className="p-4 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-110 active:scale-90 transition-all"><MessageCircle size={24}/></button>
                        <button className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-110 active:scale-90 transition-all"><Mail size={24}/></button>
                    </div>
                    <button className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition shadow-2xl">
                        <Edit2 size={18}/> Editar Unidade
                    </button>
                </div>
            </div>
        </div>
    );
};
