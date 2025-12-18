
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InvoiceStatus, Invoice } from '../types';
import { DollarSign, Download, Plus, X, ArrowUpRight, ArrowDownRight, Search, CreditCard, Zap, Loader2 } from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';
import { createIuguInvoice } from '../services/bridgeService';

export const Finance: React.FC = () => {
    const { invoices, updateInvoice, addInvoice, addSystemNotification, clients } = useData();
    const { currentUser } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isGeneratingIugu, setIsGeneratingIugu] = useState<string | null>(null);

    const handleCreateIugu = async (inv: Invoice) => {
        // 1. Localizar o cliente para pegar dados reais (CPF/CNPJ e Email)
        const client = clients.find(c => c.name === inv.customer);
        
        if (!client) {
            addSystemNotification("Erro", `Cliente "${inv.customer}" não localizado no CRM para extração de dados.`, "alert");
            return;
        }

        if (!client.document) {
            addSystemNotification("Dados Incompletos", "O cliente não possui CPF/CNPJ cadastrado. A Iugu exige este dado.", "warning");
            return;
        }

        setIsGeneratingIugu(inv.id);
        
        try {
            // 2. Montar payload com dados REAIS do cliente
            const iuguData = {
                email: client.email || 'financeiro@cliente.com',
                due_date: inv.dueDate.split('T')[0],
                items: [{ 
                    description: inv.description, 
                    quantity: 1, 
                    price_cents: Math.round(inv.amount * 100) 
                }],
                customer_name: client.name,
                payer_cpf_cnpj: client.document.replace(/\D/g, '') // Limpa pontuação
            };

            const result = await createIuguInvoice(iuguData);
            
            if (result.secure_url) {
                // 3. Persistir no Banco de Dados (Supabase)
                const updatedInvoice = { 
                    ...inv, 
                    metadata: { 
                        ...inv.metadata, 
                        iugu_id: result.id, 
                        iugu_url: result.secure_url,
                        generated_at: new Date().toISOString()
                    }
                };
                
                updateInvoice(currentUser, updatedInvoice);
                addSystemNotification("Sucesso", `Cobrança Iugu gerada e salva para ${inv.customer}`, "success");
            } else {
                throw new Error("Resposta da Iugu sem URL segura.");
            }
        } catch (e: any) {
            console.error("Iugu Flow Error:", e);
            addSystemNotification("Erro", "Falha ao comunicar com Iugu ou Bridge Offline. Verifique os logs do servidor.", "alert");
        } finally { 
            setIsGeneratingIugu(null); 
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => 
            inv.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
            inv.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [invoices, searchTerm]);

    return (
        <div className="p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financeiro</h1>
                    <p className="text-slate-500 dark:text-slate-400">Controle bancário e automação de cobrança Iugu.</p>
                </div>
                <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-emerald-700 transition flex items-center gap-2">
                    <Plus size={20}/> Nova Fatura
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex justify-between">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar faturas..." className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-bold">
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
                                        <p className="font-bold text-slate-900 dark:text-white">{inv.customer}</p>
                                        <p className="text-[10px] text-slate-500">{inv.description}</p>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                    <td className={`p-4 text-right font-bold ${inv.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>R$ {inv.amount.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        {inv.metadata?.iugu_url ? (
                                            <a 
                                                href={inv.metadata.iugu_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 mx-auto w-fit hover:scale-110 transition shadow-sm border border-blue-200"
                                            >
                                                <Zap size={12} fill="currentColor"/> PGTO GERADO
                                            </a>
                                        ) : (
                                            inv.type === 'Income' && (
                                                <button 
                                                    onClick={() => handleCreateIugu(inv)} 
                                                    disabled={isGeneratingIugu === inv.id} 
                                                    className="text-slate-400 hover:text-blue-600 transition flex flex-col items-center gap-1 mx-auto disabled:opacity-50"
                                                    title="Emitir na Iugu"
                                                >
                                                    {isGeneratingIugu === inv.id ? <Loader2 className="animate-spin" size={18}/> : <><CreditCard size={18}/> <span className="text-[9px] font-bold uppercase">Emitir Iugu</span></>}
                                                </button>
                                            )
                                        )}
                                    </td>
                                    <td className="p-4 text-center"><Badge color={inv.status === 'Pago' ? 'green' : 'yellow'}>{inv.status}</Badge></td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-blue-600 transition"><Download size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
