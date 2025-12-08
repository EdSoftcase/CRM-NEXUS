
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InboxConversation, InboxMessage } from '../types';
import { Search, Send, Paperclip, MoreVertical, Phone, Video, CheckCircle, Clock, MessageCircle, Mail, MessageSquare, Archive, Trash2, User } from 'lucide-react';

export const Inbox: React.FC = () => {
    const { inboxConversations, tickets, activities } = useData();
    const { currentUser } = useAuth();
    
    // UI State
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'All' | 'WhatsApp' | 'Email' | 'Ticket'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [messageInput, setMessageInput] = useState('');

    // --- AGGREGATE DATA SOURCE ---
    // In a real app, this would query a dedicated conversations table.
    // Here we merge the explicit 'inboxConversations' state with derived data from Tickets.
    const aggregatedConversations = useMemo(() => {
        const ticketConvos: InboxConversation[] = tickets.filter(t => t.status !== 'Fechado').map(t => ({
            id: `TICKET-${t.id}`,
            contactName: t.customer,
            contactIdentifier: t.id,
            type: 'Ticket',
            lastMessage: t.responses && t.responses.length > 0 ? t.responses[t.responses.length - 1].text : t.description,
            lastMessageAt: t.responses && t.responses.length > 0 ? t.responses[t.responses.length - 1].date : t.created_at,
            unreadCount: 0,
            status: 'Open',
            messages: (t.responses || []).map(r => ({
                id: r.id,
                text: r.text,
                sender: r.role === 'client' ? 'user' : 'agent',
                timestamp: r.date
            }))
        }));

        // Sort by date desc
        return [...inboxConversations, ...ticketConvos].sort((a, b) => 
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
    }, [inboxConversations, tickets]);

    const filteredConversations = useMemo(() => {
        return aggregatedConversations.filter(c => {
            const matchesType = filterType === 'All' || c.type === filterType;
            const matchesSearch = c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesType && matchesSearch;
        });
    }, [aggregatedConversations, filterType, searchTerm]);

    const selectedConversation = useMemo(() => 
        aggregatedConversations.find(c => c.id === selectedConversationId), 
    [aggregatedConversations, selectedConversationId]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedConversation) return;

        // In a real app, this would call an API (WhatsApp, Email, or internal ticket update)
        alert(`Mensagem enviada para ${selectedConversation.contactName}: ${messageInput}`);
        setMessageInput('');
        
        // Optimistic update logic would go here
    };

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'WhatsApp': return <MessageCircle size={16} className="text-green-500"/>;
            case 'Email': return <Mail size={16} className="text-blue-500"/>;
            case 'Ticket': return <MessageSquare size={16} className="text-purple-500"/>;
            default: return <MessageCircle size={16}/>;
        }
    };

    return (
        <div className="h-full flex bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar List */}
            <div className={`w-full md:w-80 lg:w-96 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-xl text-slate-800 dark:text-white">Caixa de Entrada</h2>
                        <div className="flex gap-2">
                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><Archive size={20}/></button>
                        </div>
                    </div>
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar conversa..." 
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {['All', 'WhatsApp', 'Email', 'Ticket'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition ${filterType === type ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                {type === 'All' ? 'Todos' : type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                            Nenhuma conversa encontrada.
                        </div>
                    ) : (
                        filteredConversations.map(convo => (
                            <div 
                                key={convo.id} 
                                onClick={() => setSelectedConversationId(convo.id)}
                                className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition relative ${selectedConversationId === convo.id ? 'bg-blue-50 dark:bg-slate-700/80' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-slate-800 dark:text-white truncate pr-2">{convo.contactName}</h4>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(convo.lastMessageAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[80%] flex items-center gap-1">
                                        {getTypeIcon(convo.type)} {convo.lastMessage}
                                    </p>
                                    {convo.unreadCount > 0 && (
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                            {convo.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedConversation ? (
                <div className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                    {/* Chat Header */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedConversationId(null)} className="md:hidden p-2 -ml-2 text-slate-500">
                                <span className="sr-only">Voltar</span>
                                ←
                            </button>
                            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-slate-500 dark:text-slate-300">
                                {selectedConversation.contactName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">{selectedConversation.contactName}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    {getTypeIcon(selectedConversation.type)}
                                    <span>{selectedConversation.contactIdentifier}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 text-slate-400">
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><Phone size={20}/></button>
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><MoreVertical size={20}/></button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-100 dark:bg-slate-900/50" style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                        {selectedConversation.messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-xl shadow-sm text-sm ${
                                    msg.sender === 'user' 
                                        ? 'bg-blue-600 text-white rounded-br-none' 
                                        : msg.sender === 'system'
                                            ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 text-center w-full max-w-full'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none'
                                }`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <p className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                            <button type="button" className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                <Paperclip size={20}/>
                            </button>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-2 flex items-center">
                                <textarea 
                                    className="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white resize-none max-h-32"
                                    rows={1}
                                    placeholder="Digite sua mensagem..."
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={!messageInput.trim()}
                                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                <Send size={20}/>
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                    <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare size={48} className="opacity-50"/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Nexus Inbox Unificado</h3>
                    <p className="max-w-md text-center">Selecione uma conversa para visualizar o histórico de mensagens do WhatsApp, E-mail ou Tickets de Suporte.</p>
                </div>
            )}
        </div>
    );
};
