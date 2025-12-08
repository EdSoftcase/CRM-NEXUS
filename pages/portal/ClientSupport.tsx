
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Ticket, TicketPriority, TicketStatus, TicketResponse } from '../../types';
import { MessageSquare, Plus, Send, AlertCircle, CheckCircle, Clock, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/Widgets';

export const ClientSupport: React.FC = () => {
  const { tickets, clients, addTicket, updateTicket } = useData(); 
  const { currentUser } = useAuth();
  
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({ subject: '', description: '', priority: 'Média' as TicketPriority });
  const [replyText, setReplyText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  const myTickets = useMemo(() => {
    if (!currentClient) return [];
    return tickets.filter(t => t.customer === currentClient.name).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets, currentClient]);

  const handleCreateTicket = (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentClient || !currentUser) return;

      const newTicket: Ticket = {
          id: `TKT-${Date.now()}`,
          subject: newTicketForm.subject,
          description: newTicketForm.description,
          priority: newTicketForm.priority,
          status: TicketStatus.OPEN,
          customer: currentClient.name,
          channel: 'Chat',
          created_at: new Date().toISOString(),
          organizationId: currentUser.organizationId,
          responses: []
      };

      try {
          addTicket(currentUser, newTicket);
          alert("Ticket criado com sucesso! A equipe de suporte foi notificada.");
          setIsNewTicketOpen(false);
          setNewTicketForm({ subject: '', description: '', priority: 'Média' as any });
      } catch (error) {
          console.error(error);
          alert("Erro ao criar ticket. Tente novamente.");
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

      // Se o cliente responder, o ticket volta para Em Andamento
      const newStatus = ticket.status === TicketStatus.RESOLVED ? TicketStatus.IN_PROGRESS : ticket.status;

      const updateData: Partial<Ticket> = {
          responses: [...(ticket.responses || []), newResponse],
          status: newStatus
      };

      if (newStatus === TicketStatus.IN_PROGRESS) {
          updateData.resolvedAt = undefined; // Clear resolution timestamp
      }

      updateTicket(currentUser, ticketId, updateData);

      setReplyText('');
      setReplyingTo(null);
  };

  const handleResolutionAction = (ticket: Ticket, approved: boolean) => {
      if (!currentUser) return;

      if (approved) {
          // Cliente aprova -> Fecha o ticket
          const closeMsg: TicketResponse = {
              id: `SYS-${Date.now()}`,
              text: "✅ O cliente confirmou a resolução do problema. Chamado encerrado.",
              author: "Sistema",
              role: 'client',
              date: new Date().toISOString()
          };
          updateTicket(currentUser, ticket.id, {
              status: TicketStatus.CLOSED,
              responses: [...(ticket.responses || []), closeMsg]
          });
      } else {
          // Cliente reprova -> Volta para Em Andamento
          const reopenMsg: TicketResponse = {
              id: `SYS-${Date.now()}`,
              text: "❌ O cliente indicou que o problema persiste. Chamado reaberto.",
              author: "Sistema",
              role: 'client',
              date: new Date().toISOString()
          };
          // Clear resolvedAt so auto-close logic resets
          updateTicket(currentUser, ticket.id, {
              status: TicketStatus.IN_PROGRESS,
              resolvedAt: undefined,
              responses: [...(ticket.responses || []), reopenMsg]
          });
      }
  };

  if (!currentClient) return null;

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Suporte & Chamados</h1>
                <p className="text-slate-500">Abra novos chamados e acompanhe o andamento.</p>
            </div>
            <button 
                onClick={() => setIsNewTicketOpen(!isNewTicketOpen)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
            >
                {isNewTicketOpen ? 'Cancelar' : <><Plus size={18}/> Novo Chamado</>}
            </button>
        </div>

        {/* New Ticket Form */}
        {isNewTicketOpen && (
            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg animate-fade-in mb-6">
                <h3 className="font-bold text-slate-800 mb-4">Descreva sua solicitação</h3>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assunto</label>
                        <input required type="text" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Problema na emissão de fatura" value={newTicketForm.subject} onChange={e => setNewTicketForm({...newTicketForm, subject: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                        <select className="w-full border rounded-lg p-2.5 bg-white outline-none" value={newTicketForm.priority} onChange={e => setNewTicketForm({...newTicketForm, priority: e.target.value as any})}>
                            <option value="Baixa">Baixa - Dúvida simples</option>
                            <option value="Média">Média - Problema não crítico</option>
                            <option value="Alta">Alta - Funcionalidade travada</option>
                            <option value="Crítica">Crítica - Sistema parado</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição Detalhada</label>
                        <textarea required className="w-full border rounded-lg p-3 h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Descreva o que aconteceu..." value={newTicketForm.description} onChange={e => setNewTicketForm({...newTicketForm, description: e.target.value})} />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                            <Send size={18}/> Enviar Solicitação
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* Ticket List */}
        <div className="space-y-6">
            {myTickets.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4 opacity-50"/>
                    <p className="text-slate-500 font-medium">Você não tem chamados em aberto.</p>
                </div>
            ) : (
                myTickets.map(ticket => (
                    <div key={ticket.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-900 text-lg">{ticket.subject}</h4>
                                        <span className="text-xs text-slate-400 font-mono">#{ticket.id}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(ticket.created_at).toLocaleString()}</span>
                                        <span className="flex items-center gap-1">
                                            <AlertCircle size={12} className={ticket.priority === 'Crítica' ? 'text-red-500' : 'text-slate-400'}/> {ticket.priority}
                                        </span>
                                    </div>
                                </div>
                                <Badge color={
                                    ticket.status === 'Resolvido' ? 'green' : 
                                    ticket.status === 'Fechado' ? 'gray' :
                                    ticket.status === 'Em Andamento' ? 'yellow' : 'blue'
                                }>
                                    {ticket.status === 'Resolvido' ? 'Aguardando Aprovação' : ticket.status}
                                </Badge>
                            </div>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            {/* Original Description */}
                            <div className="flex justify-end">
                                <div className="max-w-[90%] bg-blue-50 p-4 rounded-lg rounded-tr-none border border-blue-100 text-sm text-slate-700">
                                    <p className="whitespace-pre-wrap">{ticket.description}</p>
                                    <p className="text-[10px] text-blue-400 text-right mt-1">
                                        Você • {new Date(ticket.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>

                            {/* Conversation History */}
                            {ticket.responses?.map((resp) => (
                                <div key={resp.id} className={`flex ${resp.role === 'client' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] p-4 rounded-lg text-sm border shadow-sm ${resp.role === 'client' ? 'bg-blue-50 border-blue-100 rounded-tr-none' : 'bg-white border-slate-200 rounded-tl-none'}`}>
                                        <div className="flex justify-between items-center mb-1 gap-4">
                                            <span className={`font-bold text-xs ${resp.role === 'client' ? 'text-blue-700' : 'text-indigo-600'}`}>
                                                {resp.role === 'client' ? 'Você' : resp.author}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{resp.text}</p>
                                        <p className="text-[10px] text-slate-400 text-right mt-2">{new Date(resp.date).toLocaleString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            ))}

                            {/* --- APPROVAL WORKFLOW --- */}
                            {ticket.status === 'Resolvido' && (
                                <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-green-100 text-green-600 p-2 rounded-full"><CheckCircle size={24}/></div>
                                        <div className="flex-1">
                                            <h4 className="text-green-900 font-bold mb-1">O suporte marcou este chamado como Resolvido</h4>
                                            <p className="text-green-700 text-sm mb-4">Por favor, confirme se o problema foi solucionado para encerrar o chamado, ou recuse para continuar o atendimento. <span className="font-bold">O chamado será encerrado automaticamente em 48h se não houver resposta.</span></p>
                                            
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleResolutionAction(ticket, true)}
                                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-bold text-sm hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <ThumbsUp size={16}/> Sim, Resolvido
                                                </button>
                                                <button 
                                                    onClick={() => handleResolutionAction(ticket, false)}
                                                    className="flex-1 bg-white text-slate-700 border border-slate-300 py-2 px-4 rounded-lg font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                                >
                                                    <ThumbsDown size={16}/> Não, Reabrir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reply Input (Only if not Closed and not Waiting Approval) */}
                            {ticket.status !== 'Fechado' && ticket.status !== 'Resolvido' && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    {replyingTo === ticket.id ? (
                                        <div className="flex gap-2 items-start">
                                            <textarea 
                                                className="flex-1 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                                placeholder="Digite sua resposta..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                            />
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => handleClientReply(ticket.id)}
                                                    disabled={!replyText.trim()}
                                                    className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                                                >
                                                    <Send size={18}/>
                                                </button>
                                                <button 
                                                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                    className="bg-slate-100 text-slate-500 p-3 rounded-lg hover:bg-slate-200 transition"
                                                >
                                                    <AlertTriangle size={18} className="rotate-45"/>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setReplyingTo(ticket.id)}
                                            className="w-full py-3 border border-dashed border-slate-300 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition flex items-center justify-center gap-2"
                                        >
                                            <MessageSquare size={16}/> Responder
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            {ticket.status === 'Fechado' && (
                                <div className="mt-4 p-3 bg-slate-100 rounded-lg text-center text-xs text-slate-500 font-medium">
                                    Chamado encerrado. Caso o problema retorne, abra um novo ticket.
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
