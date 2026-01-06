
import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
    DollarSign, FileText, LifeBuoy, AlertCircle, 
    CheckCircle, Wallet, ArrowRight, Clock, 
    Loader2, ShieldCheck, Zap, TrendingUp,
    Activity, Download, MessageSquare
} from 'lucide-react';
import { InvoiceStatus, TicketStatus } from '../../types';

interface ClientDashboardProps {
    onNavigate: (module: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { invoices, proposals, tickets, clients, lastSyncTime } = useData();

  const currentClient = useMemo(() => {
    if (!currentUser) return null;
    return clients.find(c => c.id === currentUser.relatedClientId) || 
           clients.find(c => c.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim());
  }, [clients, currentUser]);

  const pendingInvoices = useMemo(() => 
    invoices.filter(i => i.customer === currentClient?.name && i.status !== InvoiceStatus.PAID), 
  [invoices, currentClient]);

  const openTickets = useMemo(() => 
    tickets.filter(t => t.customer === currentClient?.name && t.status !== TicketStatus.CLOSED), 
  [tickets, currentClient]);

  if (!currentClient) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Sincronizando Perfil...</div>;

  return (
    <div className="space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">Painel da Unidade</h1>
                <p className="text-slate-500 font-medium mt-1">Bem-vindo, {currentUser?.name}. Aqui está o resumo da {currentClient.name}.</p>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <ShieldCheck size={24}/>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema LPR</p>
                    <p className="text-sm font-bold text-slate-900 uppercase">Monitorado & Ativo</p>
                </div>
            </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><Zap size={24}/></div>
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Health Score</h3>
                <p className="text-2xl font-black text-slate-900">{currentClient.healthScore || 100}/100</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4"><DollarSign size={24}/></div>
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Faturas Pendentes</h3>
                <p className="text-2xl font-black text-slate-900">{pendingInvoices.length}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4"><FileText size={24}/></div>
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Contratos</h3>
                <p className="text-2xl font-black text-slate-900">{proposals.filter(p => p.status === 'Accepted').length}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-4"><LifeBuoy size={24}/></div>
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Suporte Aberto</h3>
                <p className="text-2xl font-black text-slate-900">{openTickets.length}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Feed de Atividade */}
            <div className="lg:col-span-2 space-y-6">
                <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-3">
                    <Activity size={24} className="text-indigo-600"/> Últimas Movimentações
                </h3>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y">
                        {pendingInvoices.slice(0, 3).map(inv => (
                            <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Clock size={20}/></div>
                                    <div>
                                        <p className="font-bold text-slate-900 uppercase text-xs">Fatura Pendente</p>
                                        <p className="text-xs text-slate-500">Vencimento em {new Date(inv.dueDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => onNavigate('portal-financial')} className="text-indigo-600 font-bold text-xs hover:underline">PAGAR AGORA &rarr;</button>
                            </div>
                        ))}
                        {openTickets.slice(0, 2).map(t => (
                            <div key={t.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><MessageSquare size={20}/></div>
                                    <div>
                                        <p className="font-bold text-slate-900 uppercase text-xs">Ticket Atualizado</p>
                                        <p className="text-xs text-slate-500">{t.subject}</p>
                                    </div>
                                </div>
                                <button onClick={() => onNavigate('portal-tickets')} className="text-indigo-600 font-bold text-xs hover:underline">VER CHAT &rarr;</button>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-slate-50 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Sincronização: {lastSyncTime?.toLocaleTimeString() || 'Agora'}</p>
                    </div>
                </div>
            </div>

            {/* Sidebar de Ações Rápidas */}
            <div className="space-y-6">
                <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-3">
                    <Zap size={24} className="text-amber-500"/> Acesso Rápido
                </h3>
                <div className="space-y-4">
                    <button onClick={() => onNavigate('portal-tickets')} className="w-full p-6 bg-indigo-600 text-white rounded-[2rem] text-left hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/20 group">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Precisa de Ajuda?</p>
                        <p className="font-bold text-lg mb-4 leading-tight">Solicitar Suporte Técnico</p>
                        <div className="flex items-center gap-2 text-xs font-bold group-hover:gap-4 transition-all">
                            ABRIR CHAMADO <ArrowRight size={16}/>
                        </div>
                    </button>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Central de Downloads</p>
                         <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition text-sm font-bold text-slate-700">
                             <span className="flex items-center gap-3"><FileText size={18} className="text-slate-400"/> Manual LPR</span>
                             <Download size={16} className="text-indigo-600"/>
                         </button>
                         <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition text-sm font-bold text-slate-700">
                             <span className="flex items-center gap-3"><ShieldCheck size={18} className="text-slate-400"/> Termos de Uso</span>
                             <Download size={16} className="text-indigo-600"/>
                         </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
