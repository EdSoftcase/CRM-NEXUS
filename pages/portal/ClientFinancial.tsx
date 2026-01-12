
import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceStatus } from '../../types';
import { 
    DollarSign, 
    Clock, 
    AlertCircle, 
    CheckCircle, 
    Zap, 
    CreditCard,
    Download,
    Building2,
    Filter,
    Search,
    Calendar,
    X,
    FileDown,
    TrendingUp
} from 'lucide-react';
import { Badge } from '../../components/Widgets';

export const ClientFinancial: React.FC = () => {
  const { invoices, clients } = useData();
  const { currentUser } = useAuth();
  const [unitFilter, setUnitFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const deepNormalize = (s: string) => 
    s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

  // FILTRAGEM DE SEGURANÇA E NEGÓCIO REFORÇADA
  const filteredInvoices = useMemo(() => {
      if (!currentUser || currentUser.role !== 'client') return [];
      
      const userGroup = deepNormalize(currentUser.managedGroupName || "");
      const userEmail = currentUser.email?.toLowerCase().trim() || "";
      const userName = deepNormalize(currentUser.name);

      // Conjunto de unidades que o usuário tem acesso (já filtrado no DataContext)
      const accessibleUnitNames = new Set(clients.map(c => deepNormalize(c.name)));

      return invoices.filter(i => {
          // 1. Barreira de Identidade
          const itemGroup = deepNormalize(i.groupName || "");
          const itemCustomer = deepNormalize(i.customer || "");
          const itemEmail = (i.clientEmail || "").toLowerCase().trim();

          let hasAccess = false;
          
          // Match por grupo (Prioridade máxima)
          if (userGroup && itemGroup === userGroup) hasAccess = true;
          // Match por email
          else if (userEmail && itemEmail === userEmail) hasAccess = true;
          // Match por nome do usuário
          else if (userName && itemCustomer === userName) hasAccess = true;
          // Match por pertencer a uma das unidades visíveis do cliente (Fallback definitivo)
          else if (accessibleUnitNames.has(itemCustomer)) hasAccess = true;

          if (!hasAccess) return false;

          // 2. Filtros de UI
          const matchesUnit = unitFilter === 'all' || i.customer === unitFilter;
          const matchesStatus = statusFilter === 'all' || 
                               (statusFilter === 'paid' && i.status === InvoiceStatus.PAID) ||
                               (statusFilter === 'pending' && i.status === InvoiceStatus.PENDING) ||
                               (statusFilter === 'overdue' && (i.status === InvoiceStatus.OVERDUE || (i.status !== InvoiceStatus.PAID && new Date(i.dueDate) < new Date())));
          
          const matchesSearch = i.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                i.customer.toLowerCase().includes(searchTerm.toLowerCase());

          return matchesUnit && matchesStatus && matchesSearch;
      });
  }, [invoices, clients, unitFilter, statusFilter, searchTerm, currentUser]);

  const myUnits = useMemo(() => {
      return Array.from(new Set(filteredInvoices.map(i => i.customer))).sort();
  }, [filteredInvoices]);

  const stats = useMemo(() => {
      // Filtragem correta das faturas que afetam o saldo (Ignora canceladas)
      const validInvoices = filteredInvoices.filter(i => i.status !== InvoiceStatus.CANCELLED);
      
      const open = validInvoices.filter(i => i.status !== InvoiceStatus.PAID);
      const overdue = validInvoices.filter(i => i.status === InvoiceStatus.OVERDUE || (i.status !== InvoiceStatus.PAID && new Date(i.dueDate) < new Date()));
      const paid = validInvoices.filter(i => i.status === InvoiceStatus.PAID);
      
      return {
          openAmount: open.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
          overdueCount: overdue.length,
          overdueAmount: overdue.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
          paidAmount: paid.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      };
  }, [filteredInvoices]);

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Financeiro</h1>
                <p className="text-slate-500 font-medium">Gestão consolidada para: <strong>{currentUser?.managedGroupName || currentUser?.name}</strong></p>
            </div>
            <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-xl flex items-center gap-2">
                <FileDown size={18}/> Exportar PDF
            </button>
        </div>

        <div className="bg-white border border-slate-200 p-2 rounded-[2rem] shadow-sm flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px] relative ml-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar faturas..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 px-3 border-l border-slate-100">
                <Filter size={16} className="text-slate-400"/>
                <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase outline-none cursor-pointer text-slate-700">
                    <option value="all">Unidades: Todas</option>
                    {myUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2 px-3 border-l border-slate-100">
                <div className={`w-2 h-2 rounded-full ${statusFilter === 'all' ? 'bg-slate-400' : statusFilter === 'paid' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase outline-none cursor-pointer text-slate-700">
                    <option value="all">Status: Todos</option>
                    <option value="pending">Pendentes</option>
                    <option value="paid">Pagos</option>
                    <option value="overdue">Vencidos</option>
                </select>
            </div>
        </div>

        {stats.overdueCount > 0 && (
            <div className="bg-red-600 text-white p-6 rounded-[2rem] flex items-center justify-between shadow-2xl animate-pulse">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-white/20 rounded-2xl"><AlertCircle size={32}/></div>
                    <div><h4 className="font-black text-xl uppercase tracking-tighter">Vencimentos Pendentes</h4><p className="text-red-100 text-sm font-medium">Você possui {stats.overdueCount} fatura(s) em atraso.</p></div>
                </div>
                <div className="text-right bg-white/10 px-6 py-3 rounded-2xl border border-white/20">
                    <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-1">Total Vencido</p>
                    <p className="text-3xl font-black">R$ {stats.overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-6"><Clock size={28} /></div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total em Aberto</h3>
                <p className="text-3xl font-black text-slate-900">R$ {stats.openAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6"><CheckCircle size={28} /></div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Liquidado</h3>
                <p className="text-3xl font-black text-slate-900">R$ {stats.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute right-[-20px] bottom-[-20px] text-white/5 rotate-12"><DollarSign size={150}/></div>
                <div className="p-4 bg-indigo-500 text-white rounded-2xl w-fit mb-6 shadow-lg shadow-indigo-500/20"><TrendingUp size={28} /></div>
                <h3 className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Situação Global</h3>
                <p className={`text-3xl font-black uppercase ${stats.overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {stats.overdueCount > 0 ? 'Restrito' : 'Regular'}
                </p>
            </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3"><CreditCard size={20} className="text-indigo-600"/> Histórico de Faturamento</h3>
                <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-200 uppercase">{filteredInvoices.length} Registros</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="p-8">Unidade</th><th className="p-8">Descrição</th><th className="p-8">Vencimento</th><th className="p-8 text-right">Valor</th><th className="p-8 text-center">Status</th><th className="p-8 text-right">Link</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredInvoices.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhuma fatura localizada para o seu perfil.</td>
                            </tr>
                        ) : (
                            filteredInvoices.map(inv => {
                                const isOverdue = inv.status !== InvoiceStatus.PAID && new Date(inv.dueDate) < new Date();
                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                                        <td className="p-8 font-black text-slate-900 uppercase text-xs">{inv.customer}</td>
                                        <td className="p-8 font-bold text-slate-600">{inv.description}</td>
                                        <td className="p-8 font-bold">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-8 text-right font-black text-slate-900">R$ {(Number(inv.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-8 text-center"><Badge color={inv.status === InvoiceStatus.PAID ? 'green' : isOverdue ? 'red' : 'yellow'}>{inv.status === InvoiceStatus.PAID ? 'LIQUIDADO' : isOverdue ? 'VENCIDO' : 'ABERTO'}</Badge></td>
                                        <td className="p-8 text-right">
                                            {inv.metadata?.iugu_url && inv.status !== InvoiceStatus.PAID ? (
                                                <a href={inv.metadata.iugu_url} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg inline-flex items-center gap-2"><Zap size={14} fill="currentColor" className="text-yellow-400"/> Pagar</a>
                                            ) : (
                                                <button className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition"><Download size={18}/></button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
