
/* ... imports ... */
import React, { useState, useMemo, useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom'; // REMOVED
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Ticket, TicketPriority, TicketStatus, TicketResponse } from '../types';
import { analyzeTicket } from '../services/geminiService';
import { 
    MessageSquare, AlertTriangle, CheckCircle, Clock, 
    Search, Filter, MoreHorizontal, Send, User, ChevronRight,
    Play, Sparkles, AlertCircle, Trash2, Plus, X, Phone, Mail, Download, MessageCircle
} from 'lucide-react';
import { Badge, KPICard } from '../components/Widgets';
import * as XLSX from 'xlsx';

export const Support: React.FC = () => {
    const { tickets, updateTicket, addActivity, addSystemNotification, addTicket } = useData();
    const { currentUser } = useAuth();
    // const [searchParams, setSearchParams] = useSearchParams(); // REMOVED
    
    /* ... state ... */
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{sentiment?: string, action?: string} | null>(null);
    const [responseMessage, setResponseMessage] = useState('');

    // New Ticket State
    const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
    const [newTicketForm, setNewTicketForm] = useState({
        customer: '',
        subject: '',
        description: '',
        priority: 'Média' as TicketPriority,
        channel: 'Phone' as 'Email' | 'Chat' | 'Phone'
    });

    // REMOVED Deep Linking Effect

    const handleSelectTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket); // Use local state
        setAnalysisResult(null); // Reset AI on change
    };

    const handleCloseTicket = () => {
        setSelectedTicket(null); // Use local state
    };

    const handleCloseNewTicket = () => {
        setIsNewTicketOpen(false);
    };

    // QUICK RESPONSES
    const quickResponses = [
        { label: 'Saudação', text: 'Olá, obrigado por entrar em contato com o suporte da Nexus.' },
        { label: 'Em Análise', text: 'Estamos analisando sua solicitação e retornaremos em breve.' },
        { label: 'Pedir Detalhes', text: 'Poderia fornecer mais detalhes ou um print do erro?' },
        { label: 'Resolvido', text: 'O problema foi corrigido. Por favor, verifique se normalizou.' },
        { label: 'Encerramento', text: 'Qualquer outra dúvida, estamos à disposição. Tenha um ótimo dia!' }
    ];

    const handleInsertQuickResponse = (text: string) => {
        setResponseMessage(prev => prev ? `${prev} ${text}` : text);
    };

    // EXPORT TICKETS
    const handleExportTickets = () => {
        if (filteredTickets.length === 0) {
            alert("Nenhum ticket para exportar.");
            return;
        }
        
        const dataToExport = filteredTickets.map(t => ({
            'ID': t.id,
            'Assunto': t.subject,
            'Cliente': t.customer,
            'Status': t.status,
            'Prioridade': t.priority,
            'Canal': t.channel,
            'Data Criação': new Date(t.created_at).toLocaleString(),
            'Respostas': t.responses?.length || 0
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatório Chamados");
        XLSX.writeFile(wb, `Tickets_Nexus_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    /* ... filters and stats ... */
    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  t.id.toLowerCase().includes(searchTerm.toLowerCase());
            
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
        resolvedToday: tickets.filter(t => t.status === TicketStatus.RESOLVED).length
    }), [tickets]);

    /* ... handlers ... */
    const handleAnalyze = async () => { if (!selectedTicket) return; setAnalyzing(true); try { const resultJson = await analyzeTicket(selectedTicket); const parsed = JSON.parse(resultJson); setAnalysisResult({ sentiment: parsed.sentiment, action: parsed.suggestedAction }); } catch (e) { console.error("AI Error", e); setAnalysisResult({ sentiment: 'Neutro', action: 'Erro ao analisar. Tente novamente.' }); } finally { setAnalyzing(false); } };
    
    const handleSendResponse = () => { 
        if (!selectedTicket || !responseMessage.trim()) return; 
        
        const newResponse: TicketResponse = { 
            id: `RESP-${Date.now()}`, 
            text: responseMessage, 
            author: currentUser.name, 
            role: 'agent', 
            date: new Date().toISOString() 
        }; 
        
        // Lógica: Se o ticket estava Aberto ou Resolvido, volta para Em Andamento ao responder
        const nextStatus = selectedTicket.status === TicketStatus.CLOSED ? TicketStatus.IN_PROGRESS : 
                           selectedTicket.status === TicketStatus.RESOLVED ? TicketStatus.IN_PROGRESS :
                           selectedTicket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : selectedTicket.status;

        const updatedTicketData: Partial<Ticket> = { 
            responses: [...(selectedTicket.responses || []), newResponse], 
            status: nextStatus,
            // If moved back to progress, clear resolvedAt
            resolvedAt: nextStatus === TicketStatus.IN_PROGRESS ? undefined : selectedTicket.resolvedAt
        }; 
        
        updateTicket(currentUser, selectedTicket.id, updatedTicketData); 
        setSelectedTicket(prev => prev ? { ...prev, ...updatedTicketData } : null); 
        
        addActivity(currentUser, { 
            id: `ACT-RESP-${Date.now()}`, 
            title: `Resposta Ticket #${selectedTicket.id}`, 
            type: 'Email', 
            dueDate: new Date().toISOString(), 
            completed: true, 
            relatedTo: selectedTicket.customer, 
            assignee: currentUser.id, 
            description: responseMessage 
        }); 
        
        addSystemNotification('Atualização em Chamado', `Você respondeu ao chamado "${selectedTicket.subject}"`, 'success', selectedTicket.customer); 
        setResponseMessage(''); 
    };

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        const newTicket: Ticket = {
            id: `TKT-${Date.now()}`,
            customer: newTicketForm.customer,
            subject: newTicketForm.subject,
            description: newTicketForm.description,
            priority: newTicketForm.priority,
            channel: newTicketForm.channel,
            status: TicketStatus.OPEN,
            created_at: new Date().toISOString(),
            responses: [],
            organizationId: currentUser.organizationId
        };

        addTicket(currentUser, newTicket);
        handleCloseNewTicket();
        setNewTicketForm({ customer: '', subject: '', description: '', priority: 'Média', channel: 'Phone' });
        addSystemNotification('Novo Chamado', `Chamado criado para ${newTicket.customer}`, 'success');
    };

    const handleStatusChange = (newStatus: TicketStatus) => { 
        if (selectedTicket) { 
            const updates: Partial<Ticket> = { status: newStatus };
            
            // If resolving, set timestamp and add system message
            if (newStatus === TicketStatus.RESOLVED) {
                updates.resolvedAt = new Date().toISOString();
                
                const sysMsg: TicketResponse = {
                     id: `SYS-${Date.now()}`,
                     text: "✅ Chamado marcado como Resolvido. Aguardando confirmação do cliente no Portal (Prazo: 48h).",
                     author: "Sistema",
                     role: 'agent',
                     date: new Date().toISOString()
                 };
                 updates.responses = [...(selectedTicket.responses || []), sysMsg];
            }

            updateTicket(currentUser, selectedTicket.id, updates); 
            setSelectedTicket(prev => prev ? { ...prev, ...updates } : null); 
        } 
    };
    
    const handlePriorityChange = (newPriority: TicketPriority) => { if (selectedTicket) { updateTicket(currentUser, selectedTicket.id, { priority: newPriority }); setSelectedTicket(prev => prev ? { ...prev, priority: newPriority } : null); } };
    const getPriorityColor = (p: string) => { switch(p) { case 'Crítica': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/50 border-red-100 dark:border-red-800'; case 'Alta': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/50 border-orange-100 dark:border-orange-800'; case 'Média': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 border-blue-100 dark:border-blue-800'; default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600'; } };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 md:p-6 overflow-hidden transition-colors">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 p-4 md:p-0 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Central de Suporte</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie solicitações e otimize o atendimento.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-start md:items-center">
                    {/* Stats Row */}
                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <div className="bg-white dark:bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 min-w-[120px]">
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg text-blue-600 dark:text-blue-400"><MessageSquare size={16}/></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Fila</p>
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{stats.open}</p>
                            </div>
                        </div>
                        {/* ... Other stats ... */}
                        <div className="bg-white dark:bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 min-w-[120px]">
                            <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg text-red-600 dark:text-red-400"><AlertTriangle size={16}/></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Críticos</p>
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{stats.critical}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 min-w-[120px]">
                            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg text-green-600 dark:text-green-400"><CheckCircle size={16}/></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Resolvidos</p>
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{stats.resolvedToday}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                         <button 
                            onClick={handleExportTickets}
                            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 shadow-sm whitespace-nowrap flex-1 md:flex-none justify-center text-sm"
                        >
                            <Download size={18}/> Exportar
                        </button>
                        <button 
                            onClick={() => setIsNewTicketOpen(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm whitespace-nowrap flex-1 md:flex-none justify-center"
                        >
                            <Plus size={18}/> Novo Chamado
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0 relative">
                
                {/* LISTA DE TICKETS (SIDEBAR) */}
                <div className={`
                    w-full lg:w-5/12 xl:w-4/12 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden absolute lg:static inset-0 z-10 transition-transform duration-300
                    ${selectedTicket ? 'translate-x-[-100%] lg:translate-x-0' : 'translate-x-0'}
                `}>
                    {/* ... Search & List (Same as before) ... */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="Buscar ticket..." 
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                                        filterStatus === status 
                                            ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200' 
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {status === 'All' ? 'Todos' : status === 'Open' ? 'Abertos' : status === 'In Progress' ? 'Andamento' : 'Resolvidos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
                        {filteredTickets.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                <MessageSquare size={32} className="mx-auto mb-2 opacity-30"/>
                                <p className="text-sm">Nenhum ticket encontrado.</p>
                            </div>
                        ) : (
                            filteredTickets.map(ticket => (
                                <div 
                                    key={ticket.id}
                                    onClick={() => handleSelectTicket(ticket)}
                                    className={`p-4 rounded-xl border cursor-pointer transition group hover:shadow-md ${
                                        selectedTicket?.id === ticket.id 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${ticket.status === 'Aberto' ? 'bg-blue-500' : ticket.status === 'Resolvido' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">#{ticket.id.slice(-6)}</span>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border uppercase ${getPriorityColor(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <h4 className={`font-bold text-sm mb-1 line-clamp-1 ${selectedTicket?.id === ticket.id ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {ticket.subject}
                                    </h4>
                                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        <span className="flex items-center gap-1 truncate max-w-[120px]"><User size={12}/> {ticket.customer}</span>
                                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* DETALHE DO TICKET (MAIN CONTENT) */}
                <div className={`
                    flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col absolute lg:static inset-0 z-20 transition-transform duration-300
                    ${selectedTicket ? 'translate-x-0' : 'translate-x-[100%] lg:translate-x-0'}
                `}>
                    {selectedTicket ? (
                        <>
                            {/* Detail Header ... */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-white dark:bg-slate-800 sticky top-0 z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <button onClick={handleCloseTicket} className="lg:hidden p-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 mr-2"><ChevronRight className="rotate-180" size={20}/></button>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedTicket.subject}</h2>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded"><User size={14}/> {selectedTicket.customer}</span>
                                        <span className="flex items-center gap-1"><Clock size={14}/> {new Date(selectedTicket.created_at).toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><MessageSquare size={14}/> via {selectedTicket.channel}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <select 
                                        className={`text-xs font-bold px-3 py-1.5 rounded border outline-none cursor-pointer uppercase ${
                                            selectedTicket.status === 'Aberto' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800' :
                                            selectedTicket.status === 'Resolvido' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800' :
                                            'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800'
                                        }`}
                                        value={selectedTicket.status}
                                        onChange={(e) => handleStatusChange(e.target.value as any)}
                                    >
                                        <option value="Aberto">Aberto</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Resolvido">Resolvido (Aguardar Cliente)</option>
                                        <option value="Fechado">Fechado</option>
                                    </select>
                                    <select 
                                        className="text-xs border rounded p-1 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 outline-none hover:border-slate-300 dark:hover:border-slate-600 border-slate-200 dark:border-slate-700"
                                        value={selectedTicket.priority}
                                        onChange={(e) => handlePriorityChange(e.target.value as any)}
                                    >
                                        <option value="Baixa">Baixa</option>
                                        <option value="Média">Média</option>
                                        <option value="Alta">Alta</option>
                                        <option value="Crítica">Crítica</option>
                                    </select>
                                </div>
                            </div>

                            {/* Detail Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Description */}
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Descrição do Problema</h4>
                                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                                </div>

                                {/* Chat History (Responses) */}
                                {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="relative flex py-2 items-center">
                                            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                            <span className="flex-shrink-0 mx-4 text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Histórico de Conversa</span>
                                            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                        </div>
                                        {selectedTicket.responses.map(resp => (
                                            <div key={resp.id} className={`flex ${resp.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex flex-col max-w-[85%] ${resp.role === 'agent' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`rounded-2xl p-4 text-sm shadow-sm border ${
                                                        resp.role === 'agent' 
                                                            ? 'bg-blue-600 text-white rounded-br-none border-blue-600' 
                                                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-bl-none text-slate-800 dark:text-slate-200'
                                                    }`}>
                                                        <p className="whitespace-pre-wrap leading-relaxed">{resp.text}</p>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                                                        {resp.author} • {new Date(resp.date).toLocaleString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* AI Analysis Widget ... */}
                                <div className="border border-indigo-100 dark:border-indigo-900 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm mt-6">
                                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/30 dark:to-slate-800 border-b border-indigo-50 dark:border-indigo-900 flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                                            <Sparkles size={16} className="text-indigo-500"/> Nexus AI Insights
                                        </h4>
                                        {!analysisResult && !analyzing && (
                                            <button onClick={handleAnalyze} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-1 shadow-sm">
                                                <Play size={10} fill="currentColor"/> Analisar
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="p-4 bg-white dark:bg-slate-800 min-h-[80px] flex items-center justify-center">
                                        {analyzing ? (
                                            <div className="flex flex-col items-center gap-2 text-indigo-400">
                                                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-xs font-medium">Processando contexto...</span>
                                            </div>
                                        ) : analysisResult ? (
                                            <div className="w-full text-sm">
                                                <div className="flex gap-4 mb-3">
                                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${analysisResult.sentiment === 'Negativo' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900'}`}>
                                                        Sentimento: {analysisResult.sentiment}
                                                    </div>
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-2 border-indigo-300 dark:border-indigo-600 pl-3">
                                                    "{analysisResult.action}"
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">Clique em analisar para obter sugestões de ação e análise de sentimento.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Response Area */}
                                <div className="mt-4 pb-4">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Responder ao Cliente</h4>
                                    
                                    {/* QUICK RESPONSES */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                                        {quickResponses.map((qr, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleInsertQuickResponse(qr.text)}
                                                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800 transition whitespace-nowrap"
                                            >
                                                {qr.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition shadow-sm bg-white dark:bg-slate-800">
                                        <textarea 
                                            dir="ltr"
                                            className="w-full p-4 h-32 outline-none text-sm resize-none bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-left"
                                            placeholder="Digite sua resposta..."
                                            value={responseMessage}
                                            onChange={(e) => setResponseMessage(e.target.value)}
                                        />
                                        <div className="bg-slate-50 dark:bg-slate-900 p-2 flex justify-between items-center border-t border-slate-200 dark:border-slate-600">
                                            <div className="flex gap-1">
                                                <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400" title="Anexar (Demo)"><MoreHorizontal size={16}/></button>
                                            </div>
                                            <button 
                                                onClick={handleSendResponse}
                                                disabled={!responseMessage.trim()}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                                            >
                                                Enviar Resposta <Send size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <MessageSquare size={32} className="opacity-50"/>
                            </div>
                            <p className="font-medium">Selecione um ticket para ver os detalhes</p>
                        </div>
                    )}
                </div>
            </div>

            {/* NEW TICKET MODAL (Same as before) */}
            {isNewTicketOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    {/* ... Modal Content ... */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Abrir Novo Chamado</h2>
                            <button onClick={handleCloseNewTicket} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cliente / Solicitante</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nome do Cliente" value={newTicketForm.customer} onChange={e => setNewTicketForm({...newTicketForm, customer: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Assunto</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Problema de Acesso" value={newTicketForm.subject} onChange={e => setNewTicketForm({...newTicketForm, subject: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Prioridade</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newTicketForm.priority} onChange={e => setNewTicketForm({...newTicketForm, priority: e.target.value as any})}>
                                        <option value="Baixa">Baixa</option>
                                        <option value="Média">Média</option>
                                        <option value="Alta">Alta</option>
                                        <option value="Crítica">Crítica</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Canal</label>
                                    <div className="relative">
                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none appearance-none" value={newTicketForm.channel} onChange={e => setNewTicketForm({...newTicketForm, channel: e.target.value as any})}>
                                            <option value="Phone">Telefone</option>
                                            <option value="Email">E-mail</option>
                                            <option value="Chat">Chat/Portal</option>
                                        </select>
                                        <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                                            {newTicketForm.channel === 'Phone' ? <Phone size={16}/> : newTicketForm.channel === 'Email' ? <Mail size={16}/> : <MessageSquare size={16}/>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                                <textarea required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Detalhes do chamado..." value={newTicketForm.description} onChange={e => setNewTicketForm({...newTicketForm, description: e.target.value})} />
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition flex items-center gap-2">
                                    <CheckCircle size={18}/> Criar Ticket
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
