
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lead, LeadStatus } from '../types';
import { extractLeadFromImage } from '../services/geminiService';
import { 
    Users, Plus, Search, MessageCircle, Mail, 
    X, User, Sparkles, Phone, ChevronRight, 
    Target, Save, SortAsc, Calendar, AlignLeft, Loader2, Camera, Upload, Send
} from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';
import { SendEmailModal } from '../components/SendEmailModal';
import { sendBridgeWhatsApp } from '../services/bridgeService';

type SortOption = 'date_desc' | 'date_asc' | 'name_asc';

export const Commercial: React.FC = () => {
    const { leads = [], updateLead, updateLeadStatus, addLead, addActivity, addSystemNotification, activities, logs } = useData();
    const { currentUser } = useAuth();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date_desc');
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isVisionLoading, setIsVisionLoading] = useState(false);
    
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [leadForm, setLeadForm] = useState<Partial<Lead>>({ name: '', company: '', email: '', phone: '', value: 0, description: '' });

    const filteredLeads = useMemo(() => {
        const safeLeads = Array.isArray(leads) ? [...leads] : [];
        
        let result = safeLeads.filter(l => {
            if (!l) return false;
            return (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   (l.company || '').toLowerCase().includes(searchTerm.toLowerCase());
        });

        result.sort((a, b) => {
            if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === 'name_asc') return (a.company || '').localeCompare(b.company || '');
            return 0;
        });

        return result;
    }, [leads, searchTerm, sortBy]);

    const columns = [
        { id: LeadStatus.NEW, label: 'Novo', color: 'border-blue-500' },
        { id: LeadStatus.QUALIFIED, label: 'Qualificado', color: 'border-indigo-500' },
        { id: LeadStatus.PROPOSAL, label: 'Proposta', color: 'border-purple-500' },
        { id: LeadStatus.NEGOTIATION, label: 'Negociação', color: 'border-orange-500' },
        { id: LeadStatus.CLOSED_WON, label: 'Ganho', color: 'border-green-500' }
    ];

    const handleDragStart = (e: React.DragEvent, id: string) => {
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
    };

    const handleSaveLead = async () => {
        if (!leadForm.name || !leadForm.company) {
            addSystemNotification("Campos Vazios", "Nome e Empresa são obrigatórios.", "warning");
            return;
        }

        setIsSaving(true);
        try {
            if (selectedLead && !isNewLeadOpen) {
                const updatedLead = { ...selectedLead, ...leadForm } as Lead;
                await updateLead(currentUser, updatedLead);
                addSystemNotification("Sucesso", "Dados do lead atualizados.", "success");
            } else {
                const newLead = {
                    id: `L-${Date.now()}`,
                    ...leadForm,
                    status: LeadStatus.NEW,
                    source: leadForm.source || 'Manual',
                    createdAt: new Date().toISOString(),
                    lastContact: new Date().toISOString(),
                    organizationId: currentUser?.organizationId || 'org-1'
                } as Lead;
                await addLead(currentUser, newLead);
                addSystemNotification("Sucesso", "Novo lead cadastrado.", "success");
            }
            setIsNewLeadOpen(false);
            setSelectedLead(null);
        } catch (error: any) {
            addSystemNotification("Erro ao Salvar", "Não foi possível sincronizar com o banco.", "alert");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleVisionImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsVisionLoading(true);
        addSystemNotification("Lead Vision", "A IA está analisando a imagem...", "info");

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;
            try {
                const data = await extractLeadFromImage(base64);
                setLeadForm({
                    ...leadForm,
                    ...data,
                    source: 'Lead Vision IA'
                });
                setIsNewLeadOpen(true);
                addSystemNotification("Sucesso", "Dados extraídos com sucesso!", "success");
            } catch (err) {
                addSystemNotification("Erro Vision", "Não foi possível ler a imagem.", "alert");
            } finally {
                setIsVisionLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
    };

    // Fix: Added handleSendWhatsApp function to resolve "Cannot find name" error.
    const handleSendWhatsApp = async () => {
        if (!selectedLead || !whatsAppMessage) return;
        setSendingWhatsApp(true);
        try {
            // Tentativa via Nexus Bridge
            await sendBridgeWhatsApp(selectedLead.phone || '', whatsAppMessage);
            addSystemNotification('WhatsApp Enviado', `Mensagem enviada para ${selectedLead.name} via Bridge.`, 'success');
            
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
            setShowWhatsAppModal(false);
        } catch (error) {
            console.warn("Bridge offline, falling back to wa.me link", error);
            const url = `https://wa.me/${selectedLead.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`;
            window.open(url, '_blank');
            setShowWhatsAppModal(false);
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const leadTimeline = useMemo(() => {
        if (!selectedLead) return [];
        const leadName = (selectedLead.name || '').toUpperCase();
        const companyName = (selectedLead.company || '').toUpperCase();

        const filteredActs = activities.filter(a => 
            (a.relatedTo || '').toUpperCase() === leadName || 
            (a.relatedTo || '').toUpperCase() === companyName
        );

        const filteredLogs = logs.filter(l => 
            (l.details || '').toUpperCase().includes(leadName) ||
            (l.details || '').toUpperCase().includes(companyName)
        );

        return [
            ...filteredActs.map(a => ({ id: a.id, date: a.dueDate, title: a.title, type: 'Activity', desc: a.description })),
            ...filteredLogs.map(l => ({ id: l.id, date: l.timestamp, title: l.action, type: 'Log', desc: l.details }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedLead, activities, logs]);

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <Target className="text-blue-600" size={32}/> Pipeline de Vendas
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Gestão de {filteredLeads.length} oportunidades ativas.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleVisionImport} 
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isVisionLoading}
                        className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isVisionLoading ? <Loader2 size={16} className="animate-spin"/> : <Camera size={16}/>}
                        {isVisionLoading ? 'Analisando...' : 'Lead Vision'}
                    </button>

                    <div className="flex bg-white dark:bg-slate-800 rounded-xl border p-1 shadow-sm">
                        <button 
                            onClick={() => setSortBy('date_desc')}
                            className={`p-2 rounded-lg transition-all ${sortBy === 'date_desc' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600' : 'text-slate-400'}`}
                            title="Mais recentes primeiro"
                        >
                            <Calendar size={18}/>
                        </button>
                        <button 
                            onClick={() => setSortBy('name_asc')}
                            className={`p-2 rounded-lg transition-all ${sortBy === 'name_asc' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600' : 'text-slate-400'}`}
                            title="Ordem Alfabética"
                        >
                            <SortAsc size={18}/>
                        </button>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => { setSelectedLead(null); setLeadForm({name:'', company:'', email:'', phone:'', value:0, description: ''}); setIsNewLeadOpen(true); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition transform active:scale-95">
                        Novo Lead
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex gap-5 h-full min-w-max">
                    {columns.map(col => (
                        <div 
                            key={col.id} 
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className={`w-80 flex flex-col bg-slate-100/50 dark:bg-slate-800/50 rounded-[2.5rem] border-t-8 ${col.color} transition-all`}
                        >
                            <div className="p-5 font-black text-slate-800 dark:text-white uppercase text-[11px] tracking-widest flex justify-between items-center">
                                {col.label}
                                <span className="bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg text-[10px] shadow-sm">
                                    {filteredLeads.filter(l => l.status === col.id).length}
                                </span>
                            </div>
                            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                {filteredLeads.filter(l => l.status === col.id).map(lead => (
                                    <div 
                                        key={lead.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead.id)}
                                        onClick={() => { setSelectedLead(lead); setLeadForm(lead); }}
                                        className="bg-white dark:bg-slate-700 p-5 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-xl transition-all group relative cursor-pointer active:scale-95 flex flex-col"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm leading-tight mb-1 truncate" title={lead.company}>{lead.company}</h4>
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <User size={10} className="shrink-0"/>
                                                    <p className="text-[10px] font-bold truncate">{lead.name}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>
                                        </div>

                                        {lead.description && (
                                            <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-600">
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-snug line-clamp-2">
                                                    {lead.description}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-slate-600">
                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-xs font-mono">
                                                R$ {(lead.value || 0).toLocaleString('pt-BR')}
                                            </div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase">
                                                {new Date(lead.createdAt).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedLead && !isNewLeadOpen && (
                <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-[10000] flex justify-end animate-fade-in" onClick={() => setSelectedLead(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        
                        <div className="bg-slate-900 text-white p-8 shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sparkles size={160} /></div>
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-xl border-4 border-blue-500/20">
                                        {(selectedLead.company || selectedLead.name)?.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-2xl font-black tracking-tighter uppercase truncate max-w-md">{selectedLead.company}</h2>
                                        <div className="flex items-center gap-3 mt-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                            <User size={14}/> {selectedLead.name} • <Phone size={14}/> {selectedLead.phone || 'S/ Telefone'}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLead(null)} className="p-3 bg-white/10 hover:bg-red-500/20 rounded-2xl transition-all"><X size={24}/></button>
                            </div>

                            <div className="grid grid-cols-3 gap-4 relative z-10">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">Valor Potencial</p>
                                    <p className="font-black text-xl text-emerald-400">R$ {selectedLead.value?.toLocaleString()}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">Data Criação</p>
                                    <p className="font-black text-lg">{new Date(selectedLead.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">Origem</p>
                                    <Badge color="blue">{selectedLead.source?.toUpperCase() || 'MANUAL'}</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div>
                                        <SectionTitle title="Ações Rápidas" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => setShowWhatsAppModal(true)} className="flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-600 dark:text-emerald-400 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-100 transition shadow-sm">
                                                <MessageCircle size={18}/> WhatsApp
                                            </button>
                                            <button onClick={() => setIsEmailModalOpen(true)} className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-600 dark:text-blue-400 font-black uppercase text-[10px] tracking-widest hover:bg-blue-100 transition shadow-sm">
                                                <Mail size={18}/> E-mail
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <SectionTitle title="Dados Detalhados" />
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Contato</label><input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={leadForm.name || ''} onChange={e => setLeadForm({...leadForm, name: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor (R$)</label><input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={leadForm.value || 0} onChange={e => setLeadForm({...leadForm, value: parseFloat(e.target.value)})} /></div>
                                            </div>
                                            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail</label><input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" value={leadForm.email || ''} onChange={e => setLeadForm({...leadForm, email: e.target.value})} /></div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2"><AlignLeft size={12}/> Breve Descritivo (Exibe no Card)</label>
                                                <textarea 
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold h-24 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                                    value={leadForm.description || ''} 
                                                    onChange={e => setLeadForm({...leadForm, description: e.target.value})} 
                                                    placeholder="Contexto rápido da oportunidade..." 
                                                />
                                            </div>
                                            <button 
                                                onClick={handleSaveLead} 
                                                disabled={isSaving}
                                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition shadow-xl disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <SectionTitle title="Linha do Tempo" subtitle="Interações e Auditoria" />
                                    <div className="relative border-l-4 border-slate-100 dark:border-slate-800 ml-4 pl-8 space-y-8">
                                        {leadTimeline.length > 0 ? leadTimeline.map((ev, i) => (
                                            <div key={ev.id} className="relative">
                                                <div className={`absolute -left-[42px] top-0 w-6 h-6 rounded-xl border-4 border-white dark:border-slate-900 shadow-sm ${ev.type === 'Activity' ? 'bg-blue-600' : 'bg-slate-400'}`}></div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{new Date(ev.date).toLocaleString('pt-BR')}</p>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight">{ev.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">{ev.desc}</p>
                                            </div>
                                        )) : (
                                            <div className="text-center py-10 text-slate-300 italic text-sm">Nenhuma atividade registrada.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NOVO LEAD */}
            {isNewLeadOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/10">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-black text-xl uppercase tracking-tighter">Novo Lead</h3>
                            <button onClick={() => setIsNewLeadOpen(false)} className="p-2 hover:bg-red-50 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Empresa</label><input type="text" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-transparent outline-none focus:border-blue-500" value={leadForm.company || ''} onChange={e => setLeadForm({...leadForm, company: e.target.value})} /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Contato</label><input type="text" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-transparent outline-none focus:border-blue-500" value={leadForm.name || ''} onChange={e => setLeadForm({...leadForm, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp</label><input type="text" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-transparent outline-none focus:border-blue-500" value={leadForm.phone || ''} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valor (R$)</label><input type="number" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-transparent outline-none focus:border-blue-500" value={leadForm.value || ''} onChange={e => setLeadForm({...leadForm, value: parseFloat(e.target.value) || 0})} /></div>
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Breve Descritivo</label><textarea className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-transparent outline-none focus:border-blue-500 h-20" value={leadForm.description || ''} onChange={e => setLeadForm({...leadForm, description: e.target.value})} placeholder="Contexto rápido..." /></div>
                            <button 
                                onClick={handleSaveLead} 
                                disabled={isSaving}
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl transition-all mt-4 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin mr-2" size={20}/> : null}
                                {isSaving ? 'Criando...' : 'Criar Oportunidade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showWhatsAppModal && selectedLead && createPortal(
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><MessageCircle size={20} className="text-green-600"/> Enviar WhatsApp</h2>
                            <button onClick={() => setShowWhatsAppModal(false)}><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-4">
                            <textarea 
                                className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 h-32 resize-none outline-none font-bold text-sm bg-white dark:bg-slate-800" 
                                value={whatsAppMessage} 
                                onChange={(e) => setWhatsAppMessage(e.target.value)} 
                                placeholder="Digite sua mensagem personalizada..."
                            />
                            <button onClick={handleSendWhatsApp} disabled={sendingWhatsApp} className="w-full bg-[#25D366] text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition">
                                {sendingWhatsApp ? 'Enviando...' : 'Abrir conversa'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isEmailModalOpen && selectedLead && createPortal(
                <SendEmailModal lead={selectedLead} onClose={() => setIsEmailModalOpen(false)} onSuccess={(msg) => addSystemNotification('Email', msg, 'success')}/>,
                document.body
            )}
        </div>
    );
};
