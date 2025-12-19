import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Ticket, TicketPriority, TicketStatus, TicketResponse } from '../types';
import { analyzeTicket } from '../services/geminiService';
import { 
    MessageSquare, AlertTriangle, CheckCircle, Clock, 
    Search, Send, User, ChevronRight,
    Play, Sparkles, Plus, X, Download
} from 'lucide-react';
import { Badge } from '../components/Widgets';
import * as XLSX from 'xlsx';

export const Support: React.FC = () => {
    const { tickets, updateTicket, addActivity, addSystemNotification, addTicket } = useData();
    const { currentUser } = useAuth();
    
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{sentiment?: string, action?: string} | null>(null);
    const [responseMessage, setResponseMessage] = useState('');

    const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
    const [newTicketForm, setNewTicketForm] = useState({
        customer: '',
        subject: '',
        description: '',
        priority: TicketPriority.MEDIUM,
        channel: 'Phone' as 'Email' | 'Chat' | 'Phone'
    });

    const quickResponses = [
        { label: 'Saudação', text: 'Olá, obrigado por entrar em contato com o suporte da Nexus.' },
        { label: 'Em Análise', text: 'Estamos analisando sua solicitação e retornaremos em breve.' },
        { label: 'Resolvido', text: 'O problema foi corrigido. Por favor, verifique se normalizou.' }
    ];

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  t.customer.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = filterStatus === 'All' 
                ? true 
                : filterStatus === 'Resolved' 
                    ? (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED)
                    : t.status === TicketStatus.OPEN && filterStatus === 'Open'
                        ? true
                        : t.status === TicketStatus.IN_PROGRESS && filterStatus === 'In Progress';

            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [tickets, searchTerm, filterStatus]);

    const stats = useMemo(() => ({
        open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
        critical: tickets.filter(t => t.priority === TicketPriority.CRITICAL && t.status !== TicketStatus.RESOLVED).length,
    }), [tickets]);

    const handleAnalyze = async () => { 
        if (!selectedTicket) return; 
        setAnalyzing(true); 
        try { 
            const resultJson = await analyzeTicket(selectedTicket); 
            const parsed = JSON.parse(resultJson); 
            setAnalysisResult({ sentiment: parsed.sentiment, action: parsed.suggestedAction }); 
        } catch (e) { 
            setAnalysisResult({ sentiment: 'Neutro', action: 'Erro ao analisar.' }); 
        } finally { 
            setAnalyzing(false); 
        } 
    };
    
    const handleSendResponse = () => { 
        if (!selectedTicket || !responseMessage.trim()) return; 
        
        const newResponse: TicketResponse = { 
            id: `RESP-${Date.now()}`, 
            text: responseMessage, 
            author: currentUser?.name || 'Agente', 
            role: 'agent', 
            date: new Date().toISOString() 
        }; 
        
        const updatedTicketData: Partial<Ticket> = { 
            responses: [...(selectedTicket.responses || []), newResponse], 
            status: TicketStatus.IN_PROGRESS
        }; 
        
        updateTicket(currentUser, selectedTicket.id, updatedTicketData); 
        setSelectedTicket(prev => prev ? { ...prev, ...updatedTicketData } : null); 
        setResponseMessage(''); 
        addSystemNotification('Resposta Enviada', 'Resposta registrada no ticket.', 'success', selectedTicket.customer);
    };

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        const ticket: Ticket = {
            id: `TKT-${Date.now()}`,
            ...newTicketForm,
            status: TicketStatus.OPEN,
            created_at: new Date().toISOString(),
            responses: [],
            organizationId: currentUser?.organizationId
        };
        addTicket(currentUser, ticket);
        setIsNewTicketOpen(false);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 md:p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6 p-4 md:p-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Central de Suporte</h1>
                <div className="flex gap-2">
                    <button onClick={() => setIsNewTicketOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm">
                        <Plus size={18}/> Novo Chamado
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0 relative">
                <div className={`w-full lg:w-4/12 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input type="text" placeholder="Buscar ticket..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {filteredTickets.map(ticket => (
                            <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`p-4 rounded-xl border cursor-pointer transition ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-white dark:bg-slate-800 border-slate-200'}`}>
                                <h4 className="font-bold text-sm mb-1">{ticket.subject}</h4>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>{ticket.customer}</span>
                                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col ${!selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedTicket ? (
                        <>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-1 mr-2"><ChevronRight className="rotate-180"/></button>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{selectedTicket.subject}</h2>
                                <Badge color={selectedTicket.status === 'Resolvido' ? 'green' : 'blue'}>{selectedTicket.status}</Badge>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedTicket.description}</p>
                                </div>
                                {selectedTicket.responses?.map(resp => (
                                    <div key={resp.id} className={`flex ${resp.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${resp.role === 'agent' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 border border-slate-200 rounded-bl-none text-slate-800 dark:text-slate-200'}`}>
                                            <p>{resp.text}</p>
                                            <p className="text-[10px] mt-1 opacity-70">{resp.author} • {new Date(resp.date).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-4">
                                    <textarea className="w-full p-4 h-32 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700" placeholder="Digite sua resposta..." value={responseMessage} onChange={e => setResponseMessage(e.target.value)} />
                                    <div className="flex justify-end mt-2">
                                        <button onClick={handleSendResponse} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                                            Enviar Resposta <Send size={14}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <p>Selecione um chamado para atender</p>
                        </div>
                    )}
                </div>
            </div>

            {isNewTicketOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b flex justify-between">
                            <h2 className="text-xl font-bold">Novo Chamado</h2>
                            <button onClick={() => setIsNewTicketOpen(false)}><X/></button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                            <input required className="w-full border rounded p-2" placeholder="Cliente" value={newTicketForm.customer} onChange={e => setNewTicketForm({...newTicketForm, customer: e.target.value})} />
                            <input required className="w-full border rounded p-2" placeholder="Assunto" value={newTicketForm.subject} onChange={e => setNewTicketForm({...newTicketForm, subject: e.target.value})} />
                            <textarea required className="w-full border rounded p-2 h-32" placeholder="Descrição" value={newTicketForm.description} onChange={e => setNewTicketForm({...newTicketForm, description: e.target.value})} />
                            <button className="w-full bg-indigo-600 text-white py-2 rounded font-bold">Criar Chamado</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};