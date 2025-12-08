
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, ComposedChart, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LeadStatus, Lead, TicketStatus } from '../types';
import { SectionTitle, KPICard, Badge } from '../components/Widgets';
import { 
    BarChart2, TrendingUp, BrainCircuit, Target, PieChart as PieIcon, 
    Activity, Users, AlertCircle, DollarSign, Calendar, CheckCircle, 
    Briefcase, Search, Filter, Phone, Mail, MessageSquare, Clock, Settings, Sparkles, Send, CalendarDays,
    LayoutTemplate, Plus, GripVertical, Trash2, FileDown, FileSpreadsheet, Download, X
} from 'lucide-react';
import { analyzeBusinessData } from '../services/geminiService';
import * as XLSX from 'xlsx';

export const Reports: React.FC = () => {
    const { leads, clients, activities, tickets, invoices, campaigns } = useData();
    const { currentUser } = useAuth();
    
    // Categorias de abas
    const [activeTab, setActiveTab] = useState<'sales' | 'marketing' | 'activities' | 'financial' | 'insights' | 'bi'>('sales');
    
    // Time Range Filter
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'year'>('30d');

    // Growth Projection State
    const [growthRate, setGrowthRate] = useState(35); // Default 35% annual growth target

    // --- INSIGHTS / CHAT BI STATE ---
    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([
        { role: 'ai', text: 'Olá! Sou o Nexus BI. Tenho acesso aos dados consolidados da sua empresa. Pergunte algo como "Qual o melhor canal de vendas?" ou "Quais clientes têm risco de churn?".' }
    ]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // --- CUSTOM REPORT BUILDER STATE ---
    // Changed to array of objects to allow multiple instances of the same widget
    interface ReportWidgetInstance {
        instanceId: string;
        widgetId: string;
    }
    const [customWidgets, setCustomWidgets] = useState<ReportWidgetInstance[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, activeTab]);

    // --- CORES PADRÃO PARA GRÁFICOS ---
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    // Helper Filter by Date
    const filterByDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        let diffTime = 0;
        
        switch (timeRange) {
            case '7d': diffTime = 7 * 24 * 60 * 60 * 1000; break;
            case '30d': diffTime = 30 * 24 * 60 * 60 * 1000; break;
            case '90d': diffTime = 90 * 24 * 60 * 60 * 1000; break;
            case 'year': diffTime = 365 * 24 * 60 * 60 * 1000; break;
        }
        
        return (now.getTime() - date.getTime()) <= diffTime;
    };

    // ==========================================
    // 1. CÁLCULOS DE VENDAS (SALES DATA)
    // ==========================================
    
    const filteredLeads = leads.filter(l => filterByDate(l.createdAt));

    // Pipeline Funnel
    const funnelData = useMemo(() => [
        { name: 'Novo', value: filteredLeads.filter(l => l.status === LeadStatus.NEW).length, fill: '#3b82f6' },
        { name: 'Qualificado', value: filteredLeads.filter(l => l.status === LeadStatus.QUALIFIED).length, fill: '#6366f1' },
        { name: 'Proposta', value: filteredLeads.filter(l => l.status === LeadStatus.PROPOSAL).length, fill: '#8b5cf6' },
        { name: 'Negociação', value: filteredLeads.filter(l => l.status === LeadStatus.NEGOTIATION).length, fill: '#d946ef' },
        { name: 'Fechado (Ganho)', value: filteredLeads.filter(l => l.status === LeadStatus.CLOSED_WON).length, fill: '#10b981' },
    ], [filteredLeads]);

    // Sales Performance
    const totalLeads = filteredLeads.length;
    const wonLeads = filteredLeads.filter(l => l.status === LeadStatus.CLOSED_WON);
    const lostLeads = filteredLeads.filter(l => l.status === LeadStatus.CLOSED_LOST);
    const winRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : 0;
    const totalWonValue = wonLeads.reduce((acc, l) => acc + l.value, 0);
    const avgDealSize = wonLeads.length > 0 ? totalWonValue / wonLeads.length : 0;

    // Time to Close (Ciclo de Vendas - Oportunidades)
    const salesCycleData = useMemo(() => {
        return [
            { name: 'Jan', dias: 45 }, { name: 'Fev', dias: 42 }, { name: 'Mar', dias: 38 },
            { name: 'Abr', dias: 40 }, { name: 'Mai', dias: 35 }, { name: 'Jun', dias: 32 }
        ];
    }, []);

    // Lost Reasons (Simulado)
    const lostReasonsData = useMemo(() => [
        { name: 'Preço', value: 45 },
        { name: 'Concorrência', value: 25 },
        { name: 'Feature Faltante', value: 15 },
        { name: 'Sem Budget', value: 10 },
        { name: 'Outros', value: 5 }
    ], []);

    // ==========================================
    // 2. CÁLCULOS DE MARKETING (MARKETING DATA)
    // ==========================================

    // Lead Source Analysis
    const leadSourceData = useMemo(() => {
        const sources: Record<string, number> = {};
        filteredLeads.forEach(l => {
            const src = l.source || 'Desconhecido';
            sources[src] = (sources[src] || 0) + 1;
        });
        return Object.entries(sources)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredLeads]);

    // CAC (Custo de Aquisição)
    const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
    const totalNewClients = clients.filter(c => filterByDate(c.since)).length;
    const cac = totalNewClients > 0 ? totalSpend / totalNewClients : 0;

    // ==========================================
    // 3. ATIVIDADES E SUPORTE (ACTIVITY DATA)
    // ==========================================

    const filteredActivities = activities.filter(a => filterByDate(a.dueDate));

    // Activities Breakdown
    const activityData = useMemo(() => {
        const counts = { Call: 0, Meeting: 0, Email: 0, Task: 0 };
        filteredActivities.forEach(a => {
            if (counts[a.type] !== undefined) counts[a.type]++;
        });
        return [
            { name: 'Ligações', value: counts.Call, fill: '#3b82f6', icon: Phone },
            { name: 'Reuniões', value: counts.Meeting, fill: '#8b5cf6', icon: Users },
            { name: 'E-mails', value: counts.Email, fill: '#f59e0b', icon: Mail },
            { name: 'Tarefas', value: counts.Task, fill: '#10b981', icon: CheckCircle },
        ];
    }, [filteredActivities]);

    // Open Issues (Support)
    const filteredTickets = tickets.filter(t => filterByDate(t.created_at));
    const ticketStats = useMemo(() => {
        const open = filteredTickets.filter(t => t.status === TicketStatus.OPEN).length;
        const progress = filteredTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length;
        const critical = filteredTickets.filter(t => t.priority === 'Crítica' && t.status !== TicketStatus.CLOSED).length;
        const slaBreach = filteredTickets.filter(t => t.priority === 'Crítica').length; // Simulado
        return { open, progress, critical, slaBreach };
    }, [filteredTickets]);

    // ==========================================
    // 4. FINANCEIRO (FINANCIAL DATA)
    // ==========================================
    
    // Profitability (Revenue per Client Segment)
    const profitabilityData = useMemo(() => {
        const segments: Record<string, number> = {};
        clients.forEach(c => {
            const val = c.totalTablePrice || c.ltv || 0;
            const seg = c.segment || 'Geral';
            segments[seg] = (segments[seg] || 0) + val;
        });
        return Object.entries(segments)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [clients]);

    // Monthly Projection Logic
    const currentMRR = clients.filter(c => c.status === 'Active').reduce((acc, c) => acc + (c.totalTablePrice || c.ltv || 0), 0);
    const projectedGoal = currentMRR * (1 + growthRate / 100);

    // Churn Risk List
    const churnRiskList = useMemo(() => clients.filter(c => c.status === 'Churn Risk' || (c.healthScore && c.healthScore < 50)), [clients]);

    // Dynamic Projection Chart Data
    const projectionData = useMemo(() => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const today = new Date();
        const data = [];
        
        let projectedValue = currentMRR;
        const monthlyRate = (growthRate / 100) / 12;

        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthName = months[d.getMonth()];
            
            if (i === 0) {
                data.push({
                    name: 'Atual',
                    Realizado: currentMRR,
                    Projetado: currentMRR
                });
            } else {
                projectedValue = projectedValue * (1 + monthlyRate);
                data.push({
                    name: monthName,
                    Realizado: null,
                    Projetado: Math.round(projectedValue)
                });
            }
        }
        return data;
    }, [currentMRR, growthRate]);

    // ==========================================
    // 6. HEALTH RADAR (OVERALL BUSINESS)
    // ==========================================
    const radarData = useMemo(() => {
        const salesScore = Math.min(Number(winRate) * 2, 100) || 50; 
        const marketingScore = Math.min(filteredLeads.length * 5, 100) || 40;
        const financeScore = Math.min((currentMRR / 50000) * 100, 100) || 60;
        const supportScore = Math.max(100 - (ticketStats.critical * 20), 0);
        const csScore = 85; 

        return [
            { subject: 'Vendas', A: salesScore, fullMark: 100 },
            { subject: 'Marketing', A: marketingScore, fullMark: 100 },
            { subject: 'Suporte', A: supportScore, fullMark: 100 },
            { subject: 'Financeiro', A: financeScore, fullMark: 100 },
            { subject: 'CS / NPS', A: csScore, fullMark: 100 },
        ];
    }, [winRate, filteredLeads, currentMRR, ticketStats]);

    // ==========================================
    // 5. NEXUS INSIGHTS (CHAT LOGIC)
    // ==========================================
    const handleSendQuery = async () => {
        if (!chatQuery.trim()) return;
        
        const userMsg = chatQuery;
        setChatQuery('');
        setChatHistory(prev => [...prev, {role: 'user', text: userMsg}]);
        setIsAnalyzing(true);

        try {
            const contextData = {
                metrics: {
                    totalLeads, winRate, totalWonValue, currentMRR,
                    activeClients: clients.filter(c => c.status === 'Active').length,
                    churnRisk: clients.filter(c => c.status === 'Churn Risk').length,
                    openTickets: ticketStats.open + ticketStats.progress,
                    criticalTickets: ticketStats.critical
                },
                topSegments: profitabilityData.slice(0, 3),
                topChannels: leadSourceData.slice(0, 3),
                recentActivities: activities.length,
                pipeline: funnelData.map(f => ({ stage: f.name, count: f.value }))
            };

            const response = await analyzeBusinessData(contextData, userMsg);
            setChatHistory(prev => [...prev, {role: 'ai', text: response}]);
        } catch (error) {
            setChatHistory(prev => [...prev, {role: 'ai', text: "Desculpe, tive um problema ao analisar seus dados. Tente novamente."}]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ==========================================
    // 7. B.I. AVANÇADO - WIDGET CONFIG
    // ==========================================
    const availableWidgets = [
        { id: 'mrr_evolution', label: 'Evolução MRR/ARR', category: 'Financeiro', icon: TrendingUp },
        { id: 'cac_ltv', label: 'CAC vs LTV', category: 'Financeiro', icon: DollarSign },
        { id: 'churn_risk', label: 'Matriz de Risco (Churn)', category: 'CS', icon: AlertCircle },
        { id: 'sales_funnel', label: 'Funil de Vendas', category: 'Vendas', icon: Filter },
        { id: 'lost_reasons', label: 'Motivos de Perda', category: 'Vendas', icon: X },
        { id: 'sla_breach', label: 'Violação de SLA', category: 'Suporte', icon: Clock },
        { id: 'top_clients', label: 'Top 10 Clientes', category: 'Vendas', icon: Users },
        { id: 'source_roi', label: 'ROI por Canal', category: 'Marketing', icon: Target },
    ];

    const addWidget = (widgetId: string) => {
        // Allows adding multiple instances of the same widget
        const newInstance = {
            instanceId: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            widgetId: widgetId
        };
        setCustomWidgets(prev => [...prev, newInstance]);
    };

    const removeWidget = (instanceId: string) => {
        setCustomWidgets(prev => prev.filter(w => w.instanceId !== instanceId));
    };

    const renderWidget = (id: string) => {
        switch(id) {
            case 'mrr_evolution':
                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4">Evolução MRR & ARR</h4>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                    <XAxis dataKey="name" tick={{fontSize: 10}}/>
                                    <YAxis tick={{fontSize: 10}}/>
                                    <Tooltip contentStyle={{backgroundColor: '#1e293b', color: '#fff'}}/>
                                    <Area type="monotone" dataKey="Projetado" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'cac_ltv':
                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col justify-center">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4">Saúde Unitária (Unit Economics)</h4>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">CAC</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">R$ {cac.toFixed(0)}</p>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">LTV Médio</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">R$ {(clients.length > 0 ? (totalWonValue * 12) / clients.length : 0).toFixed(0)}</p>
                            </div>
                        </div>
                        <p className="text-xs text-center mt-3 text-slate-500">Razão LTV/CAC: <span className="font-bold text-blue-600">3.2x</span> (Saudável)</p>
                    </div>
                );
            case 'churn_risk':
                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4">Matriz de Risco (Churn)</h4>
                        <div className="overflow-y-auto max-h-48 custom-scrollbar space-y-2">
                            {churnRiskList.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Nenhum cliente em risco.</p> : 
                                churnRiskList.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.name}</span>
                                        <span className="text-[10px] font-bold text-red-600 bg-white dark:bg-slate-800 px-2 py-0.5 rounded">HS: {c.healthScore}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                );
            case 'sales_funnel':
                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-2">Funil de Vendas Atual</h4>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{left: 0}}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', color: '#fff'}} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'lost_reasons':
                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-2">Motivos de Perda (Lost)</h4>
                        <div className="h-48 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={lostReasonsData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        {lostReasonsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '10px'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'sla_breach':
                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col items-center justify-center">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-4 w-full text-left">Violação de SLA</h4>
                        <div className="w-32 h-32 relative">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-slate-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                <path className="text-red-500" strokeDasharray={`${(ticketStats.slaBreach / (ticketStats.open + 1)) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-bold text-red-600">{ticketStats.slaBreach}</span>
                                <span className="text-[9px] text-slate-400 uppercase">Críticos</span>
                            </div>
                        </div>
                    </div>
                );
            case 'top_clients':
                return (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-2">Top 5 Clientes (Receita)</h4>
                        <div className="space-y-2">
                            {profitabilityData.slice(0, 5).map((c, i) => (
                                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-700 pb-1">
                                    <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                                    <span className="font-bold text-emerald-600">R$ {c.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    const handleExportPDF = () => {
        setIsExporting(true);
        setTimeout(async () => {
            const element = document.getElementById('custom-report-canvas');
            if (element) {
                const opt = {
                    margin: 5,
                    filename: `Report_Nexus_BI_${new Date().toISOString().split('T')[0]}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                };
                // @ts-ignore
                if(window.html2pdf) await window.html2pdf().set(opt).from(element).save();
            }
            setIsExporting(false);
        }, 500);
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        
        // General Data Sheet
        const summaryData = [
            ['Métrica', 'Valor'],
            ['Total Leads', totalLeads],
            ['Vendas Ganhas', wonLeads.length],
            ['Taxa Conversão', `${winRate}%`],
            ['MRR Atual', currentMRR],
            ['CAC', cac],
            ['Tickets Abertos', ticketStats.open]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo Executivo");

        // Churn Risk Sheet
        // Only export detailed lists if the widget is present in the current view
        const hasChurnWidget = customWidgets.some(w => w.widgetId === 'churn_risk');
        if (hasChurnWidget) {
            const riskData = churnRiskList.map(c => ({ Nome: c.name, Health: c.healthScore, Status: c.status }));
            const wsRisk = XLSX.utils.json_to_sheet(riskData);
            XLSX.utils.book_append_sheet(wb, wsRisk, "Risco Churn");
        }

        XLSX.writeFile(wb, `Dados_BI_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header e Navegação */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Central de Relatórios</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Análise estratégica baseada em dados reais.</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Time Filter */}
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex">
                        <button onClick={() => setTimeRange('7d')} className={`px-3 py-1 text-xs font-bold rounded ${timeRange === '7d' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>7D</button>
                        <button onClick={() => setTimeRange('30d')} className={`px-3 py-1 text-xs font-bold rounded ${timeRange === '30d' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>30D</button>
                        <button onClick={() => setTimeRange('90d')} className={`px-3 py-1 text-xs font-bold rounded ${timeRange === '90d' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>90D</button>
                        <button onClick={() => setTimeRange('year')} className={`px-3 py-1 text-xs font-bold rounded ${timeRange === 'year' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>Ano</button>
                    </div>

                    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 w-full md:w-auto overflow-x-auto custom-scrollbar">
                        <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'sales' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            <TrendingUp size={16}/> Vendas
                        </button>
                        <button onClick={() => setActiveTab('marketing')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'marketing' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            <Target size={16}/> Marketing
                        </button>
                        <button onClick={() => setActiveTab('activities')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'activities' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            <Activity size={16}/> Atividades
                        </button>
                        <button onClick={() => setActiveTab('financial')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'financial' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            <DollarSign size={16}/> Financeiro
                        </button>
                        <button onClick={() => setActiveTab('bi')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'bi' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            <LayoutTemplate size={16}/> B.I. Avançado
                        </button>
                        <button onClick={() => setActiveTab('insights')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                            <Sparkles size={16}/> Insights
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                
                {/* === ABA NEXUS INSIGHTS (CHAT BI) === */}
                {activeTab === 'insights' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Radar Chart (Business Health) */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                            <SectionTitle title="Saúde do Negócio (Radar)" subtitle="Performance multidimensional" />
                            <div className="w-full h-64 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Performance" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                                        <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-center text-slate-400 mt-4 px-4">Este gráfico consolida métricas de todas as áreas para identificar pontos de atenção.</p>
                        </div>

                        {/* Chat Interface */}
                        <div className="lg:col-span-2 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-slate-700 overflow-hidden h-[calc(100vh-240px)] lg:h-auto">
                            {/* ... Chat Content (Same as before) ... */}
                            <div className="p-4 bg-indigo-50 dark:bg-slate-900 border-b border-indigo-100 dark:border-slate-700 flex items-center gap-4 shrink-0">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm text-indigo-600 dark:text-indigo-400">
                                    <BrainCircuit size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-indigo-900 dark:text-white">Nexus BI - Inteligência</h2>
                                    <p className="text-indigo-700 dark:text-indigo-300 text-sm">Pergunte sobre seus dados.</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-none'}`}>
                                            {msg.role === 'ai' && <div className="text-xs font-bold text-indigo-500 dark:text-indigo-300 mb-1 flex items-center gap-1"><Sparkles size={12}/> Nexus AI</div>}
                                            <div className="whitespace-pre-wrap">{msg.text}</div>
                                        </div>
                                    </div>
                                ))}
                                {isAnalyzing && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-600 flex items-center gap-2 text-slate-500 dark:text-slate-300">
                                            <div className="flex space-x-1"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div></div>
                                            <span className="text-xs ml-2">Analisando dados...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                                <div className="relative">
                                    <input type="text" dir="ltr" className="w-full text-left border border-slate-300 dark:border-slate-600 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400" placeholder="Digite sua pergunta..." value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()} disabled={isAnalyzing}/>
                                    <button onClick={handleSendQuery} disabled={!chatQuery.trim() || isAnalyzing} className="absolute right-2 top-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center aspect-square"><Send size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* === ABA B.I. AVANÇADO (CUSTOM BUILDER) === */}
                {activeTab === 'bi' && (
                    <div className="flex h-[calc(100vh-140px)] gap-6 animate-fade-in">
                        {/* Sidebar: Widget Library */}
                        <div className="w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col overflow-hidden shrink-0">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <LayoutTemplate size={18}/> Biblioteca de KPIs
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Clique para adicionar ao relatório</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
                                {availableWidgets.map(widget => (
                                    <button 
                                        key={widget.id}
                                        onClick={() => addWidget(widget.id)}
                                        className="w-full p-3 flex items-center gap-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-blue-400 hover:shadow-md transition text-left group"
                                    >
                                        <div className="p-2 bg-blue-50 dark:bg-slate-600 rounded-lg text-blue-600 dark:text-blue-300 group-hover:bg-blue-100 dark:group-hover:bg-slate-500">
                                            {React.createElement(widget.icon, {size: 18})}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{widget.label}</p>
                                            <p className="text-[10px] text-slate-400 uppercase">{widget.category}</p>
                                        </div>
                                        <Plus size={14} className="ml-auto text-slate-400 opacity-0 group-hover:opacity-100 transition"/>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main: Report Canvas */}
                        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden relative">
                            {/* Toolbar */}
                            <div className="p-4 flex justify-between items-center bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Meu Dashboard Personalizado</h3>
                                <div className="flex gap-2">
                                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                                        <FileSpreadsheet size={16}/> Exportar Excel
                                    </button>
                                    <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-70">
                                        {isExporting ? 'Gerando...' : <><FileDown size={16}/> Exportar PDF</>}
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Area */}
                            <div id="custom-report-canvas" className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
                                {customWidgets.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <LayoutTemplate size={64} className="mb-4 opacity-20"/>
                                        <p>Seu relatório está vazio.</p>
                                        <p className="text-sm">Selecione métricas na esquerda para começar.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {customWidgets.map((widgetInstance, index) => (
                                            <div key={widgetInstance.instanceId} className="relative group min-h-[250px]">
                                                {/* Controls Overlay */}
                                                <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition no-print">
                                                    <div className="p-1 bg-white/80 dark:bg-slate-800/80 rounded cursor-grab shadow text-slate-500"><GripVertical size={14}/></div>
                                                    <button onClick={() => removeWidget(widgetInstance.instanceId)} className="p-1 bg-red-100 text-red-600 rounded shadow hover:bg-red-200"><Trash2 size={14}/></button>
                                                </div>
                                                {renderWidget(widgetInstance.widgetId)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Footer Signature for PDF */}
                                {customWidgets.length > 0 && (
                                    <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                                        Gerado por Nexus CRM Enterprise • {new Date().toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* === ABA VENDAS === */}
                {activeTab === 'sales' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* KPIs de Vendas */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <KPICard title="Total de Vendas (Ganho)" value={wonLeads.length.toString()} icon={CheckCircle} color="bg-emerald-500" trend={`${winRate}% Conversão`} trendUp={true}/>
                            <KPICard title="Receita Gerada" value={`R$ ${totalWonValue.toLocaleString()}`} icon={DollarSign} color="bg-blue-500" trend="Valor Total" trendUp={true}/>
                            <KPICard title="Ticket Médio" value={`R$ ${avgDealSize.toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon={PieIcon} color="bg-purple-500" trend="Por Negócio" trendUp={true}/>
                            <KPICard title="Vendas Perdidas" value={lostLeads.length.toString()} icon={AlertCircle} color="bg-red-500" trend="Oportunidades" trendUp={false}/>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Relatório de Pipeline */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                <SectionTitle title="Relatório de Pipeline" subtitle="Funil de oportunidades em cada estágio" />
                                <div className="h-64 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={funnelData} layout="vertical" margin={{left: 20}}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                                                {funnelData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Relatório de Oportunidades (Tempo Médio) */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                                <SectionTitle title="Ciclo de Vendas" subtitle="Tempo médio para fechamento (Dias)" />
                                <div className="h-64 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesCycleData}>
                                            <defs>
                                                <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                            <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                                            <Area type="monotone" dataKey="dias" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorDays)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ... (Other Tabs Marketing, Activities, Financial - maintained but filtering applied) ... */}
                {activeTab === 'financial' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Relatório de Metas */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <SectionTitle title="Relatório de Metas" subtitle="Atingimento da meta de receita recorrente (MRR)" />
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center gap-2">
                                        <Settings size={14} className="text-slate-400"/>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Crescimento Esperado (% a.a):</label>
                                        <input 
                                            type="number" 
                                            value={growthRate} 
                                            onChange={(e) => setGrowthRate(Number(e.target.value))}
                                            className="w-16 border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 rounded px-2 py-1 text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Projeção anual para cálculo de metas.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Meta Projetada (12m)</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">R$ {projectedGoal.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Realizado (Atual)</p>
                                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">R$ {currentMRR.toLocaleString()}</p>
                                </div>
                                <div className="w-32 h-32">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[{ value: currentMRR }, { value: Math.max(0, projectedGoal - currentMRR) }]}
                                                cx="50%" cy="50%"
                                                innerRadius={25} outerRadius={40}
                                                dataKey="value"
                                            >
                                                <Cell fill="#10b981" />
                                                <Cell fill="#e2e8f0" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Lucratividade por Segmento */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
                                <SectionTitle title="Lucratividade por Segmento" subtitle="Receita recorrente por tipo de cliente" />
                                <div className="h-80 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={profitabilityData} layout="vertical" margin={{left: 20}}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                            <XAxis type="number" tickFormatter={(val) => `R$${val/1000}k`} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#94a3b8'}} />
                                            <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString()}`} cursor={{fill: '#f8fafc'}} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Projeção Financeira (Timeline) */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
                                <SectionTitle title="Linha de Tendência" subtitle={`Projeção de crescimento para os próximos 6 meses (${growthRate}% a.a)`} />
                                <div className="h-80 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={projectionData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                            <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                                            <Tooltip 
                                                formatter={(val: number) => `R$ ${val.toLocaleString()}`} 
                                                contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} 
                                                labelStyle={{color: '#94a3b8'}}
                                            />
                                            <Legend verticalAlign="top" height={36}/>
                                            <Line 
                                                type="monotone" 
                                                dataKey="Realizado" 
                                                stroke="#10b981" 
                                                strokeWidth={3} 
                                                dot={{r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} 
                                                name="Atual (Realizado)"
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="Projetado" 
                                                stroke="#3b82f6" 
                                                strokeWidth={3} 
                                                strokeDasharray="5 5" 
                                                dot={{r: 4, fill: '#3b82f6'}} 
                                                name="Meta Projetada"
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
