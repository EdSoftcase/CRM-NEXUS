import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InvoiceStatus, Invoice } from '../types';
import { DollarSign, AlertCircle, CheckCircle, FileText, Send, Clock, Calendar as CalendarIcon, List, Layout, ChevronLeft, ChevronRight, Search, TrendingUp, Download, Loader2, Upload, FileSpreadsheet, PieChart as PieChartIcon, Target } from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';
import { InvoiceDocument } from '../components/InvoiceDocument';
import * as XLSX from 'xlsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';

export const Finance: React.FC = () => {
    const { invoices, updateInvoiceStatus, addSystemNotification, addInvoicesBulk } = useData();
    const { currentUser } = useAuth();
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'analytics'>('analytics');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PDF Generation State
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [invoiceToDownload, setInvoiceToDownload] = useState<Invoice | null>(null);

    // --- CHART COLORS ---
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const RANKING_COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444'];

    // --- ANALYTICS DATA PREPARATION ---
    const analyticsData = useMemo(() => {
        // 1. Revenue Trends (Last 6 Months)
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const today = new Date();
        const trendData = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = months[d.getMonth()];
            
            const monthRevenue = invoices
                .filter(inv => {
                    const invDate = new Date(inv.dueDate);
                    return invDate.getMonth() === d.getMonth() && 
                           invDate.getFullYear() === d.getFullYear() &&
                           (inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.SENT);
                })
                .reduce((acc, curr) => acc + curr.amount, 0);
            
            trendData.push({ name: monthLabel, Receita: monthRevenue });
        }

        // 2. Top Clients by Revenue (Ranking & Share)
        const clientRevenueMap: Record<string, number> = {};
        let totalRevenueCalculated = 0;

        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.SENT) {
                clientRevenueMap[inv.customer] = (clientRevenueMap[inv.customer] || 0) + inv.amount;
                totalRevenueCalculated += inv.amount;
            }
        });
        
        const topClientsData = Object.entries(clientRevenueMap)
            .map(([name, value]) => ({ 
                name, 
                value,
                share: totalRevenueCalculated > 0 ? (value / totalRevenueCalculated) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        // 3. Top Defaulters (Inadimplência)
        const clientDebtMap: Record<string, number> = {};
        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.OVERDUE) {
                clientDebtMap[inv.customer] = (clientDebtMap[inv.customer] || 0) + inv.amount;
            }
        });

        const topDebtorsData = Object.entries(clientDebtMap)
             .map(([name, value]) => ({ name, value }))
             .sort((a, b) => b.value - a.value)
             .slice(0, 5);

        // 4. Status Breakdown
        const statusCounts = invoices.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

        return { trendData, topClientsData, topDebtorsData, statusChartData, totalRevenueCalculated };
    }, [invoices]);

    const handleDownloadPDF = async (invoice: Invoice) => {
        setInvoiceToDownload(invoice);
        setIsGeneratingPDF(true);
        addSystemNotification('Gerando PDF', 'O download iniciará em instantes...', 'info');

        setTimeout(async () => {
            const element = document.getElementById('invoice-pdf-content');
            if (!element) {
                setIsGeneratingPDF(false);
                setInvoiceToDownload(null);
                return;
            }

            const opt = {
                margin: 0,
                filename: `Fatura_${invoice.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            try {
                // @ts-ignore
                if (window.html2pdf) {
                    // @ts-ignore
                    await window.html2pdf().set(opt).from(element).save();
                    addSystemNotification('Sucesso', 'Fatura baixada com sucesso.', 'success');
                } else {
                    addSystemNotification('Erro', 'Biblioteca de PDF indisponível. Tente novamente.', 'alert');
                }
            } catch (e) {
                console.error(e);
                addSystemNotification('Erro', 'Falha ao gerar o arquivo PDF.', 'alert');
            } finally {
                setIsGeneratingPDF(false);
                setInvoiceToDownload(null);
            }
        }, 500);
    };

    // --- BULK IMPORT LOGIC ---
    const handleDownloadTemplate = () => {
        const templateData = [{ 
            'Cliente': 'Exemplo Empresa Ltda', 
            'Descrição': 'Consultoria Mensal', 
            'Valor': '1500,00', 
            'Vencimento': '25/12/2023', 
            'Status': 'Pendente' 
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template Financeiro");
        XLSX.writeFile(wb, "template_importacao_faturas.xlsx");
    };

    const getValueByKeys = (row: any, keys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const key of keys) {
            if (row[key] !== undefined) return row[key];
            const normalizedSearchKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const foundKey = rowKeys.find(k => {
                const normalizedRowKey = k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                return normalizedRowKey === normalizedSearchKey;
            });
            if (foundKey) return row[foundKey];
        }
        return undefined;
    };

    const parseCurrency = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        let str = String(value).trim();
        str = str.replace(/[R$\s]/g, '');
        if (str === '-' || str === ' - ') return 0;
        if (str.includes(',') && (!str.includes('.') || str.lastIndexOf(',') > str.lastIndexOf('.'))) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    };

    const normalizeStatus = (statusRaw: string): InvoiceStatus => {
        if (!statusRaw) return InvoiceStatus.PENDING;
        const s = statusRaw.toLowerCase().trim();
        if (s.includes('pago') || s.includes('paid') || s.includes('recebido')) return InvoiceStatus.PAID;
        if (s.includes('atrasado') || s.includes('vencido') || s.includes('overdue')) return InvoiceStatus.OVERDUE;
        if (s.includes('enviado') || s.includes('sent')) return InvoiceStatus.SENT;
        if (s.includes('rascunho') || s.includes('draft')) return InvoiceStatus.DRAFT;
        return InvoiceStatus.PENDING;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (jsonData.length === 0) {
                addSystemNotification("Erro de Arquivo", "O arquivo está vazio ou não pôde ser lido.", "alert");
                return;
            }

            const newInvoices: Invoice[] = jsonData.map((row: any) => {
                const customer = getValueByKeys(row, ['Cliente', 'Customer', 'Nome']);
                const description = getValueByKeys(row, ['Descrição', 'Description', 'Serviço']);
                const amountRaw = getValueByKeys(row, ['Valor', 'Amount', 'Price', 'Total']);
                const dateRaw = getValueByKeys(row, ['Vencimento', 'Due Date', 'Data', 'Date']);
                const statusRaw = getValueByKeys(row, ['Status', 'Estado']);

                let dueDate = new Date().toISOString();
                if (dateRaw) {
                    if (typeof dateRaw === 'string' && dateRaw.includes('/')) {
                        const parts = dateRaw.split('/');
                        if (parts.length === 3) {
                            const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                            if (!isNaN(d.getTime())) dueDate = d.toISOString();
                        }
                    } else {
                        const d = new Date(dateRaw);
                        if (!isNaN(d.getTime())) dueDate = d.toISOString();
                    }
                }

                return {
                    id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    customer: customer || 'Cliente Desconhecido',
                    description: description || 'Serviços Diversos',
                    amount: parseCurrency(amountRaw),
                    dueDate: dueDate,
                    status: normalizeStatus(statusRaw),
                    organizationId: currentUser?.organizationId
                };
            });

            addInvoicesBulk(currentUser!, newInvoices);
            addSystemNotification("Sucesso", `${newInvoices.length} faturas importadas com sucesso!`, "success");

        } catch (error) {
            console.error("Erro na importação:", error);
            addSystemNotification("Erro Crítico", "Erro ao processar o arquivo Excel.", "alert");
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Map columns to statuses
    const columns = [
        { id: InvoiceStatus.DRAFT, label: 'Rascunho', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        { id: InvoiceStatus.PENDING, label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        { id: InvoiceStatus.SENT, label: 'Enviado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        { id: InvoiceStatus.PAID, label: 'Pago', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        { id: InvoiceStatus.OVERDUE, label: 'Atrasado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    ];

    const getIcon = (status: InvoiceStatus) => {
        switch(status) {
            case InvoiceStatus.PAID: return <CheckCircle size={16} className="text-green-600 dark:text-green-400"/>;
            case InvoiceStatus.OVERDUE: return <AlertCircle size={16} className="text-red-600 dark:text-red-400"/>;
            case InvoiceStatus.SENT: return <Send size={16} className="text-blue-600 dark:text-blue-400"/>;
            case InvoiceStatus.PENDING: return <Clock size={16} className="text-yellow-600 dark:text-yellow-400"/>;
            default: return <FileText size={16} className="text-slate-400 dark:text-slate-500"/>;
        }
    };

    const handleMove = (id: string, currentStatus: InvoiceStatus, direction: 'next' | 'prev') => {
        const currentIndex = columns.findIndex(c => c.id === currentStatus);
        if (currentIndex === -1) return;

        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (newIndex >= 0 && newIndex < columns.length) {
            updateInvoiceStatus(currentUser!, id, columns[newIndex].id);
        }
    };

    // --- CALCULATIONS ---
    const filteredInvoices = invoices.filter(i => 
        i.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalReceivables = filteredInvoices
        .filter(i => i.status !== InvoiceStatus.DRAFT && i.status !== InvoiceStatus.CANCELLED)
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalOverdue = filteredInvoices
        .filter(i => i.status === InvoiceStatus.OVERDUE)
        .reduce((acc, curr) => acc + curr.amount, 0);

    // --- CALENDAR HELPERS ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const renderCalendarDays = () => {
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-800/30 border-r border-b border-slate-200 dark:border-slate-700 min-h-[100px]"></div>);
        }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const isToday = new Date().toDateString() === date.toDateString();
            
            const dayInvoices = filteredInvoices.filter(inv => {
                const invDate = new Date(inv.dueDate);
                return invDate.getDate() === d && invDate.getMonth() === month && invDate.getFullYear() === year;
            });
            
            const dayTotal = dayInvoices.reduce((acc, curr) => acc + curr.amount, 0);

            days.push(
                <div key={d} className={`border-r border-b border-slate-200 dark:border-slate-700 min-h-[100px] p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition group flex flex-col`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>{d}</span>
                        {dayTotal > 0 && <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">R$ {dayTotal.toLocaleString(undefined, {notation: 'compact'})}</span>}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        {dayInvoices.map(inv => (
                            <div key={inv.id} className={`text-[9px] px-1.5 py-1 rounded border truncate flex items-center gap-1 ${
                                inv.status === 'Pago' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900' :
                                inv.status === 'Atrasado' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900' :
                                'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                            }`} title={`${inv.description} - R$ ${inv.amount}`}>
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${inv.status === 'Pago' ? 'bg-green-500' : inv.status === 'Atrasado' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                <span className="truncate">{inv.customer}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Hidden Invoice Document Container */}
            {invoiceToDownload && (
                <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]" style={{ transform: 'translateX(-9999px)' }}>
                    <div id="invoice-pdf-content">
                        <InvoiceDocument data={invoiceToDownload} />
                    </div>
                </div>
            )}

            {/* Hidden File Input for Import */}
            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

            {/* Header with Stats */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="text-emerald-600"/> Financeiro
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestão de faturamento e fluxo de caixa.</p>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    {/* Bulk Actions Button Group */}
                    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 shadow-sm h-fit">
                        <button onClick={handleDownloadTemplate} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 transition" title="Baixar Modelo Excel"><FileSpreadsheet size={20} /></button>
                        <div className="w-px h-auto bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded transition whitespace-nowrap"><Upload size={18} /> Importar</button>
                    </div>

                    {/* Stats Cards */}
                    <div className="flex gap-3 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 min-w-[180px] flex-1">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                                <TrendingUp size={20}/>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">A Receber</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-white whitespace-nowrap">R$ {totalReceivables.toLocaleString()}</p>
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm flex items-center gap-3 min-w-[180px] flex-1">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full text-red-600 dark:text-red-400">
                                <AlertCircle size={20}/>
                            </div>
                            <div>
                                <p className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase tracking-wide">Em Atraso</p>
                                <p className="text-lg font-bold text-red-700 dark:text-red-300 whitespace-nowrap">R$ {totalOverdue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full md:w-auto overflow-x-auto">
                    <button onClick={() => setViewMode('analytics')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition whitespace-nowrap ${viewMode === 'analytics' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <PieChartIcon size={16}/> <span className="hidden sm:inline">Análise</span>
                    </button>
                    <button onClick={() => setViewMode('kanban')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition whitespace-nowrap ${viewMode === 'kanban' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <Layout size={16}/> <span className="hidden sm:inline">Kanban</span>
                    </button>
                    <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition whitespace-nowrap ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <List size={16}/> <span className="hidden sm:inline">Lista</span>
                    </button>
                    <button onClick={() => setViewMode('calendar')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition whitespace-nowrap ${viewMode === 'calendar' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                        <CalendarIcon size={16}/> <span className="hidden sm:inline">Calendário</span>
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Buscar fatura..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* --- ANALYTICS VIEW --- */}
            {viewMode === 'analytics' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Trend Chart */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <SectionTitle title="Evolução do Faturamento" subtitle="Receita mensal (últimos 6 meses)" />
                            <div className="h-72 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analyticsData.trendData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
                                        <YAxis stroke="#94a3b8" tick={{fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Receita']}
                                        />
                                        <Area type="monotone" dataKey="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Clients Chart (Costs Generated) */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                            <SectionTitle title="Ranking de Faturamento" subtitle="Top 5 Clientes que geraram mais custos (Receita)" />
                            <div className="h-72 mt-4 flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData.topClientsData} layout="vertical" margin={{left: 10, right: 30}}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}}
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            formatter={(value: number, name: string, props: any) => [
                                                `R$ ${value.toLocaleString()} (${props.payload.share}%)`, 
                                                'Total Faturado'
                                            ]}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                            {analyticsData.topClientsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={RANKING_COLORS[index % RANKING_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Revenue Concentration Insight */}
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl shadow-lg border border-indigo-800 text-white flex flex-col relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                             <div className="relative z-10 flex flex-col h-full justify-between">
                                 <div>
                                     <h4 className="flex items-center gap-2 font-bold text-lg mb-2 text-indigo-300">
                                         <Target size={20}/> Concentração de Receita
                                     </h4>
                                     <p className="text-sm text-slate-300 mb-4">
                                         Análise de Pareto sobre o faturamento total.
                                     </p>
                                 </div>
                                 
                                 <div className="mt-2">
                                     {analyticsData.topClientsData.length > 0 ? (
                                         <div>
                                             <p className="text-3xl font-bold text-white mb-1">
                                                 {analyticsData.topClientsData[0].share}%
                                             </p>
                                             <p className="text-xs text-indigo-200">
                                                 Do faturamento vem do seu principal cliente: <strong>{analyticsData.topClientsData[0].name}</strong>
                                             </p>
                                         </div>
                                     ) : (
                                         <p className="text-sm text-slate-400">Sem dados suficientes.</p>
                                     )}
                                 </div>
                             </div>
                        </div>

                         {/* Top Debtors Table */}
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                            <SectionTitle title="Alerta de Inadimplência" subtitle="Maiores valores em atraso" />
                            <div className="flex-1 overflow-auto mt-4 custom-scrollbar">
                                {analyticsData.topDebtorsData.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">Nenhuma inadimplência registrada.</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="text-left text-xs font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                                            <tr>
                                                <th className="pb-2">Cliente</th>
                                                <th className="pb-2 text-right">Valor Atrasado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                            {analyticsData.topDebtorsData.map((d, i) => (
                                                <tr key={i}>
                                                    <td className="py-3 font-medium text-slate-700 dark:text-slate-200">{d.name}</td>
                                                    <td className="py-3 text-right font-bold text-red-600 dark:text-red-400">R$ {d.value.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Status Pie Chart */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <SectionTitle title="Status das Faturas" subtitle="Distribuição atual" />
                            <div className="h-48 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={analyticsData.statusChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {analyticsData.statusChartData.map((entry, index) => {
                                                let color = '#94a3b8';
                                                if (entry.name === 'Pago') color = '#10b981';
                                                else if (entry.name === 'Atrasado') color = '#ef4444';
                                                else if (entry.name === 'Pendente') color = '#f59e0b';
                                                else if (entry.name === 'Enviado') color = '#3b82f6';
                                                return <Cell key={`cell-${index}`} fill={color} />;
                                            })}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}/>
                                        <Legend verticalAlign="bottom" height={36} iconSize={10}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DESKTOP VIEWS (OTHER MODES) --- */}
            <div className={`hidden md:block flex-1 overflow-hidden relative ${viewMode === 'analytics' ? 'hidden' : ''}`}>
                
                {/* KANBAN VIEW */}
                {viewMode === 'kanban' && (
                    <div className="h-full overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex gap-6 h-full min-w-max">
                            {columns.map((col) => (
                                <div key={col.id} className="w-80 flex flex-col bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700">
                                    <div className={`p-4 rounded-t-xl border-b border-slate-200 dark:border-slate-700 flex justify-between items-center ${col.color} bg-opacity-20`}>
                                        <span className="font-bold flex items-center gap-2">
                                            {getIcon(col.id)} {col.label}
                                        </span>
                                        <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-xs font-bold">
                                            {filteredInvoices.filter(i => i.status === col.id).length}
                                        </span>
                                    </div>
                                    <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar max-h-[65vh]">
                                        {filteredInvoices.filter(i => i.status === col.id).map(invoice => (
                                            <div key={invoice.id} className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-md transition group relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-slate-800 dark:text-white text-sm">{invoice.customer}</span>
                                                    <button onClick={() => handleDownloadPDF(invoice)} disabled={isGeneratingPDF} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-500 transition">
                                                        <Download size={14}/>
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{invoice.description}</p>
                                                <div className="flex justify-between items-end mt-3 border-t pt-2 border-slate-100 dark:border-slate-600">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">Vencimento</p>
                                                        <p className={`text-xs font-bold ${new Date(invoice.dueDate) < new Date() && invoice.status !== InvoiceStatus.PAID ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {new Date(invoice.dueDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">R$ {invoice.amount.toLocaleString()}</p>
                                                </div>
                                                <div className="absolute top-2 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-slate-800 shadow-sm rounded border border-slate-100 dark:border-slate-600">
                                                    {col.id !== InvoiceStatus.DRAFT && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleMove(invoice.id, invoice.status, 'prev'); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded" title="Voltar"><ChevronLeft size={14}/></button>
                                                    )}
                                                    {col.id !== InvoiceStatus.OVERDUE && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleMove(invoice.id, invoice.status, 'next'); }} className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded" title="Avançar"><ChevronRight size={14}/></button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs font-bold sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="p-4">Cliente / Descrição</th>
                                        <th className="p-4">ID Fatura</th>
                                        <th className="p-4">Vencimento</th>
                                        <th className="p-4">Valor</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredInvoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-900 dark:text-white">{inv.customer}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{inv.description}</p>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{inv.id}</td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300">
                                                <span className={new Date(inv.dueDate) < new Date() && inv.status !== 'Pago' ? 'text-red-600 font-bold' : ''}>
                                                    {new Date(inv.dueDate).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-slate-900 dark:text-white">R$ {inv.amount.toLocaleString()}</td>
                                            <td className="p-4 text-center">
                                                <Badge color={inv.status === 'Pago' ? 'green' : inv.status === 'Atrasado' ? 'red' : 'blue'}>{inv.status}</Badge>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleDownloadPDF(inv)} disabled={isGeneratingPDF} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition">
                                                    {isGeneratingPDF && invoiceToDownload?.id === inv.id ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* CALENDAR VIEW */}
                {viewMode === 'calendar' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><ChevronLeft size={20}/></button>
                                <span className="text-lg font-bold text-slate-800 dark:text-white capitalize">{monthNames[month]} {year}</span>
                                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><ChevronRight size={20}/></button>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-3">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Recebido</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Atrasado</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                <div key={day} className="p-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    {day}
                                </div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar">
                            {renderCalendarDays()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
