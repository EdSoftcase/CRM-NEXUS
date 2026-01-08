
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Ticket, TicketPriority, TicketStatus, TicketResponse } from '../../types';
import { MessageSquare, Plus, Send, AlertCircle, CheckCircle, Clock, ThumbsUp, ThumbsDown, AlertTriangle, Building2 } from 'lucide-react';
import { Badge } from '../../components/Widgets';

export const ClientSupport: React.FC = () => {
  const { tickets, clients, addTicket, updateTicket } = useData(); 
  const { currentUser } = useAuth();
  
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({ subject: '', description: '', priority: 'Média' as TicketPriority, unit: '' });
  const [replyText, setReplyText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Unidades do Grupo para o cliente escolher ao abrir ticket
  const myUnits = useMemo(() => {
    if (!currentUser) return [];
    const isMaua = currentUser.email?.toLowerCase().includes('mauaestacionamentos') || currentUser.managedGroupName === 'MAUA PARK';
    if (isMaua) return clients.filter(c => c.name.toUpperCase().includes('MAUA') || c.groupName === 'MAUA PARK');
    return clients.filter(c => c.id === currentUser.relatedClientId || c.email === currentUser.email);
  }, [clients, currentUser]);

  const myTickets = useMemo(() => {
    if (!currentUser) return [];
    const isMaua = currentUser.email?.toLowerCase().includes('mauaestacionamentos') || currentUser.managedGroupName === 'MAUA PARK';
    
    return tickets.filter(t => {
        const customer = (t.customer || '').toUpperCase();
        if (isMaua) return customer.includes('MAUA');
        return myUnits.some(u => u.name === t.customer);
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets, currentUser, myUnits]);

  const handleCreateTicket = (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentUser || !newTicketForm.unit) {
          alert("Selecione a unidade afetada.");
          return;
      }

      const newTicket: Ticket = {
          id: `TKT-${Date.now()}`,
          subject: newTicketForm.subject,
          description: newTicketForm.description,
          priority: newTicketForm.priority,
          status: TicketStatus.OPEN,
          customer: newTicketForm.unit,
          channel: 'Chat',
          created_at: new Date().toISOString(),
          organizationId: currentUser.organizationId,
          responses: []
      };

      try {
          addTicket(currentUser, newTicket);
          setIsNewTicketOpen(false);
          setNewTicketForm({ subject: '', description: '', priority: 'Média' as any, unit: '' });
      } catch (error) {
          alert("Erro ao criar chamado.");
      }
  };

  const handleClientReply = (ticketId: string) => {
      if (!replyText.trim() || !currentUser) return;
      
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return;

      const newResponse: TicketResponse = {
          id: `RESP-${Date.now()}`,
          text: replyText,
          author: currentUser.name || 'Você',
          role: 'client',
          date: new Date().toISOString()
      };

      const newStatus = ticket.status === TicketStatus.RESOLVED ? TicketStatus.IN_PROGRESS : ticket.status;
      updateTicket(currentUser, ticketId, {
          responses: [...(ticket.responses || []), newResponse],
          status: newStatus
      });

      setReplyText('');
      setReplyingTo(null);
  };

  const handleResolutionAction = (ticket: Ticket, approved: boolean) => {
      if (!currentUser) return;

      if (approved) {
          const closeMsg: TicketResponse = { id: `SYS-${Date.now()}`, text: "✅ Confirmado pelo cliente.", author: "Sistema", role: 'client', date: new Date().toISOString() };
          updateTicket(currentUser, ticket.id, { status: TicketStatus.CLOSED, responses: [...(ticket.responses || []), closeMsg] });
      } else {
          const reopenMsg: TicketResponse = { id: `SYS-${Date.now()}`, text: "❌ Cliente indicou que não foi resolvido.", author: "Sistema", role: 'client', date: new Date().toISOString() };
          updateTicket(currentUser, ticket.id, { status: TicketStatus.IN_PROGRESS, resolvedAt: undefined, responses: [...(ticket.responses || []), reopenMsg] });
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Suporte Técnico</h1>
                <p className="text-slate-500 font-medium">Acompanhe seus chamados em aberto.</p>
            </div>
            <button 
                onClick={() => setIsNewTicketOpen(!isNewTicketOpen)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition shadow-lg"
            >
                {isNewTicketOpen ? 'Fechar Form' : 'Novo Chamado'}
            </button>
        </div>

        {isNewTicketOpen && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl animate-fade-in">
                <h3 className="font-black text-slate-800 uppercase text-lg mb-6">Abertura de Chamado</h3>
                <form onSubmit={handleCreateTicket} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Unidade Afetada</label>
                        <select required className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-bold" value={newTicketForm.unit} onChange={e => setNewTicketForm({...newTicketForm, unit: e.target.value})}>
                            <option value="">Selecione a unidade...</option>
                            {myUnits.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Assunto</label>
                        <input required type="text" className="w-full border-2 border-slate-100 rounded-xl p-3 bg-white" placeholder="Ex: Câmera LPR offline" value={newTicketForm.subject} onChange={e => setNewTicketForm({...newTicketForm, subject: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Prioridade</label>
                        <select className="w-full border-2 border-slate-100 rounded-xl p-3 bg-white" value={newTicketForm.priority} onChange={e => setNewTicketForm({...newTicketForm, priority: e.target.value as any})}>
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                            <option value="Crítica">Crítica (Operação Parada)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Descrição</label>
                        <textarea required className="w-full border-2 border-slate-100 rounded-xl p-3 h-32" placeholder="Explique o ocorrido..." value={newTicketForm.description} onChange={e => setNewTicketForm({...newTicketForm, description: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Enviar Solicitação</button>
                </form>
            </div>
        )}

        <div className="space-y-6">
            {myTickets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                    <MessageSquare size={48} className="text-slate-200 mb-4"/>
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum chamado encontrado</p>
                </div>
            ) : (
                myTickets.map(ticket => (
                    <div key={ticket.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 size={20}/></div>
                                <div>
                                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{ticket.subject}</h4>
                                    <p className="text-[10px] text-slate-400 uppercase font-black">{ticket.customer} • #{ticket.id.slice(-5)}</p>
                                </div>
                            </div>
                            <Badge color={ticket.status === 'Resolvido' ? 'green' : ticket.status === 'Fechado' ? 'gray' : 'yellow'}>
                                {ticket.status.toUpperCase()}
                            </Badge>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="flex justify-end">
                                <div className="max-w-[80%] bg-indigo-50 p-6 rounded-[2rem] rounded-tr-none border border-indigo-100 shadow-sm">
                                    <p className="text-sm text-indigo-900 font-medium leading-relaxed">{ticket.description}</p>
                                    <p className="text-[10px] text-indigo-400 mt-2 font-black uppercase text-right">SOLICITADO EM {new Date(ticket.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {ticket.responses?.map((resp) => (
                                <div key={resp.id} className={`flex ${resp.role === 'client' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-6 rounded-[2rem] text-sm shadow-sm ${resp.role === 'client' ? 'bg-indigo-50 border border-indigo-100 rounded-tr-none' : 'bg-slate-900 text-white rounded-tl-none'}`}>
                                        <p className="font-bold text-[10px] uppercase mb-1 opacity-60">{resp.author}</p>
                                        <p className="leading-relaxed">{resp.text}</p>
                                    </div>
                                </div>
                            ))}

                            {ticket.status === 'Resolvido' && (
                                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[3rem] text-center space-y-4">
                                    <h4 className="font-black text-emerald-900 uppercase">O problema foi resolvido?</h4>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleResolutionAction(ticket, true)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Sim, Resolver</button>
                                        <button onClick={() => handleResolutionAction(ticket, false)} className="flex-1 py-4 bg-white text-slate-900 border-2 rounded-2xl font-black uppercase text-xs">Ainda não</button>
                                    </div>
                                </div>
                            )}

                            {ticket.status !== 'Fechado' && ticket.status !== 'Resolvido' && (
                                <div className="flex gap-3">
                                    <input 
                                        className="flex-1 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-indigo-600 bg-slate-50"
                                        placeholder="Responder ao consultor..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleClientReply(ticket.id)}
                                    />
                                    <button onClick={() => handleClientReply(ticket.id)} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg"><Send size={20}/></button>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};
