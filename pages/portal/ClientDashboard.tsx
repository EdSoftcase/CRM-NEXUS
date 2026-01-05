
import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DollarSign, FileText, LifeBuoy, AlertCircle, CheckCircle, Wallet, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { InvoiceStatus, TicketStatus } from '../../types';

interface ClientDashboardProps {
    onNavigate: (module: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { invoices, proposals, tickets, clients, portalSettings, isSyncing } = useData();

  // Busca resiliente: Tenta por ID, se não encontrar (ou estiver nulo no perfil), tenta por e-mail
  const currentClient = useMemo(() => {
    if (!currentUser) return null;
    
    let found = clients.find(c => c.id === currentUser.relatedClientId);
    
    if (!found && currentUser.email) {
        found = clients.find(c => c.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim());
    }
    
    return found;
  }, [clients, currentUser]);

  // Filtrar dados com segurança
  const myInvoices = useMemo(() => currentClient ? invoices.filter(i => i.customer === currentClient.name) : [], [invoices, currentClient]);
  
  const myProposals = useMemo(() => {
    if (!currentClient) return [];
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    const clientName = normalize(currentClient.name);

    return proposals.filter(p => {
        if (p.status === 'Draft') return false;
        if (p.clientId && p.clientId === currentClient.id) return true;
        const propCompany = normalize(p.companyName);
        if (propCompany && (propCompany === clientName || propCompany.includes(clientName))) return true;
        return false;
    }).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  }, [proposals, currentClient]);

  const myTickets = useMemo(() => currentClient ? tickets.filter(t => t.customer === currentClient.name) : [], [tickets, currentClient]);

  const pendingInvoices = myInvoices.filter(i => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED);
  const totalPendingAmount = pendingInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingProposals = myProposals.filter(p => p.status === 'Sent');
  const openTickets = myTickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED);
  
  const primaryColor = portalSettings.primaryColor || '#4f46e5';

  if (!currentClient) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
              {isSyncing ? (
                  <>
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">Sincronizando seus dados...</h2>
                    <p className="text-slate-500 max-w-md mt-2">Estamos localizando suas informações contratuais na nuvem.</p>
                  </>
              ) : (
                  <>
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Vínculo não localizado</h2>
                    <p className="text-slate-500 max-w-md mt-4 leading-relaxed">
                        Seu usuário (<strong>{currentUser?.email}</strong>) foi criado, mas ainda não foi detectado um vínculo com uma unidade de cliente ativa. 
                    </p>
                    <div className="mt-8 p-4 bg-slate-100 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-2">
                        <p>• Verifique se o administrador vinculou seu e-mail corretamente na aba de Clientes.</p>
                        <p>• Tente recarregar a página para forçar a sincronização.</p>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition">
                        Recarregar Portal
                    </button>
                  </>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div 
        className="rounded-2xl p-8 text-white shadow-xl relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, #1e293b)` }}
      >
          <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2">Olá, {currentClient.contactPerson?.split(' ')[0] || 'Cliente'}!</h1>
              <p className="text-blue-100 max-w-xl">
                  Bem-vindo ao portal da <strong>{currentClient.name}</strong>. Acompanhe seus serviços e faturas em tempo real.
              </p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-10"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => portalSettings.allowInvoiceDownload && onNavigate('portal-financial')} className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group relative overflow-hidden ${!portalSettings.allowInvoiceDownload ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600"><Wallet size={24} /></div>
                  {pendingInvoices.length > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">{pendingInvoices.length} pendentes</span>}
              </div>
              <h3 className="text-slate-500 text-sm font-medium uppercase mb-1">Faturas em Aberto</h3>
              <p className="text-2xl font-bold text-slate-800">R$ {totalPendingAmount.toLocaleString()}</p>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium group-hover:underline">Ver detalhes <ArrowRight size={16} className="ml-1"/></div>
          </div>

          <div onClick={() => onNavigate('portal-proposals')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><FileText size={24} /></div>
                  {pendingProposals.length > 0 && <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">{pendingProposals.length} novas</span>}
              </div>
              <h3 className="text-slate-500 text-sm font-medium uppercase mb-1">Propostas Pendentes</h3>
              <p className="text-2xl font-bold text-slate-800">{pendingProposals.length}</p>
              <div className="mt-4 flex items-center text-sm text-blue-600 font-medium group-hover:underline">Analisar propostas <ArrowRight size={16} className="ml-1"/></div>
          </div>

          <div onClick={() => portalSettings.allowTicketCreation && onNavigate('portal-tickets')} className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group ${!portalSettings.allowTicketCreation ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-lg bg-amber-50 text-amber-600"><LifeBuoy size={24} /></div>
                  {openTickets.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{openTickets.length} ativos</span>}
              </div>
              <h3 className="text-slate-500 text-sm font-medium uppercase mb-1">Suporte Técnico</h3>
              <p className="text-2xl font-bold text-slate-800">{openTickets.length}</p>
              <div className="mt-4 flex items-center text-sm text-amber-600 font-medium group-hover:underline">Acompanhar suporte <ArrowRight size={16} className="ml-1"/></div>
          </div>
      </div>
    </div>
  );
}
