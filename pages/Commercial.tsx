
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lead, LeadStatus, Activity } from '../types';
import { 
    Users, Plus, Search, MessageCircle, Mail, 
    Archive, Trash2, Edit2, Phone, X, 
    CheckCircle, AlertCircle, Loader2, Send, Server, History, Calendar, FileText
} from 'lucide-react';
import { Badge } from '../components/Widgets';
import { sendBridgeWhatsApp } from '../services/bridgeService';
import { sendEmail } from '../services/emailService';

export const Commercial: React.FC = () => {
    const { 
        leads, updateLead, updateLeadStatus, addLead, addActivity, addSystemNotification, 
        activities, inboxConversations, addInboxInteraction 
    } = useData();
    const { currentUser } = useAuth();

    // View & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All');

    // Modals State
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
    
    // Detail Modal State
    const [detailLead, setDetailLead] = useState<Lead | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'note' | 'whatsapp' | 'email'>('note');
    
    // Actions Data State
    const [noteContent, setNoteContent] = useState('');
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [useBridge, setUseBridge] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // New Lead Form
    const [newLeadForm, setNewLeadForm] = useState<Partial<Lead>>({ status: LeadStatus.NEW, source: 'Manual' });

    // Drag & Drop
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    // Filter Leads
    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  l.company.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [leads, searchTerm, filterStatus]);

    // Timeline History Logic (Activities + Inbox Messages)
    const leadHistory = useMemo(() => {
        if (!detailLead) return [];

        // 1. Activities related to this lead
        const relatedActivities = activities.filter(a => a.relatedTo === detailLead.name).map(a => ({
            id: a.id,
            type: 'activity',
            subtype: a.type,
            title: a.title,
            description: a.description,
            date: a.dueDate,
            author: a.assignee
        }));

        // 2. Inbox Conversations related to this lead (by name)
        const conversations = inboxConversations.filter(c => c.contactName === detailLead.name);
        const messages = conversations.flatMap(c => c.messages.map(m => ({
            id: m.id,
            type: 'message',
            subtype: c.type, // WhatsApp, Email
            title: c.type === 'WhatsApp' ? 'Mensagem WhatsApp' : 'E-mail',
            description: m.text,
            date: m.timestamp,
            author: m.sender === 'agent' ? 'Você' : detailLead.name
        })));

        // Merge and Sort
        return [...relatedActivities, ...messages].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [detailLead, activities, inboxConversations]);

    const columns = [
        { id: LeadStatus.NEW, label: 'Novo', color: 'border-blue-500' },
        { id: LeadStatus.QUALIFIED, label: 'Qualificado', color: 'border-indigo-500' },
        { id: LeadStatus.PROPOSAL, label: 'Proposta', color: 'border-purple-500' },
        { id: LeadStatus.NEGOTIATION, label: 'Negociação', color: 'border-orange-500' },
        { id: LeadStatus.CLOSED_WON, label: 'Ganho', color: 'border-green-500' }
    ];

    // --- HANDLERS ---

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedLeadId(id);
        e.dataTransfer.setData('leadId', id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
            updateLeadStatus(currentUser, leadId, status);
        }
        setDraggedLeadId(null);
    };

    const handleCardClick = (lead: Lead) => {
        setDetailLead(lead);
        setActiveDetailTab('note');
    };

    const handleAddNote = () => {
        if (!detailLead || !noteContent.trim()) return;
        addActivity(currentUser, {
            id: `NOTE-${Date.now()}`,
            title: 'Nota Rápida',
            type: 'Task',
            dueDate: new Date().toISOString(),
            completed: true,
            relatedTo: detailLead.name,
            assignee: currentUser?.id || 'user',
            description: noteContent
        });
        setNoteContent('');
        addSystemNotification('Nota Adicionada', 'Anotação salva no histórico.', 'success');
    };

    const handleSendWhatsApp = async () => {
        if (!detailLead || !whatsAppMessage.trim()) return;
        setIsSending(true);
        try {
            const phone = detailLead.phone || '';
            if (useBridge) {
                await sendBridgeWhatsApp(phone, whatsAppMessage);
            } else {
                window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`, '_blank');
            }

            // Save Activity
            addActivity(currentUser, {
                id: `ACT-WA-${Date.now()}`,
                title: 'WhatsApp Enviado',
                type: 'Call', // Using Call type as generic for communication
                dueDate: new Date().toISOString(),
                completed: true,
                relatedTo: detailLead.name,
                assignee: currentUser?.id || 'system',
                description: whatsAppMessage
            });

            // Save to Inbox (Sync)
            addInboxInteraction(detailLead.name, 'WhatsApp', whatsAppMessage, detailLead.phone);

            addSystemNotification('WhatsApp Enviado', 'Mensagem registrada e sincronizada com o Inbox.', 'success');
            setWhatsAppMessage('');
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar WhatsApp.");
        } finally {
            setIsSending(false);
        }
    };

    const handleSendEmail = async () => {
        if (!detailLead || !emailSubject.trim() || !emailBody.trim()) return;
        setIsSending(true);
        try {
            if (useBridge) {
                // Local Bridge (SMTP) currently doesn't export sendBridgeEmail directly in this context without import, assuming service availability
                // For this implementation, we assume sendEmail handles the abstraction or we import bridge service
                // Just calling generic sendEmail service which handles both modes now based on implementation
                await sendEmail(detailLead.name, detailLead.email, emailSubject, emailBody, currentUser?.name || 'Vendedor');
            } else {
                await sendEmail(detailLead.name, detailLead.email, emailSubject, emailBody, currentUser?.name || 'Vendedor');
            }

            // Save Activity
            addActivity(currentUser, {
                id: `ACT-EMAIL-${Date.now()}`,
                title: `Email: ${emailSubject}`,
                type: 'Email',
                dueDate: new Date().toISOString(),
                completed: true,
                relatedTo: detailLead.name,
                assignee: currentUser?.id || 'system',
                description: emailBody
            });

            // Save to Inbox (Sync)
            addInboxInteraction(detailLead.name, 'Email', `[Assunto: ${emailSubject}] ${emailBody}`, detailLead.email);

            addSystemNotification('Email Enviado', 'E-mail registrado e sincronizado com o Inbox.', 'success');
            setEmailSubject('');
            setEmailBody('');
        } catch (error: any) {
            alert(`Erro ao enviar email: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveNewLead = () => {
        if (newLeadForm.name && newLeadForm.company) {
            const lead: Lead = {
                id: `L-${Date.now()}`,
                name: newLeadForm.name,
                company: newLeadForm.company,
                email: newLeadForm.email || '',
                phone: newLeadForm.phone || '',
                value: newLeadForm.value || 0,
                status: LeadStatus.NEW,
                source: newLeadForm.source || 'Manual',
                probability: 10,
                createdAt: new Date().toISOString(),
                lastContact: new Date().toISOString(),
                ...newLeadForm
            } as Lead;
            addLead(currentUser, lead);
            setIsNewLeadOpen(false);
            setNewLeadForm({ status: LeadStatus.NEW, source: 'Manual' });
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-600"/> Gestão Comercial
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Pipeline de vendas e CRM.</p>
                </div>
                <button onClick={() => setIsNewLeadOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                    <Plus size={18}/> Novo Lead
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-max">
                    {columns.map(col => (
                        <div 
                            key={col.id} 
                            className={`w-80 flex flex-col bg-slate-100 dark:bg-slate-800 rounded-xl border-t-4 ${col.color} transition-colors`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-slate-700 dark:text-slate-200">
                                {col.label}
                                <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded text-xs">{filteredLeads.filter(l => l.status === col.id).length}</span>
                            </div>
                            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                {filteredLeads.filter(l => l.status === col.id).map(lead => (
                                    <div 
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead.id)}
                                        onClick={() => handleCardClick(lead)}
                                        className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-md cursor-pointer group relative hover:border-blue-400 transition"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-white">{lead.company}</h4>
                                            <div className="opacity-0 group-hover:opacity-100 transition text-blue-500">
                                                <Edit2 size={14}/>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{lead.name}</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">R$ {lead.value.toLocaleString()}</p>
                                        
                                        {lead.lastContact && (
                                            <p className="text-[10px] text-slate-400 mt-2 text-right">
                                                {new Date(lead.lastContact).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* NEW LEAD MODAL */}
            {isNewLeadOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">Novo Lead</h3>
                            <button onClick={() => setIsNewLeadOpen(false)}><X className="text-slate-400"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input type="text" placeholder="Nome do Contato" className="w-full border rounded p-2 bg-white dark:bg-slate-700 dark:text-white" value={newLeadForm.name || ''} onChange={e => setNewLeadForm({...newLeadForm, name: e.target.value})} />
                            <input type="text" placeholder="Empresa" className="w-full border rounded p-2 bg-white dark:bg-slate-700 dark:text-white" value={newLeadForm.company || ''} onChange={e => setNewLeadForm({...newLeadForm, company: e.target.value})} />
                            <input type="email" placeholder="Email" className="w-full border rounded p-2 bg-white dark:bg-slate-700 dark:text-white" value={newLeadForm.email || ''} onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})} />
                            <input type="text" placeholder="Telefone" className="w-full border rounded p-2 bg-white dark:bg-slate-700 dark:text-white" value={newLeadForm.phone || ''} onChange={e => setNewLeadForm({...newLeadForm, phone: e.target.value})} />
                            <input type="number" placeholder="Valor Estimado (R$)" className="w-full border rounded p-2 bg-white dark:bg-slate-700 dark:text-white" value={newLeadForm.value || ''} onChange={e => setNewLeadForm({...newLeadForm, value: parseFloat(e.target.value)})} />
                            <button onClick={handleSaveNewLead} className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Salvar Lead</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL & ACTION MODAL (UNIFIED) */}
            {detailLead && createPortal(
                <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-[9000] p-0 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{detailLead.name}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">{detailLead.company} • <span className="font-mono text-xs">{detailLead.email}</span></p>
                                <div className="flex gap-2 mt-2">
                                    <Badge color="blue">{detailLead.status}</Badge>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">R$ {detailLead.value.toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={() => setDetailLead(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"><X size={24}/></button>
                        </div>

                        {/* Two Columns Layout */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left: Timeline History */}
                            <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <History size={14}/> Histórico de Interações
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                                    {leadHistory.length === 0 ? (
                                        <div className="text-center text-slate-400 text-xs mt-10">Nenhuma interação registrada.</div>
                                    ) : (
                                        leadHistory.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 relative">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 
                                                        ${item.subtype === 'WhatsApp' ? 'bg-green-100 text-green-600' : 
                                                          item.subtype === 'Email' ? 'bg-blue-100 text-blue-600' : 
                                                          'bg-slate-200 text-slate-600'}`}
                                                    >
                                                        {item.subtype === 'WhatsApp' ? <MessageCircle size={14}/> : item.subtype === 'Email' ? <Mail size={14}/> : <FileText size={14}/>}
                                                    </div>
                                                    {idx !== leadHistory.length - 1 && <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 my-1"></div>}
                                                </div>
                                                <div className="pb-4">
                                                    <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(item.date).toLocaleString()} • {item.author}</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{item.title}</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700">{item.description}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right: Actions Panel */}
                            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900 flex flex-col shrink-0 border-t md:border-t-0">
                                {/* Tabs */}
                                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                                    <button onClick={() => setActiveDetailTab('note')} className={`flex-1 py-3 text-xs font-bold uppercase transition ${activeDetailTab === 'note' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500'}`}>Nota</button>
                                    <button onClick={() => setActiveDetailTab('whatsapp')} className={`flex-1 py-3 text-xs font-bold uppercase transition ${activeDetailTab === 'whatsapp' ? 'border-b-2 border-green-500 text-green-600' : 'text-slate-500'}`}>WhatsApp</button>
                                    <button onClick={() => setActiveDetailTab('email')} className={`flex-1 py-3 text-xs font-bold uppercase transition ${activeDetailTab === 'email' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-500'}`}>E-mail</button>
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto">
                                    {activeDetailTab === 'note' && (
                                        <div className="flex flex-col h-full">
                                            <textarea 
                                                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-3"
                                                placeholder="Adicionar nota interna..."
                                                value={noteContent}
                                                onChange={e => setNoteContent(e.target.value)}
                                            />
                                            <button onClick={handleAddNote} disabled={!noteContent.trim()} className="bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50">Salvar Nota</button>
                                        </div>
                                    )}

                                    {activeDetailTab === 'whatsapp' && (
                                        <div className="flex flex-col h-full space-y-3">
                                            <div className="flex items-center justify-between bg-slate-200 dark:bg-slate-800 p-2 rounded text-xs cursor-pointer" onClick={() => setUseBridge(!useBridge)}>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                    <Server size={14}/> Usar Bridge
                                                </div>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useBridge ? 'bg-green-500' : 'bg-slate-400'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${useBridge ? 'translate-x-4' : 'translate-x-0'}`}></div></div>
                                            </div>
                                            <textarea 
                                                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                placeholder="Mensagem WhatsApp..."
                                                value={whatsAppMessage}
                                                onChange={e => setWhatsAppMessage(e.target.value)}
                                            />
                                            <button onClick={handleSendWhatsApp} disabled={isSending || !whatsAppMessage.trim()} className="bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50 flex justify-center items-center gap-2">
                                                {isSending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Enviar Whats
                                            </button>
                                        </div>
                                    )}

                                    {activeDetailTab === 'email' && (
                                        <div className="flex flex-col h-full space-y-3">
                                            <input 
                                                type="text" 
                                                placeholder="Assunto"
                                                className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                                value={emailSubject}
                                                onChange={e => setEmailSubject(e.target.value)}
                                            />
                                            <textarea 
                                                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                placeholder="Corpo do e-mail..."
                                                value={emailBody}
                                                onChange={e => setEmailBody(e.target.value)}
                                            />
                                            <button onClick={handleSendEmail} disabled={isSending || !emailBody.trim() || !emailSubject.trim()} className="bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700 transition shadow-sm disabled:opacity-50 flex justify-center items-center gap-2">
                                                {isSending ? <Loader2 size={16} className="animate-spin"/> : <Mail size={16}/>} Enviar E-mail
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
