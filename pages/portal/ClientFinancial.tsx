
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
    ChevronDown,
    Search,
    Calendar,
    X,
    FileDown,
    // Fix: Added missing TrendingUp import
    TrendingUp
} from 'lucide-react';
import { Badge } from '../../components/Widgets';

export const ClientFinancial: React.FC = () => {
  const { invoices, clients } = useData();
  const { currentUser } = useAuth();
  
  // States de Filtro
  const [unitFilter, setUnitFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // all, 30d, 90d, year
  const [searchTerm, setSearchTerm] = useState('');

  // Lista de unidades únicas baseada nas faturas para o filtro
  const myUnits = useMemo(() => {
      return Array.from(new Set(invoices.map(i => i.customer))).sort();
  }, [invoices]);

  // Lógica de Filtragem Cruzada
  const filteredInvoices = useMemo(() => {
      return invoices.filter(i => {
          const matchesUnit = unitFilter === 'all' || i.customer === unitFilter;
          const matchesStatus = statusFilter === 'all' || 
                               (statusFilter === 'paid' && i.status === InvoiceStatus.PAID) ||
                               (statusFilter === 'pending' && i.status === InvoiceStatus.PENDING) ||
                               (statusFilter === 'overdue' && (i.status === InvoiceStatus.OVERDUE || (i.status !== InvoiceStatus.PAID && new Date(i.dueDate) < new Date())));
          
          const invoiceDate = new Date(i.dueDate);
          const now = new Date();
          let matchesDate = true;
          if (dateRange === '30d') {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(now.getDate() - 30);
              matchesDate = invoiceDate >= thirtyDaysAgo;
          } else if (dateRange === 'year') {
              matchesDate = invoiceDate.getFullYear() === now.getFullYear();
          }

          const matchesSearch = i.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                i.customer.toLowerCase().includes(searchTerm.toLowerCase());

          return matchesUnit && matchesStatus && matchesDate && matchesSearch;
      });
  }, [invoices, unitFilter, statusFilter, dateRange, searchTerm]);

  // KPIs Recalculados em Tempo Real
  const stats = useMemo(() => {
      const open = filteredInvoices.filter(i => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED);
      const overdue = filteredInvoices.filter(i => i.status === InvoiceStatus.OVERDUE || (i.status !== InvoiceStatus.PAID && new Date(i.dueDate) < new Date()));
      const paid = filteredInvoices.filter(i => i.status === InvoiceStatus.PAID);
      
      return {
          openAmount: open.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
          overdueCount: overdue.length,
          overdueAmount: overdue.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
          paidAmount: paid.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
      };
  }, [filteredInvoices]);

  const clearFilters = () => {
      setUnitFilter('all');
      setStatusFilter('all');
      setDateRange('all');
      setSearchTerm('');
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-20">
        {/* Header Estratégico */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Financeiro de Grupo</h1>
                <p className="text-slate-500 font-medium">Gestão consolidada: <strong>{currentUser?.managedGroupName || 'Unidade Independente'}</strong></p>
            </div>
            
            <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-xl flex items-center gap-2">
                <FileDown size={18}/> Exportar Relatório (PDF)
            </button>
        </div>

        {/* BARRA DE FILTROS SMART */}
        <div className="bg-white border border-slate-200 p-2 rounded-[2rem] shadow-sm flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px] relative ml-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar por descrição ou unidade..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="h-8 w-px bg-slate-100 hidden lg:block mx-2"></div>

            <div className="flex items-center gap-2 px-3">
                <Filter size={16} className="text-slate-400"/>
                <select 
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="bg-transparent border-none text-xs font-black uppercase outline-none cursor-pointer text-slate-700"
                >
                    <option value="all">Unidades: Todas</option>
                    {myUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
            </div>

            <div className="flex items-center gap-2 px-3 border-l border-slate-100">
                <Calendar size={16} className="text-slate-400"/>
                <select 
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-transparent border-none text-xs font-black uppercase outline-none cursor-pointer text-slate-700"
                >
                    <option value="all">Período: Tudo</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="year">Este Ano</option>
                </select>
            </div>

            <div className="flex items-center gap-2 px-3 border-l border-slate-100 mr-2">
                <div className={`w-2 h-2 rounded-full ${statusFilter === 'all' ? 'bg-slate-400' : statusFilter === 'paid' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent border-none text-xs font-black uppercase outline-none cursor-pointer text-slate-700"
                >
                    <option value="all">Status: Todos</option>
                    <option value="pending">Pendentes</option>
                    <option value="paid">Pagos</option>
                    <option value="overdue">Vencidos</option>
                </select>
            </div>

            {(unitFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all' || searchTerm) && (
                <button 
                    onClick={clearFilters}
                    className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors ml-auto mr-1"
                    title="Limpar Filtros"
                >
                    <X size={18}/>
                </button>
            )}
        </div>

        {/* Alerta de Inadimplência Dinâmico */}
        {stats.overdueCount > 0 && (
            <div className="bg-red-600 text-white p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-red-600/30 animate-pulse">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-white/20 rounded-2xl"><AlertCircle size={32}/></div>
                    <div>
                        <h4 className="font-black text-xl uppercase tracking-tighter">Atenção ao Fluxo</h4>
                        <p className="text-red-100 text-sm font-medium">Detectamos {stats.overdueCount} pendência(s) crítica(s) no filtro selecionado.</p>
                    </div>
                </div>
                <div className="text-center md:text-right bg-white/10 px-6 py-3 rounded-2xl border border-white/20">
                    <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-1">Montante Vencido</p>
                    <p className="text-3xl font-black">R$ {stats.overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
        )}

        {/* KPIs Reativos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-6"><Clock size={28} /></div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total a Pagar (Filtrado)</h3>
                <p className="text-3xl font-black text-slate-900">R$ {stats.openAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6"><CheckCircle size={28} /></div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Liquidado (Filtrado)</h3>
                <p className="text-3xl font-black text-slate-900">R$ {stats.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute right-[-20px] bottom-[-20px] text-white/5 rotate-12"><DollarSign size={150}/></div>
                <div className="p-4 bg-indigo-500 text-white rounded-2xl w-fit mb-6 shadow-lg shadow-indigo-500/20"><TrendingUp size={28} /></div>
                <h3 className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Status de Crédito</h3>
                <p className={`text-3xl font-black uppercase ${stats.overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {stats.overdueCount > 0 ? 'Restrito' : 'Excelente'}
                </p>
            </div>
        </div>

        {/* TABELA DE RESULTADOS */}
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                    <CreditCard size={20} className="text-indigo-600"/> Listagem de Cobranças
                </h3>
                <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-200 uppercase">
                    {filteredInvoices.length} Registros Encontrados
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-8">Unidade</th>
                            <th className="p-8">Descrição / Referência</th>
                            <th className="p-8">Vencimento</th>
                            <th className="p-8 text-right">Valor</th>
                            <th className="p-8 text-center">Situação</th>
                            <th className="p-8 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredInvoices.map(inv => {
                            const isOverdue = inv.status !== 'Pago' && new Date(inv.dueDate) < new Date();
                            return (
                                <tr key={inv.id} className="hover:bg-slate-50 transition group">
                                    <td className="p-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Building2 size={16}/>
                                            </div>
                                            <span className="font-black text-slate-900 uppercase text-xs truncate max-w-[150px]">{inv.customer}</span>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <span className="font-bold text-slate-600">{inv.description}</span>
                                    </td>
                                    <td className="p-8">
                                        <span className={`font-bold ${isOverdue ? 'text-red-500' : 'text-slate-600'}`}>{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</span>
                                    </td>
                                    <td className="p-8 text-right font-black text-slate-900 text-lg">R$ {(Number(inv.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="p-8 text-center">
                                        <Badge color={inv.status === 'Pago' ? 'green' : isOverdue ? 'red' : 'yellow'}>
                                            {inv.status === 'Pago' ? 'LIQUIDADO' : isOverdue ? 'VENCIDO' : 'ABERTO'}
                                        </Badge>
                                    </td>
                                    <td className="p-8 text-right">
                                        <div className="flex justify-end gap-3">
                                            {inv.metadata?.iugu_url && inv.status !== 'Pago' ? (
                                                <a href={inv.metadata.iugu_url} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition shadow-lg flex items-center gap-2">
                                                    <Zap size={14} fill="currentColor" className="text-yellow-400"/> Pagar Agora
                                                </a>
                                            ) : (
                                                <button className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition">
                                                    <Download size={18}/>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-32 text-center">
                                    <div className="flex flex-col items-center opacity-30">
                                        <Search size={48} className="mb-4" />
                                        <p className="font-black uppercase text-xs tracking-widest">Nenhuma fatura encontrada com estes filtros</p>
                                        <button onClick={clearFilters} className="mt-4 text-indigo-600 font-bold underline">Limpar todos os filtros</button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};