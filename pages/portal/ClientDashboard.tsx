
import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DollarSign, FileText, LifeBuoy, AlertCircle, CheckCircle, Wallet, ArrowRight, Clock } from 'lucide-react';
import { InvoiceStatus, TicketStatus } from '../../types';

interface ClientDashboardProps {
    onNavigate: (module: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { invoices, proposals, tickets, clients, portalSettings } = useData();

  // Obter cliente vinculado
  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  // Filtrar dados com segurança
  const myInvoices = useMemo(() => currentClient ? invoices.filter(i => i.customer === currentClient.name) : [], [invoices, currentClient]);
  
  const myProposals = useMemo(() => {
    if (!currentClient) return [];
    
    // Normalize Helper
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    const clientName = normalize(currentClient.name);
    const clientContact = normalize(currentClient.contactPerson);

    return proposals.filter(p => {
        // 1. Hide Drafts
        if (p.status === 'Draft') return false;

        // 2. Match ID
        if (p.clientId && p.clientId === currentClient.id) return true;

        // 3. Fuzzy Match
        const propCompany = normalize(p.companyName);
        if (propCompany && (propCompany === clientName || propCompany.includes(clientName) || clientName.includes(propCompany))) return true;

        const propClientName = normalize(p.clientName);
        if (propClientName && (propClientName === clientContact || propClientName === clientName)) return true;

        return false;
    }).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  }, [proposals, currentClient]);

  const myTickets = useMemo(() => currentClient ? tickets.filter(t => t.customer === currentClient.name) : [], [tickets, currentClient]);

  // Métricas
  const pendingInvoices = myInvoices.filter(i => i.status === InvoiceStatus.PENDING || i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE);
  const totalPendingAmount = pendingInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  
  const pendingProposals = myProposals.filter(p => p.status === 'Sent');
  const openTickets = myTickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED);
  
  const primaryColor = portalSettings.primaryColor || '#4f46e5';

  if (!currentClient) {
      return (
          <div className="p-8 text-center">
              <h2 className="text-xl font-bold text-slate-800">Perfil em Configuração</h2>
              <p className="text-slate-500">Seu usuário ainda não está vinculado a uma conta de cliente. Contate o administrador.</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div 
        className="rounded-2xl p-8 text-white shadow-xl relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, #1e293b)` }}
      >
          <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2">Olá, {currentClient.contactPerson.split(' ')[0]}!</h1>
              <p className="text-blue-100 max-w-xl">
                  Bem-vindo ao portal da <strong>{currentClient.name}</strong>. Aqui você pode acompanhar seus serviços, faturas e solicitações em tempo real.
              </p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-10"></div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Financeiro */}
          <div 
            onClick={() => portalSettings.allowInvoiceDownload && onNavigate('portal-financial')}
            className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group relative overflow-hidden ${!portalSettings.allowInvoiceDownload ? 'opacity-50 pointer-events-none' : ''}`}
          >
              <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg bg-emerald-50 text-emerald-600`}>
                      <Wallet size={24} />
                  </div>
                  {pendingInvoices.length > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">{pendingInvoices.length} pendentes</span>}
              </div>
              <h3 className="text-slate-500 text-sm font-medium uppercase mb-1">Faturas em Aberto</h3>
              <p className="text-2xl font-bold text-slate-800">R$ {totalPendingAmount.toLocaleString()}</p>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium group-hover:underline">
                  Ver detalhes <ArrowRight size={16} className="ml-1"/>
              </div>
          </div>

          {/* Propostas */}
          <div 
            onClick={() => onNavigate('portal-proposals')}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group"
          >
              <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg bg-blue-50 text-blue-600`}>
                      <FileText size={24} />
                  </div>
                  {pendingProposals.length > 0 && <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{pendingProposals.length} novas</span>}
              </div>
              <h3 className="text-slate-500 text-sm font-medium uppercase mb-1">Propostas Pendentes</h3>
              <p className="text-2xl font-bold text-slate-800">{pendingProposals.length}</p>
              <div className="mt-4 flex items-center text-sm text-blue-600 font-medium group-hover:underline">
                  Analisar propostas <ArrowRight size={16} className="ml-1"/>
              </div>
          </div>

          {/* Suporte */}
          <div 
            onClick={() => portalSettings.allowTicketCreation && onNavigate('portal-tickets')}
            className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group ${!portalSettings.allowTicketCreation ? 'opacity-50 pointer-events-none' : ''}`}
          >
              <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg bg-amber-50 text-amber-600`}>
                      <LifeBuoy size={24} />
                  </div>
                  {openTickets.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{openTickets.length} em andamento</span>}
              </div>
              <h3 className="text-slate-500 text-sm font-medium uppercase mb-1">Chamados Abertos</h3>
              <p className="text-2xl font-bold text-slate-800">{openTickets.length}</p>
              <div className="mt-4 flex items-center text-sm text-amber-600 font-medium group-hover:underline">
                  Acompanhar suporte <ArrowRight size={16} className="ml-1"/>
              </div>
          </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Faturas Recentes</h3>
              </div>
              <div className="divide-y divide-slate-100">
                  {myInvoices.slice(0, 3).map(inv => (
                      <div key={inv.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                          <div>
                              <p className="font-medium text-slate-800 text-sm">{inv.description}</p>
                              <p className="text-xs text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                              <p className="font-bold text-slate-800 text-sm">R$ {inv.amount.toLocaleString()}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  inv.status === 'Pago' ? 'bg-green-100 text-green-700' : 
                                  inv.status === 'Atrasado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                  {inv.status}
                              </span>
                          </div>
                      </div>
                  ))}
                  {myInvoices.length === 0 && <p className="p-6 text-center text-slate-400 text-sm">Nenhuma fatura encontrada.</p>}
              </div>
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Últimos Chamados</h3>
              </div>
              <div className="divide-y divide-slate-100">
                  {myTickets.slice(0, 3).map(ticket => (
                      <div key={ticket.id} className="p-4 hover:bg-slate-50 transition">
                          <div className="flex justify-between items-start mb-1">
                              <p className="font-medium text-slate-800 text-sm line-clamp-1">{ticket.subject}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                                  ticket.status === 'Resolvido' ? 'bg-green-100 text-green-700' : 
                                  ticket.status === 'Fechado' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'
                              }`}>
                                  {ticket.status}
                              </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500">
                              <span>#{ticket.id}</span>
                              <span className="flex items-center gap-1"><Clock size={10}/> {new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                      </div>
                  ))}
                  {myTickets.length === 0 && <p className="p-6 text-center text-slate-400 text-sm">Nenhum chamado recente.</p>}
              </div>
          </div>
      </div>
    </div>
  );
}
