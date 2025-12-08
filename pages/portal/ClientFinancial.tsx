
import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceStatus } from '../../types';
import { DollarSign, Download, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { Badge } from '../../components/Widgets';

export const ClientFinancial: React.FC = () => {
  const { invoices, clients } = useData();
  const { currentUser } = useAuth();

  // Encontrar o cliente vinculado ao usuário logado
  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  // Filtrar faturas deste cliente (por nome, já que o mock usa nome)
  const myInvoices = useMemo(() => {
    if (!currentClient) return [];
    return invoices.filter(inv => inv.customer === currentClient.name);
  }, [invoices, currentClient]);

  const stats = useMemo(() => {
      const open = myInvoices.filter(i => i.status === InvoiceStatus.PENDING || i.status === InvoiceStatus.SENT);
      const overdue = myInvoices.filter(i => i.status === InvoiceStatus.OVERDUE);
      
      return {
          openAmount: open.reduce((acc, curr) => acc + curr.amount, 0),
          openCount: open.length,
          overdueAmount: overdue.reduce((acc, curr) => acc + curr.amount, 0),
          overdueCount: overdue.length
      };
  }, [myInvoices]);

  const handleDownload = (id: string) => {
      alert(`Download da fatura ${id} iniciado...`);
  };

  if (!currentClient) {
      return <div className="p-8 text-center text-slate-500">Perfil de cliente não vinculado corretamente. Contate o suporte.</div>;
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
            <p className="text-slate-500">Histórico de faturas e pagamentos da {currentClient.name}.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Aberto / Pendente</p>
                    <p className="text-2xl font-bold text-slate-800">R$ {stats.openAmount.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 font-bold">{stats.openCount} faturas</p>
                </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-full">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Em Atraso</p>
                    <p className="text-2xl font-bold text-red-700">R$ {stats.overdueAmount.toLocaleString()}</p>
                    <p className="text-xs text-red-600 font-bold">{stats.overdueCount} faturas</p>
                </div>
            </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
                        <tr>
                            <th className="p-4">Descrição / ID</th>
                            <th className="p-4">Vencimento</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {myInvoices.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    Nenhuma fatura encontrada.
                                </td>
                            </tr>
                        ) : (
                            myInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800">{inv.description}</p>
                                        <p className="text-xs text-slate-400 font-mono">#{inv.id}</p>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {new Date(inv.dueDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">
                                        R$ {inv.amount.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <Badge color={
                                            inv.status === InvoiceStatus.PAID ? 'green' : 
                                            inv.status === InvoiceStatus.OVERDUE ? 'red' : 
                                            inv.status === InvoiceStatus.SENT ? 'blue' : 'yellow'
                                        }>
                                            {inv.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleDownload(inv.id)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Baixar Boleto/PDF"
                                        >
                                            <Download size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
