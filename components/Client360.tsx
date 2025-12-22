
import React, { useState, useMemo, useEffect } from 'react';
import { Client, Invoice, Lead, Ticket, InvoiceStatus, ClientDocument, Activity } from '../types';
import { Badge } from './Widgets';
// Fix: Added X, ChevronRight, and Edit2 to resolve "Cannot find name" errors.
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
    const { currentUser, usersList, createClientAccess } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'support' | 'documents' | 'portal' | 'products'>('overview');
    
    const client = clients.find(c => c.id === propClient.id) || propClient;

    // WhatsApp Verification State
    const [waStatus, setWaStatus] = useState<'idle' | 'checking' | 'verified' | 'invalid' | 'error'>('idle');

    useEffect(() => {
        if (client.phone) {
            handleCheckWhatsApp();
        }
    }, [client.id]);

    const handleCheckWhatsApp = async () => {
        setWaStatus('checking');
        try {
            const result = await checkWhatsAppNumber(client.phone);
            setWaStatus(result.registered ? 'verified' : 'invalid');
        } catch (e) {
            setWaStatus('error');
        }
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full shadow-2xl overflow-hidden animate-slide-in-right flex flex-col relative border-l border-slate-200 dark:border-slate-800">
                
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 md:p-8 shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ActivityIcon size={180} /></div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg border-2 border-blue-500/50">
                                {client.name.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold tracking-tight">{client.name}</h2>
                                    {waStatus === 'checking' && <Loader2 size={16} className="animate-spin text-blue-400" />}
                                    {waStatus === 'verified' && <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-black border border-green-500/30"><ShieldCheck size={10}/> WHATSAPP OK</div>}
                                    {waStatus === 'invalid' && <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-black border border-green-500/30"><XCircle size={10}/> NÚMERO INVÁLIDO</div>}
                                </div>
                                <p className="text-blue-200 text-sm flex items-center gap-2 mt-1">
                                    <Globe size={14}/> {client.segment} • <Phone size={14}/> {client.phone}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors">
                            <X size={24}/>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                        <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
                            <p className="text-slate-400 text-[10px] uppercase font-black mb-1">Health Score</p>
                            <div className="flex items-center gap-2">
                                <HeartPulse size={16} className={client.healthScore! > 70 ? 'text-green-400' : 'text-red-400'} />
                                <p className="font-bold text-lg">{client.healthScore || 0}/100</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
                            <p className="text-slate-400 text-[10px] uppercase font-black mb-1">LTV Estimado</p>
                            <p className="font-bold text-lg text-emerald-400">R$ {client.ltv.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
                            <p className="text-slate-400 text-[10px] uppercase font-black mb-1">Status</p>
                            <Badge color={client.status === 'Active' ? 'green' : 'red'}>{client.status}</Badge>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10">
                            <p className="text-slate-400 text-[10px] uppercase font-black mb-1">NPS</p>
                            <p className="font-bold text-lg">{client.nps || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 sticky top-0 z-20 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: ActivityIcon },
                        { id: 'financial', label: 'Financeiro', icon: DollarSign },
                        { id: 'support', label: 'Suporte', icon: LifeBuoy },
                        { id: 'products', label: 'Portfolio', icon: Package },
                        { id: 'documents', label: 'Arquivos', icon: FileText },
                        { id: 'portal', label: 'Portal', icon: Key },
                    ].map((tab) => (
                         <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex items-center gap-2 px-5 py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <tab.icon size={16}/> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                    
                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <History size={20} className="text-blue-500"/> Linha do Tempo de Interações
                                </h3>
                                <div className="space-y-6 ml-3 border-l-2 border-slate-100 dark:border-slate-800 pl-6 relative">
                                    {timelineEvents.map((event, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${event.type === 'Log' ? 'bg-slate-400' : 'bg-blue-500'}`}></div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(event.date).toLocaleString()}</p>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1">{event.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{event.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {timelineEvents.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum evento registrado.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FINANCIAL */}
                    {activeTab === 'financial' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Pago</p>
                                    <p className="text-2xl font-black text-emerald-600">R$ {financialAnalysis.totalPaid.toLocaleString()}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Em Aberto / Atraso</p>
                                    <p className="text-2xl font-black text-red-600">R$ {financialAnalysis.totalOverdue.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 font-bold">Histórico de Faturas</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400">
                                            <tr><th className="p-4">Descrição</th><th className="p-4">Vencimento</th><th className="p-4 text-right">Valor</th><th className="p-4 text-center">Status</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {clientInvoices.map(inv => (
                                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-4 font-medium">{inv.description}</td>
                                                    <td className="p-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right font-bold">R$ {inv.amount.toLocaleString()}</td>
                                                    <td className="p-4 text-center"><Badge color={inv.status === 'Pago' ? 'green' : 'red'}>{inv.status}</Badge></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUPPORT */}
                    {activeTab === 'support' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-900 dark:text-white">Chamados de Suporte</h3>
                                <button className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><Plus size={14}/> Abrir Novo</button>
                            </div>
                            {clientTickets.map(ticket => (
                                <div key={ticket.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group hover:border-blue-400 transition-all">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 font-mono">#{ticket.id}</span>
                                            <Badge color={ticket.status === 'Aberto' ? 'blue' : 'green'}>{ticket.status}</Badge>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-white truncate">{ticket.subject}</h4>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2"><Clock size={12}/> Atualizado em {new Date(ticket.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>
                                </div>
                            ))}
                            {clientTickets.length === 0 && <div className="text-center py-12 text-slate-400 italic">Nenhum chamado aberto.</div>}
                        </div>
                    )}

                    {/* PRODUCTS / PORTFOLIO */}
                    {activeTab === 'products' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-500"><Package size={20}/> Produtos e Serviços Ativos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {contractedProducts.map((prod, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg text-indigo-600"><CheckCircle size={16}/></div>
                                                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{prod}</span>
                                            </div>
                                            <button className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    {contractedProducts.length === 0 && <p className="text-sm text-slate-500 italic col-span-2">Nenhum produto vinculado ao portfólio.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCUMENTS */}
                    {activeTab === 'documents' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white">Repositório de Arquivos</h3>
                                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"><Upload size={14}/> Enviar Arquivo</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {clientDocs.map(doc => (
                                    <div key={doc.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition">
                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-slate-500"><FileText size={24}/></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">{doc.title}</h4>
                                            <p className="text-[10px] text-slate-500 uppercase font-black">{doc.size} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button className="p-2 text-slate-400 hover:text-blue-500"><Download size={16}/></button>
                                            <button onClick={() => removeClientDocument(currentUser, doc.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {clientDocs.length === 0 && <div className="text-center py-12 text-slate-400 italic">Nenhum documento anexado.</div>}
                        </div>
                    )}

                    {/* PORTAL ACCESS */}
                    {activeTab === 'portal' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
                                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 mb-6 shadow-inner"><Key size={40}/></div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Acesso ao Autoatendimento</h3>
                                <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">Gere credenciais para que o cliente possa baixar faturas, assinar propostas e abrir chamados diretamente pelo portal.</p>
                                
                                <div className="w-full max-w-sm space-y-4">
                                    <div className="text-left">
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">E-mail do Cliente</label>
                                        <input className="w-full border dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold" defaultValue={client.email} />
                                    </div>
                                    <button className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 rounded-xl hover:scale-[1.02] transition shadow-xl">GERAR ACESSO AGORA</button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-2">
                        <button className="p-3 bg-green-500 text-white rounded-xl shadow-lg shadow-green-500/20 hover:scale-110 transition"><MessageCircle size={20}/></button>
                        <button className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:scale-110 transition"><Mail size={20}/></button>
                    </div>
                    <button className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition">
                        <Edit2 size={16}/> Editar Cadastro
                    </button>
                </div>
            </div>
        </div>
    );
};
