
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InvoiceStatus, Invoice, Client } from '../types';
import { DollarSign, Download, Plus, X, Search, CreditCard, Zap, Loader2, Filter, Layers, CheckCircle, Circle, Calendar } from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';
import { createIuguInvoice } from '../services/bridgeService';

export const Finance: React.FC = () => {
    const { invoices, updateInvoice, addInvoice, addInvoicesBulk, addSystemNotification, clients, logAction } = useData();
    const { currentUser } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [isGeneratingIugu, setIsGeneratingIugu] = useState<string | null>(null);

    // --- BULK INVOICING STATE ---
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkDescription, setBulkDescription] = useState(`Mensalidade LPR - Ref. ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);

    const activeClients = useMemo(() => clients.filter(c => c.status === 'Active'), [clients]);

    const handleToggleBulkClient = (id: string) => {
        const next = new Set(selectedClientIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedClientIds(next);
    };

    const handleSelectAll = () => {
        if (selectedClientIds.size === activeClients.length) {
            setSelectedClientIds(new Set());
        } else {
            setSelectedClientIds(new Set(activeClients.map(c => c.id)));
        }
    };

    const handleGenerateBulk = () => {
        const clientsToInvoice = activeClients.filter(c => selectedClientIds.has(c.id));
        
        if (clientsToInvoice.length === 0) {
            alert("Selecione ao menos um cliente.");
            return;
        }

        const newInvoices: Invoice[] = clientsToInvoice.map(client => ({
            id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'Income',
            customer: client.name,
            amount: client.totalSpecialPrice || client.ltv || 0,
            dueDate: bulkDate,
            status: InvoiceStatus.PENDING,
            description: bulkDescription,
            organizationId: currentUser?.organizationId,
            metadata: { generated_via: 'Bulk Engine' }
        }));

        addInvoicesBulk(currentUser, newInvoices);
        logAction(currentUser, 'Bulk Invoicing', `Geradas ${newInvoices.length} faturas para o vencimento ${bulkDate}`, 'Financeiro');
        addSystemNotification("Sucesso", `${newInvoices.length} faturas geradas com sucesso.`, "success");
        setIsBulkModalOpen(false);
        setSelectedClientIds(new Set());
    };

    const handleCreateIugu = async (inv: Invoice) => {
        const client = clients.find(c => c.name === inv.customer);
        if (!client) {
            addSystemNotification("Erro", `Cliente "${inv.customer}" não localizado.`, "alert");
            return;
        }
        if (!client.document) {
            addSystemNotification("Dados Incompletos", "CNPJ/CPF obrigatório para Iugu.", "warning");
            return;
        }

        setIsGeneratingIugu(inv.id);
        try {
            const iuguData = {
                email: client.email || 'financeiro@cliente.com',
                due_date: inv.dueDate.split('T')[0],
                items: [{ description: inv.description, quantity: 1, price_cents: Math.round(inv.amount * 100) }],
                customer_name: client.name,
                payer_cpf_cnpj: client.document.replace(/\D/g, '')
            };
            const result = await createIuguInvoice(iuguData);
            if (result.secure_url) {
                updateInvoice(currentUser, { ...inv, metadata: { ...inv.metadata, iugu_id: result.id, iugu_url: result.secure_url } });
                addSystemNotification("Sucesso", "Fatura Iugu gerada.", "success");
            }
        } catch (e) {
            addSystemNotification("Erro", "Falha na comunicação com a Iugu.", "alert");
        } finally { setIsGeneratingIugu(null); }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 inv.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
            const matchesType = typeFilter === 'All' || inv.type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [invoices, searchTerm, statusFilter, typeFilter]);

    return (
        <div className="p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financeiro</h1>
                    <p className="text-slate-500 dark:text-slate-400">Controle bancário e automação de cobrança Iugu.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsBulkModalOpen(true)}
                        className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-indigo-50 transition flex items-center gap-2"
                    >
                        <Layers size={20}/> Gerar Lote Mensal
                    </button>
                    <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition flex items-center gap-2">
                        <Plus size={20}/> Nova Fatura
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar faturas..." className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400"/>
                        <select 
                            className="bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">Todos Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                            <option value="Atrasado">Atrasado</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-black sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4">Cliente / Descrição</th>
                                <th className="p-4">Vencimento</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Checkout Iugu</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{inv.customer}</p>
                                        <p className="text-[10px] text-slate-500 truncate max-w-xs mt-1">{inv.description}</p>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                    <td className={`p-4 text-right font-black ${inv.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>R$ {inv.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="p-4 text-center">
                                        {inv.metadata?.iugu_url ? (
                                            <a href={inv.metadata.iugu_url} target="_blank" rel="noreferrer" className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 mx-auto w-fit hover:scale-110 transition shadow-sm border border-blue-200 dark:border-blue-800">
                                                <Zap size={12} fill="currentColor"/> PGTO GERADO
                                            </a>
                                        ) : (
                                            inv.type === 'Income' && (
                                                <button onClick={() => handleCreateIugu(inv)} disabled={isGeneratingIugu === inv.id} className="text-slate-400 hover:text-blue-600 transition flex flex-col items-center gap-1 mx-auto disabled:opacity-50">
                                                    {isGeneratingIugu === inv.id ? <Loader2 className="animate-spin" size={18}/> : <><CreditCard size={18}/> <span className="text-[9px] font-bold uppercase">Emitir Iugu</span></>}
                                                </button>
                                            )
                                        )}
                                    </td>
                                    <td className="p-4 text-center"><Badge color={inv.status === 'Pago' ? 'green' : inv.status === 'Atrasado' ? 'red' : 'yellow'}>{inv.status}</Badge></td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-blue-600 transition"><Download size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 italic font-medium">Nenhuma fatura localizada no filtro atual.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BULK INVOICING MODAL */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="font-black text-xl uppercase tracking-tighter">Faturamento em Lote</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{activeClients.length} Clientes Ativos Detectados</p>
                            </div>
                            <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors p-2"><X size={24}/></button>
                        </div>
                        
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data de Vencimento</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-3.5 text-indigo-500" size={18}/>
                                        <input type="date" className="w-full pl-12 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-white dark:bg-slate-800" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor Total Estimado</label>
                                    <div className="w-full border-2 border-slate-50 dark:border-slate-800 rounded-xl p-3 font-black text-indigo-600 bg-slate-50 dark:bg-slate-900/50">
                                        R$ {activeClients.filter(c => selectedClientIds.has(c.id)).reduce((acc, c) => acc + (c.totalSpecialPrice || c.ltv || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição das Faturas</label>
                                <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-white dark:bg-slate-800" value={bulkDescription} onChange={e => setBulkDescription(e.target.value)} />
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-sm uppercase tracking-tight">Lista de Clientes</h4>
                                    <button onClick={handleSelectAll} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">
                                        {selectedClientIds.size === activeClients.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {activeClients.map(client => {
                                        const isSelected = selectedClientIds.has(client.id);
                                        return (
                                            <div 
                                                key={client.id}
                                                onClick={() => handleToggleBulkClient(client.id)}
                                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {isSelected ? <CheckCircle className="text-indigo-600" size={20}/> : <Circle className="text-slate-300" size={20}/>}
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{client.name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold">{client.segment}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-900 dark:text-white">R$ {(client.totalSpecialPrice || client.ltv || 0).toLocaleString()}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold">VALOR BASE</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                {selectedClientIds.size} faturas prontas
                            </div>
                            <button 
                                onClick={handleGenerateBulk}
                                disabled={selectedClientIds.size === 0}
                                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/30 hover:scale-[1.02] transition disabled:opacity-50"
                            >
                                GERAR COBRANÇAS EM LOTE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
