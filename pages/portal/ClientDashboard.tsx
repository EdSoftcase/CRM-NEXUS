
import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DollarSign, FileText, LifeBuoy, AlertCircle, CheckCircle } from 'lucide-react';
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

  // Filtrar dados
  const myInvoices = useMemo(() => currentClient ? invoices.filter(i => i.customer === currentClient.name) : [], [invoices, currentClient]);
  const myProposals = useMemo(() => currentClient ? proposals.filter(p => p.companyName === currentClient.name || p.clientName === currentClient.name) : [], [proposals, currentClient]);
  const myTickets = useMemo(() => currentClient ? tickets.filter(t => t.customer === currentClient.name) : [], [tickets, currentClient]);

  // Métricas
  const pendingInvoices = myInvoices.filter(i => i.status === InvoiceStatus.PENDING || i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE);
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
    <div className="space-y-8">
      {/* Welcome Section with Dynamic Gradient */}
      <div 
        className="rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-colors duration-300"
        style={{ background: `linear-gradient(to right, ${primaryColor}, #1e293b)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Olá, {currentUser?.name?.split(' ')[0]}!</h1>
            <p className="text-white/90 max-w-xl text-lg leading-relaxed">
                {portalSettings.welcomeMessage || `Bem-vindo ao portal da ${currentClient.name}. Acompanhe seus projetos e solicitações em tempo real.`}
            </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {portalSettings.allowInvoiceDownload && (
              <div onClick={() => onNavigate('portal-financial')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                          <DollarSign size={24} />
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Financeiro</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{pendingInvoices.length} Pendentes</h3>
                  <p className="text-sm text-slate-500">Faturas em aberto ou atrasadas.</p>
              </div>
          )}

          <div onClick={() => onNavigate('portal-proposals')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition">
                      <FileText size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Propostas</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{pendingProposals.length} Aguardando</h3>
              <p className="text-sm text-slate-500">Propostas para sua aprovação.</p>
          </div>

          {portalSettings.allowTicketCreation && (
              <div onClick={() => onNavigate('portal-tickets')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
                          <LifeBuoy size={24} />
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Suporte</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{openTickets.length} Abertos</h3>
                  <p className="text-sm text-slate-500">Chamados em andamento.</p>
              </div>
          )}
      </div>

      {/* Urgent Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Faturas Vencidas */}
          {portalSettings.allowInvoiceDownload && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-red-50 flex items-center justify-between">
                      <h3 className="font-bold text-red-900 flex items-center gap-2"><AlertCircle size={18}/> Atenção Necessária</h3>
                  </div>
                  <div className="p-0 flex-1">
                      {pendingInvoices.filter(i => i.status === InvoiceStatus.OVERDUE).length > 0 ? (
                          pendingInvoices.filter(i => i.status === InvoiceStatus.OVERDUE).map(inv => (
                              <div key={inv.id} className="p-4 border-b border-slate-100 flex justify-between items-center last:border-0 hover:bg-red-50/30 transition">
                                  <div>
                                      <p className="font-bold text-slate-800">{inv.description}</p>
                                      <p className="text-xs text-red-600 font-bold">Venceu: {new Date(inv.dueDate).toLocaleDateString()}</p>
                                  </div>
                                  <span className="font-bold text-slate-900">R$ {inv.amount.toLocaleString()}</span>
                              </div>
                          ))
                      ) : (
                          <div className="p-8 text-center text-slate-400">
                              <CheckCircle size={32} className="mx-auto mb-2 text-green-500 opacity-50"/>
                              <p className="text-sm">Nenhuma pendência crítica.</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* Últimas Propostas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Propostas Recentes</h3>
              </div>
              <div className="p-0 flex-1">
                  {myProposals.slice(0, 3).map(prop => (
                      <div key={prop.id} className="p-4 border-b border-slate-100 flex justify-between items-center last:border-0 hover:bg-slate-50 transition">
                          <div>
                              <p className="font-bold text-slate-800">{prop.title}</p>
                              <p className="text-xs text-slate-500">Validade: {new Date(prop.validUntil).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${prop.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                  {prop.status === 'Sent' ? 'Aguardando' : 'Aprovada'}
                              </span>
                          </div>
                      </div>
                  ))}
                  {myProposals.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm">Sem propostas recentes.</div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
