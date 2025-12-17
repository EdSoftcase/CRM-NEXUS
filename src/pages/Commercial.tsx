
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lead, LeadStatus } from '../types';
import { 
    Users, Plus, Search, Filter, MessageCircle, Mail, 
    MoreVertical, Archive, Trash2, Edit2, Phone, X, 
    CheckCircle, AlertCircle, Loader2, Send, Server 
} from 'lucide-react';
import { Badge } from '../components/Widgets';
import { SendEmailModal } from '../components/SendEmailModal';
import { sendBridgeWhatsApp } from '../services/bridgeService';

// WhatsApp Templates
const whatsappTemplates = [
    { label: 'Saudação', text: 'Olá [Nome], tudo bem? Sou da [Sua Empresa].' },
    { label: 'Follow-up', text: 'Olá [Nome], gostaria de saber se conseguiu avaliar nossa proposta.' },
    { label: 'Agendamento', text: 'Oi [Nome], podemos agendar uma reunião para apresentar nossa solução?' }
];

export const Commercial: React.FC = () => {
    const { leads, updateLead, updateLeadStatus, addLead, addActivity, addSystemNotification } = useData();
    const { currentUser } = useAuth();

    // View & Filter State
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All');

    // Modals State
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Selection State
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [emailLead, setEmailLead] = useState<Lead | null>(null);

    // Action Data State
    const [cancelReason, setCancelReason] = useState('');
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [useBridgeWhatsApp, setUseBridgeWhatsApp] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

    // New Lead Form
    const [newLeadForm, setNewLeadForm] = useState<Partial<Lead>>({ status: LeadStatus.NEW, source: 'Manual' });

    // Drag & Drop
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    // ... Helper functions ...
    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  l.company.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [leads, searchTerm, filterStatus]);

    const columns = [
        { id: LeadStatus.NEW, label: 'Novo', color: 'border-blue-500' },
        { id: LeadStatus.QUALIFIED, label: 'Qualificado', color: 'border-indigo-500' },
        { id: LeadStatus.PROPOSAL, label: 'Proposta', color: 'border-purple-500' },
        { id: LeadStatus.NEGOTIATION, label: 'Negociação', color: 'border-orange-500' },
        { id: LeadStatus.CLOSED_WON, label: 'Ganho', color: 'border-green-500' }
    ];

    // Handlers
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

    const openWhatsApp = (lead: Lead) => {
        setSelectedLead(lead);
        setWhatsAppMessage('');
        setShowWhatsAppModal(true);
    };

    const handleSendWhatsApp = async () => {
        if (!selectedLead || !whatsAppMessage) return;
        setSendingWhatsApp(true);
        try {
            if (useBridgeWhatsApp) {
                await sendBridgeWhatsApp(selectedLead.phone || '', whatsAppMessage);
                addSystemNotification('WhatsApp Enviado', `Mensagem enviada para ${selectedLead.name} via Bridge.`, 'success');
            } else {
                const url = `https://wa.me/${selectedLead.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`;
                window.open(url, '_blank');
            }
            setShowWhatsAppModal(false);
            // Log activity
            addActivity(currentUser, {
                id: `ACT-WA-${Date.now()}`,
                title: 'WhatsApp Enviado',
                type: 'Call', 
                dueDate: new Date().toISOString(),
                completed: true,
                relatedTo: selectedLead.name,
                assignee: currentUser?.id || 'system',
                description: whatsAppMessage
            });
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar WhatsApp.");
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const toggleBridgeWhatsApp = () => setUseBridgeWhatsApp(!useBridgeWhatsApp);

    const openEmail = (lead: Lead) => {
        setEmailLead(lead);
        setIsEmailModalOpen(true);
    };

    const handleEmailSuccess = (msg: string) => {
        addSystemNotification('Email Enviado', msg, 'success');
        if (emailLead) {
             addActivity(currentUser, {
                id: `ACT-EMAIL-${Date.now()}`,
                title: 'Email Enviado',
                type: 'Email',
                dueDate: new Date().toISOString(),
                completed: true,
                relatedTo: emailLead.name,
                assignee: currentUser?.id || 'system',
                description: msg
            });
        }
    };

    const openCancelModal = (lead: Lead) => {
        setSelectedLead(lead);
        setCancelReason('');
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = () => {
        if (selectedLead && cancelReason) {
            updateLead(currentUser, { 
                ...selectedLead, 
                status: LeadStatus.CLOSED_LOST, 
                lostReason: cancelReason
            });
             addActivity(currentUser, {
                id: `ACT-LOST-${Date.now()}`,
                title: 'Lead Perdido/Cancelado',
                type: 'Task',
                dueDate: new Date().toISOString(),
                completed: true,
                relatedTo: selectedLead.name,
                assignee: currentUser?.id || 'system',
                description: `Motivo: ${cancelReason}`
            });
            setIsCancelModalOpen(false);
            setSelectedLead(null);
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
                                        className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-md cursor-grab active:cursor-grabbing group relative"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-white">{lead.company}</h4>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => openWhatsApp(lead)} className="p-1 text-slate-400 hover:text-green-500" title="WhatsApp"><MessageCircle size={14}/></button>
                                                <button onClick={() => openEmail(lead)} className="p-1 text-slate-400 hover:text-blue-500" title="Email"><Mail size={14}/></button>
                                                <button onClick={() => openCancelModal(lead)} className="p-1 text-slate-400 hover:text-red-500" title="Arquivar/Cancelar"><Archive size={14}/></button>
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

            {/* Cancel Modal */}
            {isCancelModalOpen && selectedLead && createPortal(
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border-t-4 border-amber-500">
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full text-amber-600 dark:text-amber-400 shrink-0"><Archive size={28} /></div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cancelar Lead</h2>
                                    <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">O lead será arquivado para contato futuro.</p>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Justificativa <span className="text-red-500">*</span></label>
                                <textarea 
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                    placeholder="Por que este lead está sendo cancelado agora? (ex: Sem budget no momento, projeto adiado)"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setIsCancelModalOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancelar</button>
                                <button onClick={handleConfirmCancel} className="px-6 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition shadow-sm">Confirmar Cancelamento</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* WhatsApp Modal */}
            {showWhatsAppModal && selectedLead && createPortal(
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageCircle size={20} className="text-green-600 dark:text-green-400"/> Enviar WhatsApp</h2>
                            <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Para: <strong>{selectedLead.name}</strong> ({selectedLead.phone})</p>
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer" onClick={toggleBridgeWhatsApp}>
                                <div className="flex items-center gap-2"><Server size={16} className={useBridgeWhatsApp ? 'text-green-600' : 'text-slate-400'}/><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar Nexus Bridge (Automático)</span></div>
                                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${useBridgeWhatsApp ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${useBridgeWhatsApp ? 'translate-x-5' : 'translate-x-0'}`}></div></div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Mensagem</label><textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)}/></div>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">{whatsappTemplates.map((tmpl, idx) => (<button key={idx} onClick={() => { const text = tmpl.text.replace('[Nome]', selectedLead.name.split(' ')[0]).replace('[Empresa]', selectedLead.company); setWhatsAppMessage(text); }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap border border-slate-200 dark:border-slate-600 transition">{tmpl.label}</button>))}</div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowWhatsAppModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancelar</button>
                            <button onClick={handleSendWhatsApp} disabled={sendingWhatsApp} className="px-6 py-2 rounded-lg bg-[#25D366] text-white font-bold hover:bg-[#128C7E] shadow-md transition flex items-center gap-2 disabled:opacity-70">{sendingWhatsApp ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}{sendingWhatsApp ? 'Enviando...' : 'Enviar'}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isEmailModalOpen && emailLead && createPortal(
                <SendEmailModal lead={emailLead} onClose={() => setIsEmailModalOpen(false)} onSuccess={handleEmailSuccess}/>,
                document.body
            )}
        </div>
    );
};
