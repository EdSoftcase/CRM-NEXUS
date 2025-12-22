
import React, { useState, useMemo, useEffect } from 'react';
import { Client, Invoice, Lead, Ticket, InvoiceStatus, ClientDocument, Activity } from '../types';
import { Badge } from './Widgets';
import { Phone, Mail, Clock, DollarSign, MessageSquare, Briefcase, FileText, TrendingUp, HeartPulse, Activity as ActivityIcon, Upload, Paperclip, Download, Trash2, Calendar, Plus, Save, History, CalendarCheck, Globe, Key, Copy, CheckCircle, ChevronDown, ChevronUp, Mic, Share2, MessageCircle, Package, ArrowUpRight, Zap, GripVertical, Sparkles, AlertTriangle, BookOpen, Send, CalendarPlus, Loader2, ShieldCheck, XCircle } from 'lucide-react';
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

    // Automatically check WA on load
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

    // Edit State for Metrics
    const [editMetrics, setEditMetrics] = useState(false);
    const [tempClient, setTempClient] = useState<Client>(client);

    // Interaction Modal State
    const [showInteractionModal, setShowInteractionModal] = useState(false);
    const [interactionForm, setInteractionForm] = useState({
        type: 'Call' as 'Call' | 'Meeting' | 'Email' | 'Visit',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Portal Access State
    const [portalEmail, setPortalEmail] = useState(client.email);
    const [generatedCreds, setGeneratedCreds] = useState<{email: string, password: string} | null>(null);
    const [isGeneratingAccess, setIsGeneratingAccess] = useState(false);
    const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

    // Expanded Activity State
    const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

    // Drag and Drop Products State
    const [draggedProduct, setDraggedProduct] = useState<string | null>(null);

    const portalUser = usersList.find(u => u.relatedClientId === client.id);
    const clientLeads = leads.filter(l => l.company === client.name);
    const clientTickets = tickets.filter(t => t.customer === client.name);
    const clientInvoices = invoices.filter(i => i.customer === client.name);
    const clientDocs = clientDocuments.filter(d => d.clientId === client.id);

    const contractedSet = new Set(client.contractedProducts || []);
    const upsellOpportunities = products.filter(p => !contractedSet.has(p.name) && p.active);

    const financialAnalysis = useMemo(() => {
        const totalPaid = clientInvoices.filter(i => i.status === InvoiceStatus.PAID).reduce((acc, c) => acc + c.amount, 0);
        const totalOverdue = clientInvoices.filter(i => i.status === InvoiceStatus.OVERDUE).reduce((acc, c) => acc + c.amount, 0);
        const openProposalsValue = clientLeads.reduce((acc, l) => acc + l.value, 0);
        
        let healthStatus = 'Healthy';
        let summary = "Cliente com saúde financeira estável. Pagamentos em dia.";
        let action = "Manter relacionamento e buscar upsell.";

        if (client.status === 'Inactive') {
            healthStatus = 'Critical';
            summary = "🔴 Cliente INATIVO. Não há geração de receita recorrente (MRR) no momento.";
            action = openProposalsValue > 0 
                ? `Prioridade: Fechar proposta pendente de R$ ${openProposalsValue.toLocaleString()} para reativação.`
                : "Ação: Entrar em contato para campanha de Win-back (Retomada).";
        } else if (totalOverdue > 0) {
            healthStatus = 'Risk';
            summary = `⚠️ Atenção: R$ ${totalOverdue.toLocaleString()} em faturas atrasadas.`;
            action = "Ação: Iniciar régua de cobrança amigável imediatamente.";
        } else if (client.status === 'Churn Risk') {
            healthStatus = 'Risk';
            summary = "⚠️ Cliente marcado manualmente como Risco de Churn.";
            action = "Ação: Agendar reunião de Customer Success para alinhamento de expectativas.";
        }

        return { totalPaid, totalOverdue, openProposalsValue, healthStatus, summary, action };
    }, [client, clientInvoices, clientLeads]);

    const playbooks = useMemo(() => {
        const actions = [];
        const health = client.healthScore || 100;
        
        if (client.nps !== undefined && client.nps <= 6) {
            actions.push({
                type: 'recovery',
                label: 'Plano de Recuperação NPS',
                desc: 'Cliente detrator. Enviar email de desculpas e agendar call de feedback.',
                icon: AlertTriangle,
                color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            });
        }

        if (financialAnalysis.totalOverdue > 0) {
            actions.push({
                type: 'finance',
                label: 'Cobrança Amigável',
                desc: `Faturas em atraso (${financialAnalysis.totalOverdue.toLocaleString()}). Enviar lembrete.`,
                icon: DollarSign,
                color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-red-300'
            });
        }

        if (health < 50) {
            actions.push({
                type: 'cs',
                label: 'QBR de Emergência',
                desc: 'Saúde crítica. Agendar Quarterly Business Review para realinhamento.',
                icon: Calendar,
                color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            });
        }

        if (actions.length === 0) {
            actions.push({
                type: 'upsell',
                label: 'Oportunidade de Expansão',
                desc: 'Cliente saudável. Oferecer novos produtos ou pedir indicação.',
                icon: TrendingUp,
                color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            });
        }

        return actions;
    }, [client, financialAnalysis]);

    const handleExecutePlaybook = (actionType: string) => {
        const newActivity: Activity = {
            id: `ACT-PLAYBOOK-${Date.now()}`,
            title: `Ação de Playbook: ${actionType}`,
            type: 'Task',
            dueDate: new Date().toISOString(),
            completed: false,
            relatedTo: client.name,
            assignee: currentUser?.id || 'system',
            description: `Tarefa gerada automaticamente pelo Playbook de Sucesso do Cliente.`
        };
        addActivity(currentUser, newActivity);
        alert(`Ação "${actionType}" iniciada! Tarefa criada na sua agenda.`);
    };

    const clientPhoneClean = client.phone ? client.phone.replace(/\D/g, '') : '';

    const timelineEvents = [
        ...activities.filter(a => {
            const nameMatch = a.relatedTo === client.name;
            let phoneMatch = false;
            if (clientPhoneClean && a.relatedTo) {
                const activityRelatedClean = a.relatedTo.replace(/\D/g, '');
                if (activityRelatedClean.length >= 8 && clientPhoneClean.includes(activityRelatedClean)) {
                    phoneMatch = true;
                }
            }
            return nameMatch || phoneMatch;
        }).map(a => ({
            id: a.id, 
            date: a.dueDate, 
            title: a.title, 
            type: 'Activity', 
            desc: a.type,
            details: a.description,
            metadata: a.metadata 
        })),
        ...logs.filter(l => l.details.includes(client.name)).map(l => ({
            id: l.id, date: l.timestamp, title: l.action, type: 'Log', desc: l.details, details: '', metadata: null
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleSaveMetrics = () => {
        updateClient(currentUser, tempClient);
        setEditMetrics(false);
    };

    const handleFileUpload = () => {
        const mockDoc: ClientDocument = {
            id: `DOC-${Date.now()}`,
            clientId: client.id,
            title: `Contrato - ${new Date().getFullYear()}`,
            type: 'Contract',
            url: '#',
            uploadedBy: currentUser?.name || 'Admin',
            uploadDate: new Date().toISOString(),
            size: '2.4 MB'
        };
        addClientDocument(currentUser!, mockDoc);
    };

    const handleRegisterInteraction = (e: React.FormEvent) => {
        e.preventDefault();
        const newActivity: Activity = {
            id: `ACT-${Date.now()}`,
            title: `Interação: ${interactionForm.type}`,
            type: interactionForm.type === 'Visit' ? 'Meeting' : interactionForm.type as any,
            dueDate: new Date().toISOString(),
            completed: true,
            relatedTo: client.name,
            assignee: currentUser?.id || 'admin',
            description: interactionForm.notes
        };
        addActivity(currentUser!, newActivity);
        const updatedClient = { ...client, lastContact: new Date().toISOString() };
        updateClient(currentUser!, updatedClient);
        setShowInteractionModal(false);
        setInteractionForm({ type: 'Call', notes: '', date: new Date().toISOString().split('T')[0] });
    };

    const handleGenerateAccess = async () => {
        if (!portalEmail) return;
        setIsGeneratingAccess(true);
        const result = await createClientAccess(client, portalEmail);
        setIsGeneratingAccess(false);
        if (result.success && result.password) {
            setGeneratedCreds({ email: portalEmail, password: result.password });
        } else {
            alert(`Erro ao gerar acesso: ${result.error}`);
        }
    };
    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("Copiado!"); };
    const getInvitationMessage = () => { if (!generatedCreds) return ''; return `Olá ${client.contactPerson.split(' ')[0]},\n\nSegue seu acesso ao Portal do Cliente:\n\n🔗 Link: ${window.location.origin}\n👤 Login: ${generatedCreds.email}\n🔑 Senha: ${generatedCreds.password}\n\nPor favor, altere sua senha no primeiro acesso.`; };
    
    const handleShareWhatsApp = async () => { 
        setIsSendingWhatsApp(true);
        const message = getInvitationMessage(); 
        const phone = client.phone.replace(/\D/g, ''); 
        try {
            await sendBridgeWhatsApp(phone, message);
            addSystemNotification('Acesso Enviado', 'Credenciais do portal enviadas via WhatsApp.', 'success');
        } catch (error) {
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        } finally {
            setIsSendingWhatsApp(false);
        }
    };
    
    const handleCopyInvite = () => { copyToClipboard(getInvitationMessage()); };
    const getHealthColor = (score: number) => { if (score >= 80) return 'text-emerald-400'; if (score >= 50) return 'text-yellow-400'; return 'text-red-400'; };
    const toggleExpand = (id: string) => { setExpandedActivityId(prev => prev === id ? null : id); };
    const handleAddProductToPortfolio = (productName: string) => { const currentProducts = client.contractedProducts || []; if (!currentProducts.includes(productName)) { const updatedClient = { ...client, contractedProducts: [...currentProducts, productName] }; updateClient(currentUser, updatedClient); } };
    const handleProductDragStart = (e: React.DragEvent, productName: string) => { setDraggedProduct(productName); e.dataTransfer.setData('text/plain', productName); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePortfolioDrop = (e: React.DragEvent) => { e.preventDefault(); if (draggedProduct) { handleAddProductToPortfolio(draggedProduct); setDraggedProduct(null); } };
    const handleRemoveProduct = (productName: string) => { const reason = window.prompt(`Deseja cancelar o produto "${productName}"?\n\nPor favor, digite o motivo do cancelamento:`); if (reason === null) return; if (reason.trim().length < 5) { alert("É necessário informar uma justificativa."); return; } const updatedClient = { ...client, contractedProducts: (client.contractedProducts || []).filter(p => p !== productName) }; updateClient(currentUser, updatedClient); addLog({ id: `LOG-CANCEL-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser?.id || 'unknown', userName: currentUser?.name || 'Unknown', action: 'Product Cancellation', details: `Produto "${productName}" removido do cliente ${client.name}. Justificativa: ${reason}`, module: 'Clientes', organizationId: currentUser?.organizationId }); };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full shadow-2xl overflow-y-auto animate-slide-in-right flex flex-col relative">
                {/* Header */}
                <div className="bg-slate-900 text-white p-8 shrink-0 border-b border-slate-800">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold">
                                {client.name.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold">{client.name}</h2>
                                    {waStatus === 'checking' && <Loader2 size={16} className="animate-spin text-blue-400" />}
                                    {waStatus === 'verified' && <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-black border border-green-500/30"><ShieldCheck size={10}/> WHATSAPP OK</div>}
                                    {waStatus === 'invalid' && <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-black border border-red-500/30"><XCircle size={10}/> NÚMERO INVÁLIDO</div>}
                                </div>
                                <p className="text-blue-200">{client.segment} • {client.phone}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => setShowInteractionModal(true)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition">
                                 <CalendarCheck size={18}/> Registrar Interação
                             </button>
                             <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 p-2 rounded-full">✕</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <p className="text-slate-400 text-xs uppercase mb-1">Status</p>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${client.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {client.status}
                            </span>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <p className="text-slate-400 text-xs uppercase mb-1">LTV Estimado</p>
                            <p className="font-bold text-lg text-emerald-400">R$ {client.ltv.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg relative group/health">
                            <p className="text-slate-400 text-xs uppercase mb-1">Health Score</p>
                            <div className="flex items-center gap-2">
                                <HeartPulse size={20} className={getHealthColor(client.healthScore || 0)} />
                                <p className={`font-bold text-lg ${getHealthColor(client.healthScore || 0)}`}>{client.healthScore || 0}/100</p>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <p className="text-slate-400 text-xs uppercase mb-1">NPS</p>
                            <p className="font-bold text-lg text-white">{client.nps || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-8 bg-white dark:bg-slate-900 sticky top-0 z-10 overflow-x-auto">
                    {['overview', 'financial', 'support', 'documents', 'portal', 'products'].map((tab) => (
                         <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)} 
                            className={`px-6 py-4 font-medium border-b-2 transition capitalize whitespace-nowrap text-sm ${activeTab === tab ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            {tab === 'overview' ? 'Visão Geral' : tab === 'financial' ? `Financeiro` : tab === 'support' ? `Suporte` : tab === 'portal' ? 'Portal' : tab === 'products' ? `Portfolio` : `Arquivos`}
                        </button>
                    ))}
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-800 flex-1 overflow-y-auto">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <BookOpen size={20} className="text-indigo-500"/> Playbooks de Ação
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {playbooks.map((play, idx) => (
                                        <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 transition hover:shadow-md cursor-pointer ${play.color} border-current border-opacity-20`} onClick={() => handleExecutePlaybook(play.label)}>
                                            <div className="p-2 bg-white/50 rounded-full shrink-0">{React.createElement(play.icon, {size: 18})}</div>
                                            <div>
                                                <h4 className="font-bold text-sm mb-1">{play.label}</h4>
                                                <p className="text-xs opacity-90">{play.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg border border-slate-700 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} /></div>
                                <div className="relative z-10">
                                    <h3 className="font-bold text-lg flex items-center gap-2 mb-3 text-blue-300"><Sparkles size={18} /> Nexus AI Diagnostics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Resumo Executivo</p><p className="text-sm font-medium leading-relaxed">{financialAnalysis.summary}</p></div>
                                        <div className="bg-white/10 p-3 rounded-lg border border-white/10"><p className="text-xs text-blue-200 uppercase font-bold mb-1">Ação Recomendada</p><p className="text-sm font-bold text-white">{financialAnalysis.action}</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><ActivityIcon size={20} className="text-slate-400"/> Indicadores de Sucesso</h3>
                                    {!editMetrics ? (
                                        <button onClick={() => { setTempClient(client); setEditMetrics(true); }} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">Editar</button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditMetrics(false)} className="text-xs text-slate-500">Cancelar</button>
                                            <button onClick={handleSaveMetrics} className="text-xs text-white px-3 py-1 rounded bg-blue-600">Salvar</button>
                                        </div>
                                    )}
                                </div>
                                {!editMetrics && (
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 uppercase">Onboarding</p><Badge>{client.onboardingStatus || 'Pending'}</Badge></div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 uppercase">NPS</p><p className="font-bold text-slate-900 dark:text-white">{client.nps || 'N/A'}</p></div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 uppercase">Risco</p><span className={client.status === 'Churn Risk' ? 'text-red-600 font-bold text-xs' : 'text-green-600 font-bold text-xs'}>{client.status === 'Churn Risk' ? 'ALTO' : 'BAIXO'}</span></div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><History size={20} className="text-slate-400"/> Histórico</h3>
                                <div className="space-y-6 ml-2 border-l-2 border-slate-100 dark:border-slate-800 pl-6 relative">
                                    {timelineEvents.slice(0, 10).map((event, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${event.type === 'Log' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-blue-500'}`}></div>
                                            <div className="group cursor-pointer" onClick={() => toggleExpand(event.id)}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-mono mb-0.5">{new Date(event.date).toLocaleString()}</p>
                                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{event.title}</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500">{event.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
