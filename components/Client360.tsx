
import React, { useState, useMemo } from 'react';
import { Client, Invoice, Lead, Ticket, InvoiceStatus, ClientDocument, Activity } from '../types';
import { Badge } from './Widgets';
import { Phone, Mail, Clock, DollarSign, MessageSquare, Briefcase, FileText, TrendingUp, HeartPulse, Activity as ActivityIcon, Upload, Paperclip, Download, Trash2, Calendar, Plus, Save, History, CalendarCheck, Globe, Key, Copy, CheckCircle, ChevronDown, ChevronUp, Mic, Share2, MessageCircle, Package, ArrowUpRight, Zap, GripVertical, Sparkles, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface Client360Props {
    client: Client;
    leads: Lead[];
    tickets: Ticket[];
    invoices: Invoice[];
    onClose: () => void;
}

export const Client360: React.FC<Client360Props> = ({ client: propClient, leads, tickets, invoices, onClose }) => {
    const { clients, updateClient, clientDocuments, addClientDocument, removeClientDocument, activities, logs, addActivity, products, addLog } = useData();
    const { currentUser, usersList, createClientAccess } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'support' | 'documents' | 'portal' | 'products'>('overview');
    
    // FIX: Use live data from context to ensure reactivity (e.g. when adding products)
    // Fallback to propClient if not found in list (unlikely)
    const client = clients.find(c => c.id === propClient.id) || propClient;

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

    // Expanded Activity State
    const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

    // Drag and Drop Products State
    const [draggedProduct, setDraggedProduct] = useState<string | null>(null);

    // Check if this client already has a user associated
    const portalUser = usersList.find(u => u.relatedClientId === client.id);

    const clientLeads = leads.filter(l => l.company === client.name);
    const clientTickets = tickets.filter(t => t.customer === client.name);
    const clientInvoices = invoices.filter(i => i.customer === client.name);
    const clientDocs = clientDocuments.filter(d => d.clientId === client.id);

    // Upsell Logic
    const contractedSet = new Set(client.contractedProducts || []);
    const upsellOpportunities = products.filter(p => !contractedSet.has(p.name) && p.active);

    // Financial Analysis Logic
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

    // Merge logs and activities for a timeline
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

        const updatedClient = {
            ...client,
            lastContact: new Date().toISOString()
        };
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copiado para a área de transferência!");
    };

    const getInvitationMessage = () => {
        if (!generatedCreds) return '';
        return `Olá ${client.contactPerson.split(' ')[0]},\n\nSegue seu acesso ao Portal do Cliente:\n\n🔗 Link: ${window.location.origin}\n👤 Login: ${generatedCreds.email}\n🔑 Senha: ${generatedCreds.password}\n\nPor favor, altere sua senha no primeiro acesso.`;
    };

    const handleShareWhatsApp = () => {
        const message = getInvitationMessage();
        const phone = client.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleCopyInvite = () => {
        copyToClipboard(getInvitationMessage());
    };

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const toggleExpand = (id: string) => {
        setExpandedActivityId(prev => prev === id ? null : id);
    };

    // --- PRODUCT PORTFOLIO MANAGEMENT ---
    
    // Core function to add product
    const handleAddProductToPortfolio = (productName: string) => {
        const currentProducts = client.contractedProducts || [];
        if (!currentProducts.includes(productName)) {
            const updatedClient = {
                ...client,
                contractedProducts: [...currentProducts, productName]
            };
            updateClient(currentUser, updatedClient);
        }
    };

    const handleProductDragStart = (e: React.DragEvent, productName: string) => {
        setDraggedProduct(productName);
        e.dataTransfer.setData('text/plain', productName);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePortfolioDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedProduct) {
            handleAddProductToPortfolio(draggedProduct);
            setDraggedProduct(null);
        }
    };

    const handleRemoveProduct = (productName: string) => {
        const reason = window.prompt(`Deseja cancelar o produto "${productName}"?\n\nPor favor, digite o motivo do cancelamento:`);
        
        if (reason === null) return; // User cancelled

        if (reason.trim().length < 5) {
            alert("É necessário informar uma justificativa (mínimo 5 caracteres) para cancelar um produto.");
            return;
        }

        const updatedClient = {
            ...client,
            contractedProducts: (client.contractedProducts || []).filter(p => p !== productName)
        };
        
        updateClient(currentUser, updatedClient);

        // Log the cancellation reason
        addLog({
            id: `LOG-CANCEL-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.id || 'unknown',
            userName: currentUser?.name || 'Unknown',
            action: 'Product Cancellation',
            details: `Produto "${productName}" removido do cliente ${client.name}. Justificativa: ${reason}`,
            module: 'Clientes',
            organizationId: currentUser?.organizationId
        });

        // Add to timeline for visibility
        addActivity(currentUser!, {
            id: `ACT-CANCEL-${Date.now()}`,
            title: `Produto Cancelado: ${productName}`,
            type: 'Task',
            dueDate: new Date().toISOString(),
            completed: true,
            relatedTo: client.name,
            assignee: currentUser?.id || 'system',
            description: `Justificativa: ${reason}`,
            organizationId: currentUser?.organizationId
        });
    };

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
                                <h2 className="text-2xl font-bold">{client.name}</h2>
                                <p className="text-blue-200">{client.segment} • Cliente desde {new Date(client.since).getFullYear()}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setShowInteractionModal(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
                             >
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
                        <div className="bg-slate-800 p-4 rounded-lg">
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
                            {tab === 'overview' ? 'Visão Geral' : 
                             tab === 'financial' ? `Financeiro (${clientInvoices.length})` :
                             tab === 'support' ? `Suporte (${clientTickets.length})` :
                             tab === 'portal' ? 'Acesso ao Portal' :
                             tab === 'products' ? `Portfolio (${client.contractedProducts?.length || 0})` :
                             `Arquivos (${clientDocs.length})`}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-8 bg-slate-50 dark:bg-slate-800 flex-1 overflow-y-auto">
                    {/* ... (Tabs: Overview, Documents, Financial, Support - Unchanged) ... */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            
                            {/* NEW: AI Financial Analysis Card */}
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg border border-slate-700 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="font-bold text-lg flex items-center gap-2 mb-3 text-blue-300">
                                        <Sparkles size={18} /> Nexus AI Diagnostics
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Resumo Executivo</p>
                                            <p className="text-sm font-medium leading-relaxed">
                                                {financialAnalysis.summary}
                                            </p>
                                        </div>
                                        <div className="bg-white/10 p-3 rounded-lg border border-white/10">
                                            <p className="text-xs text-blue-200 uppercase font-bold mb-1">Ação Recomendada</p>
                                            <p className="text-sm font-bold text-white">
                                                {financialAnalysis.action}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase">Receita Realizada</p>
                                            <p className="font-mono font-bold text-green-400">R$ {financialAnalysis.totalPaid.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase">Em Atraso</p>
                                            <p className={`font-mono font-bold ${financialAnalysis.totalOverdue > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                                R$ {financialAnalysis.totalOverdue.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase">Pipeline (Potencial)</p>
                                            <p className="font-mono font-bold text-blue-400">R$ {financialAnalysis.openProposalsValue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CS Metrics Editor */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <ActivityIcon size={20} className="text-slate-400"/> Indicadores de Sucesso (CS)
                                    </h3>
                                    {!editMetrics ? (
                                        <button 
                                            onClick={() => { setTempClient(client); setEditMetrics(true); }}
                                            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                        >
                                            Editar Métricas
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditMetrics(false)} className="text-xs text-slate-500 dark:text-slate-400 px-3 py-1 rounded bg-slate-100 dark:bg-slate-800">Cancelar</button>
                                            <button onClick={handleSaveMetrics} className="text-xs text-white px-3 py-1 rounded bg-blue-600 hover:bg-blue-700">Salvar</button>
                                        </div>
                                    )}
                                </div>
                                {editMetrics ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Health Score (0-100)</label>
                                            <div className="flex items-center gap-3">
                                                <input type="range" min="0" max="100" value={tempClient.healthScore || 0} onChange={(e) => setTempClient({...tempClient, healthScore: parseInt(e.target.value)})} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                                <span className="font-bold text-slate-700 dark:text-slate-200 w-8">{tempClient.healthScore}</span>
                                            </div>
                                        </div>
                                        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">NPS</label><input type="number" min="-100" max="100" value={tempClient.nps || 0} onChange={(e) => setTempClient({...tempClient, nps: parseInt(e.target.value)})} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white" /></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Onboarding</p><Badge>{client.onboardingStatus || 'Pending'}</Badge></div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400 uppercase">NPS</p><p className="font-bold text-slate-900 dark:text-white">{client.nps || 'N/A'}</p></div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Risco</p><span className={client.status === 'Churn Risk' ? 'text-red-600 font-bold text-xs' : 'text-green-600 font-bold text-xs'}>{client.status === 'Churn Risk' ? 'ALTO' : 'BAIXO'}</span></div>
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <History size={20} className="text-slate-400"/> Histórico de Interações
                                </h3>
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
                                                    {event.details && <ChevronDown size={14} className={`text-slate-400 transition ${expandedActivityId === event.id ? 'rotate-180' : ''}`} />}
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-1">{event.desc}</p>
                                                
                                                {/* Expanded Details / Voice Transcript */}
                                                {expandedActivityId === event.id && (
                                                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 animate-fade-in">
                                                        {event.metadata && event.metadata.sentiment && (
                                                            <div className="mb-2 flex gap-2">
                                                                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${event.metadata.sentiment === 'Positivo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                                    {event.metadata.sentiment}
                                                                </span>
                                                                {event.metadata.transcript && <span className="text-slate-400 flex items-center gap-1"><Mic size={10}/> Transcrição disponível</span>}
                                                            </div>
                                                        )}
                                                        
                                                        {event.details && <p className="italic mb-2">{event.details}</p>}
                                                        
                                                        {/* Full Transcript Block */}
                                                        {event.metadata && event.metadata.transcript && (
                                                            <div className="mt-3 p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Transcrição</p>
                                                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{event.metadata.transcript}</p>
                                                            </div>
                                                        )}

                                                        {event.metadata && event.metadata.nextSteps && (
                                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                                                <strong className="text-slate-500 block mb-1">Próximos Passos:</strong>
                                                                {event.metadata.nextSteps}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {timelineEvents.length === 0 && <p className="text-slate-500 text-sm italic">Sem atividades recentes.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-6">
                            <div 
                                className={`bg-white dark:bg-slate-900 p-6 rounded-xl border transition-colors shadow-sm
                                    ${draggedProduct ? 'border-dashed border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}
                                `}
                                onDragOver={handleDragOver}
                                onDrop={handlePortfolioDrop}
                            >
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                    <Package size={20} className="text-blue-600"/> Portfolio Contratado
                                </h3>
                                {draggedProduct && <p className="text-xs text-blue-500 dark:text-blue-400 mb-2 font-bold animate-pulse text-center border-dashed border border-blue-300 p-2 rounded">Solte o produto aqui para adicionar</p>}
                                
                                {client.contractedProducts && client.contractedProducts.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {client.contractedProducts.map(prodName => (
                                            <div key={prodName} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg group relative">
                                                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded text-blue-600 dark:text-blue-300">
                                                    <CheckCircle size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{prodName}</p>
                                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Ativo</p>
                                                </div>
                                                <button onClick={() => handleRemoveProduct(prodName)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg">
                                        {draggedProduct ? 'Solte aqui!' : 'Nenhum produto vinculado.'}
                                    </div>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                <h3 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 mb-1">
                                    <Zap size={20} className="text-yellow-500 fill-yellow-500"/> Oportunidades (Upsell)
                                </h3>
                                <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-4">Arraste ou clique no + para adicionar ao portfólio.</p>
                                
                                {upsellOpportunities.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {upsellOpportunities.map(opp => (
                                            <div 
                                                key={opp.id} 
                                                draggable="true"
                                                onDragStart={(e) => handleProductDragStart(e, opp.name)}
                                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 rounded-lg group hover:shadow-md transition cursor-grab active:cursor-grabbing hover:border-blue-400 relative"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <GripVertical size={14} className="text-slate-300"/>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{opp.name}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">R$ {opp.price.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                {/* New Action Button for Mobile and Desktop Click */}
                                                <button 
                                                    onClick={() => handleAddProductToPortfolio(opp.name)}
                                                    className="p-2 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                                                    title="Adicionar ao Portfólio"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-indigo-800 dark:text-indigo-300 italic text-center">Este cliente já possui todos os produtos do portfólio!</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'portal' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                            {/* ... Portal content same as before ... */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Globe size={20} className="text-indigo-600"/> Acesso ao Portal do Cliente
                                </h3>
                            </div>
                            
                            <div className="p-8 flex-1 flex flex-col justify-center">
                                {generatedCreds ? (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Key size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Acesso Gerado com Sucesso!</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md mx-auto">
                                                Envie as credenciais abaixo para o cliente. Por segurança, esta senha provisória não será exibida novamente.
                                            </p>
                                        </div>

                                        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Link de Acesso</label>
                                                <div className="flex gap-2 mt-1">
                                                    <code className="flex-1 p-3 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-600 text-sm font-mono text-slate-800 dark:text-slate-200">{window.location.origin}</code>
                                                    <button onClick={() => copyToClipboard(window.location.origin)} className="p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><Copy size={16}/></button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Login (Email)</label>
                                                <div className="flex gap-2 mt-1">
                                                    <code className="flex-1 p-3 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-600 text-sm font-mono text-slate-800 dark:text-slate-200">{generatedCreds.email}</code>
                                                    <button onClick={() => copyToClipboard(generatedCreds.email)} className="p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><Copy size={16}/></button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Senha Provisória</label>
                                                <div className="flex gap-2 mt-1">
                                                    <code className="flex-1 p-3 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-600 text-sm font-mono text-slate-800 dark:text-slate-200">{generatedCreds.password}</code>
                                                    <button onClick={() => copyToClipboard(generatedCreds.password)} className="p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><Copy size={16}/></button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* SHARE BUTTONS */}
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={handleShareWhatsApp}
                                                className="flex-1 bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
                                            >
                                                <MessageCircle size={18}/> Enviar por WhatsApp
                                            </button>
                                            <button 
                                                onClick={handleCopyInvite}
                                                className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
                                            >
                                                <Copy size={18}/> Copiar Convite
                                            </button>
                                        </div>
                                        
                                        <p className="text-xs text-slate-400 text-center">
                                            Recomendamos que o cliente altere a senha no primeiro acesso.
                                        </p>
                                        
                                        <button 
                                            onClick={() => setGeneratedCreds(null)}
                                            className="w-full text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline text-center"
                                        >
                                            Fechar e ver status
                                        </button>
                                    </div>
                                ) : portalUser ? (
                                    <div className="space-y-6">
                                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle size={32} />
                                            </div>
                                            <h3 className="text-lg font-bold text-green-900 dark:text-green-200">Acesso Ativo</h3>
                                            <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                                                O usuário <strong>{portalUser.email}</strong> já tem acesso ao portal deste cliente.
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Último Acesso</p>
                                                <p className="text-sm font-mono mt-1 text-slate-800 dark:text-slate-200">Nunca</p>
                                            </div>
                                            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Perfil</p>
                                                <p className="text-sm font-mono mt-1 text-slate-800 dark:text-slate-200">Cliente (Somente Leitura)</p>
                                            </div>
                                        </div>

                                        <button disabled className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold rounded-lg border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                                            Redefinir Senha (Em breve)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 max-w-md mx-auto w-full">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Globe size={32} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Convidar para o Portal</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                                                Crie um acesso exclusivo para que <strong>{client.name}</strong> possa visualizar faturas, propostas e abrir chamados.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email de Acesso</label>
                                                <input 
                                                    type="email" 
                                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    value={portalEmail}
                                                    onChange={(e) => setPortalEmail(e.target.value)}
                                                    placeholder="email@cliente.com"
                                                />
                                            </div>
                                            
                                            <button 
                                                onClick={handleGenerateAccess}
                                                disabled={isGeneratingAccess || !portalEmail}
                                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isGeneratingAccess ? 'Gerando...' : <><Key size={18}/> Gerar Acesso</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 min-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText size={20} className="text-slate-400"/> Documentos do Cliente
                                </h3>
                                <button onClick={handleFileUpload} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                                    <Upload size={16}/> Upload Arquivo
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {clientDocs.map(doc => (
                                    <div key={doc.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 transition group bg-white dark:bg-slate-800 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 p-3 rounded-lg">
                                                <FileText size={24}/>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{doc.title}</p>
                                                <p className="text-xs text-slate-500">{new Date(doc.uploadDate).toLocaleDateString()} • {doc.size}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Download size={18}/></button>
                                            <button onClick={() => removeClientDocument(currentUser!, doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                ))}
                                {clientDocs.length === 0 && (
                                    <div className="col-span-2 py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                                        <Paperclip size={48} className="mx-auto text-slate-300 mb-2"/>
                                        <p className="text-slate-500 font-medium">Nenhum documento anexado.</p>
                                        <p className="text-xs text-slate-400">Arraste arquivos ou clique em Upload.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Reuse Financial and Support Tabs */}
                    {activeTab === 'financial' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-50 dark:text-slate-400 uppercase text-xs">
                                    <tr><th className="p-4">ID</th><th className="p-4">Descrição</th><th className="p-4">Vencimento</th><th className="p-4">Valor</th><th className="p-4">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {clientInvoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{inv.id}</td>
                                            <td className="p-4 text-slate-800 dark:text-white font-medium">{inv.description}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                            <td className="p-4 text-slate-800 dark:text-white">R$ {inv.amount.toLocaleString()}</td>
                                            <td className="p-4"><Badge color={inv.status === InvoiceStatus.PAID ? 'green' : 'red'}>{inv.status}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="grid gap-4">
                            {clientTickets.map(ticket => (
                                <div key={ticket.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg text-indigo-600 dark:text-indigo-400 h-fit"><MessageSquare size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{ticket.subject}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{ticket.description}</p>
                                        </div>
                                    </div>
                                    <Badge>{ticket.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* INTERACTION MODAL */}
                {showInteractionModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fade-in backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CalendarCheck size={20} className="text-blue-600"/> Nova Interação
                                </h3>
                                <button onClick={() => setShowInteractionModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                            </div>
                            <form onSubmit={handleRegisterInteraction} className="p-6 space-y-4">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Registrar este contato atualizará automaticamente a data de "Último Contato" do cliente, renovando o prazo de inatividade.</p>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Contato</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Visit', 'Call', 'Meeting', 'Email'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setInteractionForm({...interactionForm, type: type as any})}
                                                className={`py-2 text-sm rounded-lg border font-medium transition ${interactionForm.type === type ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                            >
                                                {type === 'Visit' ? 'Visita Presencial' : type === 'Call' ? 'Ligação / Whats' : type === 'Meeting' ? 'Reunião Online' : 'Email'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Notas da Interação</label>
                                    <textarea 
                                        required
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        placeholder="Descreva o que foi tratado..."
                                        value={interactionForm.notes}
                                        onChange={e => setInteractionForm({...interactionForm, notes: e.target.value})}
                                    />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                                    <Save size={18}/> Salvar e Atualizar Data
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
