
import React, { useMemo, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
    DollarSign, FileText, LifeBuoy, AlertCircle, 
    CheckCircle, Wallet, ArrowRight, Clock, 
    Loader2, ShieldCheck, Zap, TrendingUp,
    Activity, Download, MessageSquare, Building2, SearchX, Link as LinkIcon
} from 'lucide-react';
import { Badge } from '../../components/Widgets';
import { InvoiceStatus, TicketStatus } from '../../types';

interface ClientDashboardProps {
    onNavigate: (module: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { invoices, proposals, tickets, clients, isSyncing } = useData();
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!isSyncing) setInitialLoadDone(true);
  }, [isSyncing]);

  const pendingInvoices = useMemo(() => invoices.filter(i => i.status !== InvoiceStatus.PAID), [invoices]);
  const openTickets = useMemo(() => tickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED), [tickets]);
  
  // Cálculo robusto do total em aberto
  const totalBalanceDue = useMemo(() => {
    return pendingInvoices.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [pendingInvoices]);

  if (isSyncing || !initialLoadDone) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center animate-fade-in">
            <Loader2 className="text-indigo-600 animate-spin mb-4" size={48}/>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sincronizando dados...</p>
        </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel do Cliente</h1>
                <div className="flex flex-wrap items-center gap-4 mt-3">
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5">
                        <Building2 size={12}/> {currentUser?.email}
                    </p>
                    {currentUser?.managedGroupName && (
                        <div className="bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full flex items-center gap-2">
                             <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Grupo:</span>
                             <span className="text-[10px] font-black text-indigo-600 uppercase">{currentUser.managedGroupName}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-white px-6 py-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck size={24}/></div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status de Gestão</p>
                    <p className="text-sm font-bold text-slate-900 uppercase">{clients.length} Unidades Operacionais</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <Building2 className="text-indigo-600 mb-4" size={20}/>
                <h3 className="text-slate-500 text-[10px] font-black uppercase mb-1">Unidades Ativas</h3>
                <p className="text-2xl font-black text-slate-900">{clients.length}</p>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <DollarSign className="text-emerald-600 mb-4" size={20}/>
                <h3 className="text-slate-500 text-[10px] font-black uppercase mb-1">Total em Aberto</h3>
                <p className="text-2xl font-black text-emerald-600">
                    R$ {totalBalanceDue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <FileText className="text-blue-600 mb-4" size={20}/>
                <h3 className="text-slate-500 text-[10px] font-black uppercase mb-1">Contratos</h3>
                <p className="text-2xl font-black text-slate-900">{proposals.length}</p>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <LifeBuoy className="text-amber-600 mb-4" size={20}/>
                <h3 className="text-slate-500 text-[10px] font-black uppercase mb-1">Suporte</h3>
                <p className="text-2xl font-black text-slate-900">{openTickets.length}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
                <h3 className="font-black text-xl uppercase tracking-tighter">Próximos Vencimentos</h3>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-50">
                        {pendingInvoices.length > 0 ? pendingInvoices.slice(0, 5).map(inv => (
                            <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-2xl transition-colors"><Clock size={20}/></div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase text-[10px] tracking-tight">{inv.customer}</p>
                                        <p className="text-xs font-bold text-slate-600">{inv.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-900 text-sm">
                                        R$ {(Number(inv.amount) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    </p>
                                </div>
                            </div>
                        )) : <div className="p-16 text-center text-slate-400 font-bold uppercase text-[10px]">Sem pendências financeiras.</div>}
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <h3 className="font-black text-xl uppercase tracking-tighter">Sua Carteira</h3>
                <div className="space-y-3">
                    {clients.map(unit => (
                        <div key={unit.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:border-indigo-400 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400">{unit.name.charAt(0)}</div>
                                <div className="min-w-0"><p className="text-xs font-black text-slate-800 uppercase truncate max-w-[140px]">{unit.name}</p></div>
                            </div>
                            <Badge color={unit.status === 'Active' ? 'green' : 'red'}>{unit.status === 'Active' ? 'OK' : 'RISCO'}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
