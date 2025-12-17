import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InvoiceStatus, Invoice } from '../types';
import { DollarSign, AlertCircle, CheckCircle, FileText, Send, Clock, Calendar as CalendarIcon, List, Layout, ChevronLeft, ChevronRight, Search, TrendingUp, Download, Loader2, Upload, FileSpreadsheet, PieChart as PieChartIcon, Target, Filter, Zap, Repeat, Plus, X, Calendar, Wallet, ArrowUpRight, ArrowDownRight, Tag, BarChart2, Activity } from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';
import { InvoiceDocument } from '../components/InvoiceDocument';
import * as XLSX from 'xlsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie, ComposedChart, Line, ReferenceLine, LabelList } from 'recharts';

export const Finance: React.FC = () => {
    const { invoices, clients, updateInvoiceStatus, addSystemNotification, addInvoicesBulk, addInvoice, financialCategories } = useData();
    const { currentUser } = useAuth();
    
    // Navigation & View States
    const [viewMode, setViewMode] = useState<'analytics' | 'list'>('analytics');
    const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expense'>('overview');
    const [showAdvanced, setShowAdvanced] = useState(false); // Toggle for advanced charts
    
    // Filters
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PDF Generation State
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [invoiceToDownload, setInvoiceToDownload] = useState<Invoice | null>(null);

    // New Transaction Modal State
    const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
    const [transactionForm, setTransactionForm] = useState({
        type: 'Income' as 'Income' | 'Expense',
        entity: '', // Customer or Supplier
        description: '',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        status: InvoiceStatus.PENDING,
        costCenterId: ''
    });

    // --- CHART COLORS ---
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
    const STATUS_COLORS = {
        [InvoiceStatus.PAID]: '#10b981',
        [InvoiceStatus.PENDING]: '#f59e0b',
        [InvoiceStatus.OVERDUE]: '#ef4444',
        [InvoiceStatus.SENT]: '#3b82f6',
        [InvoiceStatus.DRAFT]: '#94a3b8',
        [InvoiceStatus.CANCELLED]: '#64748b'
    };

    // --- FILTERED DATA ---
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesTab = activeTab === 'overview' ? true : 
                               activeTab === 'income' ? inv.type === 'Income' : 
                               inv.type === 'Expense';
            
            const matchesSearch = (inv.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (inv.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  inv.id.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
            
            return matchesTab && matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [invoices, activeTab, searchTerm, statusFilter]);

    // --- ANALYTICS DATA ---
    const analyticsData = useMemo(() => {
        // Totals
        const totalReceivables = invoices.filter(i => i.type === 'Income' && i.status !== InvoiceStatus.DRAFT && i.status !== InvoiceStatus.CANCELLED).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalPayables = invoices.filter(i => i.type === 'Expense' && i.status !== InvoiceStatus.DRAFT && i.status !== InvoiceStatus.CANCELLED).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalOverdue = invoices.filter(i => i.status === InvoiceStatus.OVERDUE && i.type === 'Income').reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const balance = totalReceivables - totalPayables;

        // Cash Flow (Last 6 Months) for Area/Bar Chart
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const today = new Date();
        const trendData = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = months[d.getMonth()];
            
            const monthInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.dueDate);
                return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear() && (inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.SENT);
            });

            const income = monthInvoices.filter(i => i.type === 'Income').reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const expense = monthInvoices.filter(i => i.type === 'Expense').reduce((acc, curr) => acc + (curr.amount || 0), 0);
            
            // Profit Margin % calculation
            const margin = income > 0 ? ((income - expense) / income) * 100 : 0;

            trendData.push({ 
                name: monthLabel, 
                Receita: income, 
                Despesa: expense,
                Lucro: income - expense,
                Margem: Math.round(margin)
            });
        }

        // Expense by Category (Grouped)
        const expenseByCategory: Record<string, number> = {};
        invoices.filter(i => i.type === 'Expense').forEach(inv => {
            const catName = financialCategories.find(c => c.id === inv.costCenterId)?.name || 'Outros';
            expenseByCategory[catName] = (expenseByCategory[catName] || 0) + inv.amount;
        });
        const expensePieData = Object.entries(expenseByCategory)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort for Top Expenses

        // Income by Category
        const incomeByCategory: Record<string, number> = {};
        invoices.filter(i => i.type === 'Income').forEach(inv => {
            const catName = financialCategories.find(c => c.id === inv.costCenterId)?.name || 'Vendas';
            incomeByCategory[catName] = (incomeByCategory[catName] || 0) + inv.amount;
        });
        const incomePieData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));

        // Daily Cash Flow (Current Month)
        const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dailyData = [];
        for (let d = 1; d <= daysInCurrentMonth; d++) {
             const dayLabel = d.toString();
             const dayInvoices = invoices.filter(inv => {
                 const invDate = new Date(inv.dueDate);
                 return invDate.getDate() === d && invDate.getMonth() === today.getMonth() && invDate.getFullYear() === today.getFullYear() && inv.status !== InvoiceStatus.CANCELLED;
             });
             
             const dayIncome = dayInvoices.filter(i => i.type === 'Income').reduce((acc, c) => acc + c.amount, 0);
             const dayExpense = dayInvoices.filter(i => i.type === 'Expense').reduce((acc, c) => acc + c.amount, 0);
             
             // For Bi-axial bar chart: Income is positive, Expense is negative
             dailyData.push({
                 day: dayLabel,
                 Entrada: dayIncome,
                 Saida: -dayExpense, // Negative for visualization
                 Net: dayIncome - dayExpense
             });
        }

        // Status Distribution
        const statusCounts = {
            [InvoiceStatus.PAID]: 0,
            [InvoiceStatus.PENDING]: 0,
            [InvoiceStatus.OVERDUE]: 0
        };
        invoices.forEach(inv => {
            if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
        });
        const statusPieData = [
            { name: 'Pago', value: statusCounts[InvoiceStatus.PAID], color: STATUS_COLORS[InvoiceStatus.PAID] },
            { name: 'Pendente', value: statusCounts[InvoiceStatus.PENDING], color: STATUS_COLORS[InvoiceStatus.PENDING] },
            { name: 'Atrasado', value: statusCounts[InvoiceStatus.OVERDUE], color: STATUS_COLORS[InvoiceStatus.OVERDUE] }
        ];

        return { totalReceivables, totalPayables, totalOverdue, balance, trendData, expensePieData, incomePieData, statusPieData, dailyData };
    }, [invoices, financialCategories]);

    // --- ACTIONS ---

    const handleCreateTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionForm.entity || !transactionForm.amount) return;
        
        const newInv: Invoice = {
            id: `${transactionForm.type === 'Income' ? 'INV' : 'EXP'}-${Date.now()}`,
            type: transactionForm.type,
            customer: transactionForm.entity, // Used for Customer or Supplier
            description: transactionForm.description,
            amount: Number(transactionForm.amount),
            dueDate: new Date(transactionForm.dueDate).toISOString(),
            status: transactionForm.status,
            costCenterId: transactionForm.costCenterId,
            organizationId: currentUser?.organizationId
        };
        
        addInvoice(currentUser, newInv);
        setIsNewTransactionOpen(false);
        setTransactionForm({ 
            type: 'Income', entity: '', description: '', amount: 0, 
            dueDate: new Date().toISOString().split('T')[0], status: InvoiceStatus.PENDING, costCenterId: '' 
        });
        addSystemNotification('Sucesso', 'Lançamento registrado com sucesso.', 'success');
    };

    const handleDownloadPDF = async (invoice: Invoice) => {
        setInvoiceToDownload(invoice);
        setIsGeneratingPDF(true);
        addSystemNotification('Gerando PDF', 'O download iniciará em instantes...', 'info');
        setTimeout(async () => {
            const element = document.getElementById('invoice-pdf-content');
            if (!element) { setIsGeneratingPDF(false); setInvoiceToDownload(null); return; }
            const opt = { margin: 0, filename: `Documento_${invoice.id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            try {
                // @ts-ignore
                if (window.html2pdf) { await window.html2pdf().set(opt).from(element).save(); }
            } catch (e) { console.error(e); } finally { setIsGeneratingPDF(false); setInvoiceToDownload(null); }
        }, 500);
    };

    const handlePayAndRenew = (invoice: Invoice) => {
        if (confirm(`Confirmar pagamento e renovar?`)) {
            updateInvoiceStatus(currentUser, invoice.id, InvoiceStatus.PAID);
            const nextDueDate = new Date(new Date(invoice.dueDate).setDate(new Date(invoice.dueDate).getDate() + 30));
            const newInvoice: Invoice = {
                ...invoice,
                id: `INV-REN-${Date.now()}`,
                dueDate: nextDueDate.toISOString(),
                status: InvoiceStatus.PENDING
            };
            addInvoice(currentUser, newInvoice);
        }
    };

    // Helper Functions
    const getStatusBadgeColor = (status: InvoiceStatus) => {
        switch(status) {
            case InvoiceStatus.PAID: return 'green';
            case InvoiceStatus.OVERDUE: return 'red';
            case InvoiceStatus.SENT: return 'blue';
            default: return 'yellow';
        }
    };

    // Filter Categories for Dropdown based on Type
    const availableCategories = financialCategories.filter(c => 
        transactionForm.type === 'Income' ? c.type === 'Revenue' : c.type === 'Expense'
    );

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Hidden PDF Gen */}
            {invoiceToDownload && (
                <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]" style={{ transform: 'translateX(-9999px)' }}>
                    <div id="invoice-pdf-content"><InvoiceDocument data={invoiceToDownload} /></div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="text-emerald-600"/> Gestão Financeira
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Contas a Pagar, Receber e Fluxo de Caixa.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setTransactionForm(prev => ({...prev, type: 'Expense'})); setIsNewTransactionOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition">
                        <ArrowDownRight size={18}/> Nova Despesa
                    </button>
                    <button onClick={() => { setTransactionForm(prev => ({...prev, type: 'Income'})); setIsNewTransactionOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition">
                        <ArrowUpRight size={18}/> Nova Receita
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Receitas (Entradas)</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ {analyticsData.totalReceivables.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><TrendingUp size={24}/></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Despesas (Saídas)</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {analyticsData.totalPayables.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"><ArrowDownRight size={24}/></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Saldo Líquido</p>
                        <p className={`text-2xl font-bold ${analyticsData.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>R$ {analyticsData.balance.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Wallet size={24}/></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Em Atraso (Pendente)</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">R$ {analyticsData.totalOverdue.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg"><AlertCircle size={24}/></div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                    <button onClick={() => { setActiveTab('overview'); setViewMode('analytics'); }} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'overview' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Visão Geral</button>
                    <button onClick={() => { setActiveTab('income'); setViewMode('list'); }} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Receitas</button>
                    <button onClick={() => { setActiveTab('expense'); setViewMode('list'); }} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'expense' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Despesas</button>
                </div>
                
                {viewMode === 'analytics' && (
                    <button 
                        onClick={() => setShowAdvanced(!showAdvanced)} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${showAdvanced ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'}`}
                    >
                        <BarChart2 size={16}/> {showAdvanced ? 'Visão Simplificada' : 'Análise Avançada'}
                    </button>
                )}

                {viewMode === 'list' && (
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar lançamento..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                )}
            </div>

            {/* CONTENT AREA */}
            {viewMode === 'analytics' && activeTab === 'overview' ? (
                <div className="space-y-6 animate-fade-in">
                    
                    {!showAdvanced ? (
                        <>
                            {/* STANDARD VIEW: Fluxo de Caixa & Evolução de Receita */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                    <SectionTitle title="Fluxo de Caixa" subtitle="Entradas vs Saídas (Últimos 6 meses)" />
                                    <div className="h-64 mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={analyticsData.trendData}>
                                                <defs>
                                                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                <Area type="monotone" dataKey="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorInc)" />
                                                <Area type="monotone" dataKey="Despesa" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                    <SectionTitle title="Evolução de Receita" subtitle="Histórico de Faturamento" />
                                    <div className="h-64 mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.trendData}>
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                <Bar dataKey="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* ADVANCED VIEW: Profit Margin, Daily Cash Flow & Top Expenses */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* 1. Profit Margin Chart */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                    <SectionTitle title="Tendência de Lucratividade" subtitle="Faturamento vs Margem de Lucro (%)" />
                                    <div className="h-64 mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={analyticsData.trendData}>
                                                <CartesianGrid stroke="#f5f5f5" vertical={false} strokeDasharray="3 3"/>
                                                <XAxis dataKey="name" fontSize={12} stroke="#94a3b8"/>
                                                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tickFormatter={(val) => `R$${val/1000}k`}/>
                                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" tickFormatter={(val) => `${val}%`}/>
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                <Legend verticalAlign="top" height={36}/>
                                                <Bar yAxisId="left" dataKey="Receita" barSize={30} fill="#3b82f6" radius={[4, 4, 0, 0]} name="Faturamento"/>
                                                <Line yAxisId="right" type="monotone" dataKey="Margem" stroke="#10b981" strokeWidth={3} dot={{r:4}} name="Margem %"/>
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* 2. Daily Cash Flow Burn */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                    <SectionTitle title="Fluxo de Caixa Diário" subtitle="Movimentações do Mês Atual (Entradas vs Saídas)" />
                                    <div className="h-64 mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.dailyData} stackOffset="sign">
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} interval={2} />
                                                <YAxis stroke="#94a3b8" fontSize={10} hide/>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                    cursor={{fill: 'transparent'}}
                                                />
                                                <ReferenceLine y={0} stroke="#94a3b8" />
                                                <Bar dataKey="Entrada" fill="#10b981" stackId="stack" barSize={10} />
                                                <Bar dataKey="Saida" fill="#ef4444" stackId="stack" barSize={10} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                {/* 3. Top Expense Offenders */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px] lg:col-span-2">
                                    <SectionTitle title="Ranking de Despesas" subtitle="Maiores ofensores de custo por categoria" />
                                    <div className="h-64 mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.expensePieData.slice(0, 10)} layout="vertical" margin={{left: 40}}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                                                <XAxis type="number" hide/>
                                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12, fill: '#64748b'}} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                                                    formatter={(val: number) => `R$ ${val.toLocaleString()}`}
                                                />
                                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20}>
                                                     <LabelList dataKey="value" position="right" formatter={(val: number) => `R$ ${val.toLocaleString()}`} fontSize={12} fill="#64748b"/>
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Standard Pie Charts (Always visible or toggleable? Keeping them in standard view only to reduce clutter in advanced) */}
                    {!showAdvanced && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                <SectionTitle title="Receitas por Categoria" subtitle="Origem dos recursos" />
                                <div className="h-56 mt-4 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analyticsData.incomePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                                {analyticsData.incomePieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} formatter={(val: number) => `R$ ${val.toLocaleString()}`} />
                                            <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: '10px'}}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                <SectionTitle title="Despesas por Categoria" subtitle="Distribuição de custos" />
                                <div className="h-56 mt-4 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analyticsData.expensePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                                {analyticsData.expensePieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} formatter={(val: number) => `R$ ${val.toLocaleString()}`} />
                                            <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: '10px'}}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                <SectionTitle title="Status das Faturas" subtitle="Pagos vs Pendentes" />
                                <div className="h-56 mt-4 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analyticsData.statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                                {analyticsData.statusPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                                            <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: '10px'}}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1 flex flex-col animate-fade-in">
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-4">Descrição / Entidade</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Vencimento</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredInvoices.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum lançamento encontrado.</td></tr>
                                ) : (
                                    filteredInvoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {inv.type === 'Income' ? <ArrowUpRight size={16} className="text-emerald-500"/> : <ArrowDownRight size={16} className="text-red-500"/>}
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{inv.description}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{inv.customer}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300 text-xs">
                                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 w-fit">
                                                    <Tag size={12}/> {financialCategories.find(c => c.id === inv.costCenterId)?.name || 'Geral'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300"><span className={new Date(inv.dueDate) < new Date() && inv.status !== 'Pago' ? 'text-red-600 font-bold' : ''}>{new Date(inv.dueDate).toLocaleDateString()}</span></td>
                                            <td className={`p-4 font-bold ${inv.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {inv.type === 'Expense' ? '- ' : ''}R$ {inv.amount.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-center"><Badge color={getStatusBadgeColor(inv.status)}>{inv.status}</Badge></td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED && <button onClick={() => updateInvoiceStatus(currentUser, inv.id, InvoiceStatus.PAID)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition" title="Marcar Pago"><CheckCircle size={16}/></button>}
                                                    <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"><Download size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* NEW TRANSACTION MODAL */}
            {isNewTransactionOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
                        <div className={`p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center ${transactionForm.type === 'Income' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            <h3 className={`font-bold text-lg ${transactionForm.type === 'Income' ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                                {transactionForm.type === 'Income' ? 'Nova Receita' : 'Nova Despesa'}
                            </h3>
                            <button onClick={() => setIsNewTransactionOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                <button type="button" onClick={() => setTransactionForm({...transactionForm, type: 'Income'})} className={`flex-1 py-1.5 text-sm font-bold rounded transition ${transactionForm.type === 'Income' ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Entrada</button>
                                <button type="button" onClick={() => setTransactionForm({...transactionForm, type: 'Expense'})} className={`flex-1 py-1.5 text-sm font-bold rounded transition ${transactionForm.type === 'Expense' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm' : 'text-slate-500'}`}>Saída</button>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{transactionForm.type === 'Income' ? 'Cliente' : 'Fornecedor / Beneficiário'}</label>
                                {transactionForm.type === 'Income' ? (
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={transactionForm.entity} onChange={(e) => setTransactionForm({...transactionForm, entity: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" placeholder="Nome do Fornecedor" value={transactionForm.entity} onChange={(e) => setTransactionForm({...transactionForm, entity: e.target.value})} />
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria (Plano de Contas)</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={transactionForm.costCenterId} onChange={(e) => setTransactionForm({...transactionForm, costCenterId: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {availableCategories.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                </select>
                            </div>

                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={transactionForm.description} onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})} placeholder="Ex: Material de Escritório"/></div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor (R$)</label><input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={transactionForm.amount || ''} onChange={(e) => setTransactionForm({...transactionForm, amount: Number(e.target.value)})} /></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Vencimento</label><input required type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={transactionForm.dueDate} onChange={(e) => setTransactionForm({...transactionForm, dueDate: e.target.value})} /></div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <button type="submit" className={`px-6 py-2 rounded-lg font-bold text-white shadow-sm transition ${transactionForm.type === 'Income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>Salvar Lançamento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};