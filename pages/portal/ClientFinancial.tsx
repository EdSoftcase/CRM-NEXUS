
import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceStatus } from '../../types';
import { 
    DollarSign, 
    Clock, 
    AlertCircle, 
    CheckCircle, 
    Zap, 
    TrendingUp,
    History,
    FileText,
    ArrowUpRight,
    CreditCard,
    Download
} from 'lucide-react';
import { Badge } from '../../components/Widgets';

export const ClientFinancial: React.FC = () => {
  const { invoices, clients, proposals } = useData();
  const { currentUser } = useAuth();

  const currentClient = useMemo(() => {
    if (!currentUser) return null;
    const email = currentUser.email?.toLowerCase().trim();
    return clients.find(c => c.id === currentUser.relatedClientId) || 
           clients.find(c => c.email?.toLowerCase().trim() === email);
  }, [clients, currentUser]);

  const myInvoices = useMemo(() => {
    if (!currentClient) return [];
    return invoices
      .filter(inv => inv.customer === currentClient.name)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [invoices, currentClient]);

  const acceptedProposals = useMemo(() => {
      if (!currentClient) return [];
      const clientName = currentClient.name.toLowerCase().trim();
      return proposals.filter(p => {
          if (p.status !== 'Accepted') return false;
          if (p.clientId && p.clientId === currentClient.id) return true;
          return p.companyName?.toLowerCase().trim() === clientName;
      }).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  }, [proposals, currentClient]);

  const stats = useMemo(() => {
      const open = myInvoices.filter(i => i.status === InvoiceStatus.PENDING || i.status === InvoiceStatus.SENT);
      const overdue = myInvoices.filter(i => i.status === InvoiceStatus.OVERDUE);
      
      return {
          openAmount: open.reduce((acc, curr) => acc + (curr.amount || 0), 0),
          overdueAmount: overdue.reduce((acc, curr) => acc + (curr.amount || 0), 0),
          totalMRR: acceptedProposals.reduce((acc, curr) => acc + (curr.monthlyCost || 0), 0)
      };
  }, [myInvoices, acceptedProposals]);

  if (!currentClient) return <div className="p-20 text-center text-slate-400 font-bold">Carregando dados financeiros...</div>;

  return (
    <div className="space-y-10 animate-fade-in font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Financeiro & Pagamentos</h1>
                <p className="text-slate-500 font-medium">Controle de faturas e histórico contratual.</p>
            </div>
            {stats.overdueAmount > 0 && (
                <div className="bg-red-50 border border-red-200 px-6 py-4 rounded-2xl flex items-center gap-4 animate-pulse shadow-xl shadow-red-500/10">
                    <AlertCircle className="text-red-600" size={24}/>
                    <div>
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Atenção: Débitos em Atraso</p>
                        <p className="text-lg font-black text-red-700">R$ {stats.overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            )}
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-indigo-500 transition-all">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform"><TrendingUp size={28} /></div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Investimento Mensal</h3>
                <p className="text-3xl font-black text-slate-900">R$ {stats.totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-amber-500 transition-all">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform"><Clock size={28} /></div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Pendente</h3>
                <p className="text-3xl font-black text-slate-900">R$ {stats.openAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-emerald-500 transition-all">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform"><CheckCircle size={28} /></div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Situação Contratual</h3>
                <p className={`text-3xl font-black uppercase tracking-tighter ${stats.overdueAmount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {stats.overdueAmount > 0 ? 'Pendente' : 'Regular'}
                </p>
            </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                    <CreditCard size={20} className="text-indigo-600"/> Histórico de Cobranças
                </h3>
                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Filtrar por Período</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-8">Vencimento</th>
                            <th className="p-8">Descrição / Referência</th>
                            <th className="p-8 text-right">Valor Bruto</th>
                            <th className="p-8 text-center">Status</th>
                            <th className="p-8 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {myInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50 transition group">
                                <td className="p-8 font-bold text-slate-600">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="p-8">
                                    <p className="font-bold text-slate-900 truncate max-w-xs uppercase">{inv.description}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {inv.id.split('-').pop()}</p>
                                </td>
                                <td className="p-8 text-right font-black text-slate-900 text-lg">R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="p-8 text-center">
                                    <Badge color={inv.status === 'Pago' ? 'green' : inv.status === 'Atrasado' ? 'red' : 'yellow'}>
                                        {inv.status.toUpperCase()}
                                    </Badge>
                                </td>
                                <td className="p-8 text-right">
                                    <div className="flex justify-end gap-3">
                                        {inv.metadata?.iugu_url && inv.status !== 'Pago' ? (
                                            <a href={inv.metadata.iugu_url} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                                                <Zap size={14} fill="currentColor"/> Pagar Pix
                                            </a>
                                        ) : (
                                            <button className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition">
                                                <Download size={18}/>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {myInvoices.length === 0 && (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic">Nenhuma fatura encontrada para sua unidade.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
