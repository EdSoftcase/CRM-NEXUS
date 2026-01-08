
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lead, LeadStatus } from '../types';
import { 
    Users, Plus, Search, MessageCircle, Mail, 
    Trash2, Edit2, X, Loader2, Send, Server, User
} from 'lucide-react';
import { sendBridgeWhatsApp } from '../services/bridgeService';
import { SendEmailModal } from '../components/SendEmailModal';

export const Commercial: React.FC = () => {
    const { leads = [], updateLead, updateLeadStatus, addLead, addActivity, addSystemNotification, addInboxInteraction } = useData();
    const { currentUser } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [emailLead, setEmailLead] = useState<Lead | null>(null);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [leadForm, setLeadForm] = useState<Partial<Lead>>({ name: '', company: '', email: '', phone: '', value: 0 });

    const filteredLeads = useMemo(() => {
        const safeLeads = Array.isArray(leads) ? leads : [];
        return safeLeads.filter(l => {
            if (!l) return false;
            return (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   (l.company || '').toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [leads, searchTerm]);

    const columns = [
        { id: LeadStatus.NEW, label: 'Novo', color: 'border-blue-500' },
        { id: LeadStatus.QUALIFIED, label: 'Qualificado', color: 'border-indigo-500' },
        { id: LeadStatus.PROPOSAL, label: 'Proposta', color: 'border-purple-500' },
        { id: LeadStatus.NEGOTIATION, label: 'Negociação', color: 'border-orange-500' },
        { id: LeadStatus.CLOSED_WON, label: 'Ganho', color: 'border-green-500' }
    ];

    const handleSendWhatsApp = async () => {
        if (!selectedLead || !whatsAppMessage) return;
        setSendingWhatsApp(true);
        try {
            const url = `https://wa.me/${(selectedLead.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`;
            window.open(url, '_blank');
            setShowWhatsAppModal(false);
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
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const handleSaveLead = () => {
        if (!leadForm.name || !leadForm.company) return;

        if (editingLead) {
            updateLead(currentUser, { ...editingLead, ...leadForm } as Lead);
        } else {
            addLead(currentUser, {
                id: `L-${Date.now()}`,
                ...leadForm,
                status: LeadStatus.NEW,
                source: 'Manual',
                createdAt: new Date().toISOString(),
                lastContact: new Date().toISOString()
            } as Lead);
        }
        setIsNewLeadOpen(false);
        setEditingLead(null);
        setLeadForm({ name: '', company: '', email: '', phone: '', value: 0 });
    };

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="text-blue-600"/> Gestão Comercial
                    </h1>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => { setEditingLead(null); setLeadForm({name:'', company:'', email:'', phone:'', value:0}); setIsNewLeadOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
                        Novo Lead
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-4 h-full min-w-max">
                    {columns.map(col => (
                        <div key={col.id} className={`w-80 flex flex-col bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border-t-4 ${col.color}`}>
                            <div className="p-4 font-bold text-slate-700 dark:text-white flex justify-between items-center">
                                {col.label}
                                <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">
                                    {filteredLeads.filter(l => l.status === col.id).length}
                                </span>
                            </div>
                            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                {filteredLeads.filter(l => l.status === col.id).map(lead => (
                                    <div key={lead.id} className="bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 dark:text-white truncate">{lead.company}</h4>
                                            <div className="flex gap-1">
                                                <button onClick={() => { setSelectedLead(lead); setEditingLead(lead); setLeadForm(lead); setIsNewLeadOpen(true); }} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                                <button onClick={() => { setSelectedLead(lead); setWhatsAppMessage(''); setShowWhatsAppModal(true); }} className="p-1 text-slate-400 hover:text-green-500"><MessageCircle size={14}/></button>
                                                <button onClick={() => { setEmailLead(lead); setIsEmailModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-500"><Mail size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{lead.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODALS RENDERING DIRECTLY FOR REACT 18 STABILITY */}
            {isNewLeadOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="font-bold text-xl">{editingLead ? 'Editar Lead' : 'Novo Lead'}</h3>
                            <button onClick={() => setIsNewLeadOpen(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input type="text" placeholder="Nome" className="w-full border rounded-xl p-3 bg-slate-50 dark:bg-slate-700" value={leadForm.name || ''} onChange={e => setLeadForm({...leadForm, name: e.target.value})} />
                            <input type="text" placeholder="Empresa" className="w-full border rounded-xl p-3 bg-slate-50 dark:bg-slate-700" value={leadForm.company || ''} onChange={e => setLeadForm({...leadForm, company: e.target.value})} />
                            <input type="email" placeholder="Email" className="w-full border rounded-xl p-3 bg-slate-50 dark:bg-slate-700" value={leadForm.email || ''} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                            <input type="text" placeholder="Telefone" className="w-full border rounded-xl p-3 bg-slate-50 dark:bg-slate-700" value={leadForm.phone || ''} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} />
                            <button onClick={handleSaveLead} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {showWhatsAppModal && selectedLead && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold flex items-center gap-2"><MessageCircle size={20} className="text-green-600"/> Enviar WhatsApp</h2>
                            <button onClick={() => setShowWhatsAppModal(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea 
                                className="w-full border rounded-xl p-3 h-32 resize-none outline-none text-sm bg-white dark:bg-slate-700" 
                                value={whatsAppMessage} 
                                onChange={(e) => setWhatsAppMessage(e.target.value)} 
                                placeholder="Digite sua mensagem..."
                            />
                            <button onClick={handleSendWhatsApp} disabled={sendingWhatsApp} className="w-full bg-[#25D366] text-white font-black py-3 rounded-xl">
                                {sendingWhatsApp ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEmailModalOpen && emailLead && (
                <SendEmailModal lead={emailLead} onClose={() => setIsEmailModalOpen(false)} onSuccess={() => addSystemNotification('Sucesso', 'Email enviado', 'success')} />
            )}
        </div>
    );
};
