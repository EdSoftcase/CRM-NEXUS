
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, ComposedChart, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LabelList } from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LeadStatus, Lead, TicketStatus, TicketPriority } from '../types';
import { SectionTitle, KPICard, Badge } from '../components/Widgets';
import { 
    BarChart2, TrendingUp, BrainCircuit, Target, PieChart as PieIcon, 
    Activity, Users, AlertCircle, DollarSign, Calendar, CheckCircle, 
    Briefcase, Search, Filter, Phone, Mail, MessageSquare, Clock, Settings, Sparkles, Send, CalendarDays,
    LayoutTemplate, Plus, GripVertical, Trash2, FileDown, FileSpreadsheet, Download, X, Megaphone, Wrench, Timer
} from 'lucide-react';
import { analyzeBusinessData } from '../services/geminiService';
import * as XLSX from 'xlsx';

export const Reports: React.FC = () => {
    const { leads, clients, activities, tickets, invoices, campaigns, projects } = useData();
    const { currentUser } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'sales' | 'marketing' | 'activities' | 'financial' | 'insights' | 'bi' | 'ops'>('sales');
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'year'>('30d');
    const [growthRate, setGrowthRate] = useState(35);

    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([
        { role: 'ai', text: 'Olá! Sou o Nexus BI. Tenho acesso aos dados consolidados da sua empresa. Pergunte algo como "Qual o melhor canal de vendas?" ou "Quais clientes têm risco de churn?".' }
    ]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, activeTab]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

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

    const filteredLeads = leads.filter(l => filterByDate(l.createdAt));
    const funnelData = useMemo(() => [
        { name: 'Novo', value: filteredLeads.filter(l => l.status === LeadStatus.NEW).length, fill: '#3b82f6' },
        { name: 'Qualificado', value: filteredLeads.filter(l => l.status === LeadStatus.QUALIFIED).length, fill: '#6366f1' },
        { name: 'Proposta', value: filteredLeads.filter(l => l.status === LeadStatus.PROPOSAL).length, fill: '#8b5cf6' },
        { name: 'Negociação', value: filteredLeads.filter(l => l.status === LeadStatus.NEGOTIATION).length, fill: '#d946ef' },
        { name: 'Fechado (Ganho)', value: filteredLeads.filter(l => l.status === LeadStatus.CLOSED_WON).length, fill: '#10b981' },
    ], [filteredLeads]);

    const wonLeads = filteredLeads.filter(l => l.status === LeadStatus.CLOSED_WON);
    const winRate = filteredLeads.length > 0 ? ((wonLeads.length / filteredLeads.length) * 100).toFixed(1) : 0;
    const totalWonValue = wonLeads.reduce((acc, l) => acc + l.value, 0);
    const avgDealSize = wonLeads.length > 0 ? totalWonValue / wonLeads.length : 0;

    const opsData = useMemo(() => {
        const stages = ['Planning', 'Kitting', 'Assembly', 'Execution', 'Review'];
        const stageTotals: Record<string, { sum: number, count: number }> = {};
        stages.forEach(s => stageTotals[s] = { sum: 0, count: 0 });

        projects.forEach(p => {
            if (p.stageHistory) {
                p.stageHistory.forEach(entry => {
                    if (entry.durationDays !== undefined && stageTotals[entry.stage]) {
                        stageTotals[entry.stage].sum += entry.durationDays;
                        stageTotals[entry.stage].count += 1;
                    }
                });
            }
        });

        return stages.map(s => ({
            name: s === 'Planning' ? 'Planejamento' : s === 'Kitting' ? 'Kitting' : s === 'Assembly' ? 'Montagem' : s === 'Execution' ? 'Instalação' : 'Revisão',
            dias: stageTotals[s].count > 0 ? Number((stageTotals[s].sum / stageTotals[s].count).toFixed(1)) : 0
        }));
    }, [projects]);

    const currentMRR = clients.filter(c => c.status === 'Active').reduce((acc, c) => acc + (c.totalTablePrice || c.ltv || 0), 0);
    const projectedGoal = currentMRR * (1 + growthRate / 100);

    const projectionData = useMemo(() => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        const data = [];
        let projectedValue = currentMRR;
        const monthlyRate = (growthRate / 100) / 12;
        for (let i = 0; i < 6; i++) {
            data.push({ name: months[i], Realizado: i === 0 ? currentMRR : null, Projetado: Math.round(projectedValue) });
            projectedValue = projectedValue * (1 + monthlyRate);
        }
        return data;
    }, [currentMRR, growthRate]);

    const radarData = useMemo(() => [
        { subject: 'Vendas', A: Math.min(Number(winRate) * 2, 100) || 50, fullMark: 100 },
        { subject: 'Marketing', A: Math.min(campaigns.length * 10, 100) || 40, fullMark: 100 },
        { subject: 'Suporte', A: 80, fullMark: 100 },
        { subject: 'Financeiro', A: Math.min((currentMRR / 50000) * 100, 100) || 60, fullMark: 100 },
        { subject: 'CS / NPS', A: 85, fullMark: 100 },
    ], [winRate, campaigns, currentMRR]);

    const handleSendQuery = async () => {
        if (!chatQuery.trim()) return;
        const userMsg = chatQuery;
        setChatQuery('');
        setChatHistory(prev => [...prev, {role: 'user', text: userMsg}]);
        setIsAnalyzing(true);
        try {
            const contextData = { periodo: timeRange, mrr: currentMRR, leads: filteredLeads.length, cycle_time: opsData };
            const response = await analyzeBusinessData(contextData, userMsg);
            setChatHistory(prev => [...prev, {role: 'ai', text: response}]);
        } catch (error) { setChatHistory(prev => [...prev, {role: 'ai', text: "Erro ao analisar dados."}]); } finally { setIsAnalyzing(false); }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Central de Relatórios</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Análise estratégica baseada em dados reais.</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex">
                        <button onClick={() => setTimeRange('7d')} className={`px-3 py-1 text-xs font-bold rounded ${timeRange === '7d' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>7D</button>
                        <button onClick={() => setTimeRange('30d')} className={`px-3 py-1 text-xs font-bold rounded ${timeRange === '30d' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>30D</button>
                        <button onClick={() => setTimeRange('year')} className={`px-3 py-1 text-xs font-bold rounded ${timeRange === 'year' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>Ano</button>
                    </div>
                    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 w-full md:w-auto overflow-x-auto custom-scrollbar">
                        <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'sales' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500'}`}><TrendingUp size={16}/> Vendas</button>
                        <button onClick={() => setActiveTab('ops')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'ops' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 'text-slate-500'}`}><Wrench size={16}/> Produção</button>
                        <button onClick={() => setActiveTab('financial')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'financial' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-500'}`}><DollarSign size={16}/> Financeiro</button>
                        <button onClick={() => setActiveTab('bi')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'bi' ? 'bg-amber-50 text-amber-700' : 'text-slate-500'}`}><LayoutTemplate size={16}/> B.I.</button>
                        <button onClick={() => setActiveTab('insights')} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'insights' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}><Sparkles size={16}/> Insights</button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                {activeTab === 'insights' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                            <SectionTitle title="Radar do Negócio" subtitle="Performance consolidada" />
                            <div className="w-full h-64 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Performance" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} /><Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="lg:col-span-2 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-slate-700 overflow-hidden min-h-[400px]">
                            <div className="p-4 bg-indigo-50 dark:bg-slate-900 border-b border-indigo-100 flex items-center gap-4 shrink-0">
                                <div className="bg-white p-3 rounded-full text-indigo-600"><BrainCircuit size={24} /></div>
                                <div><h2 className="text-lg font-bold text-indigo-900 dark:text-white">Nexus BI - Inteligência</h2></div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-700 border border-slate-200 rounded-bl-none'}`}>
                                            <div className="whitespace-pre-wrap">{msg.text}</div>
                                        </div>
                                    </div>
                                ))}
                                {isAnalyzing && <div className="flex space-x-1"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div></div>}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200">
                                <div className="relative">
                                    <input type="text" className="w-full border border-slate-300 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-700 dark:text-white" placeholder="Digite sua pergunta..." value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}/>
                                    <button onClick={handleSendQuery} className="absolute right-2 top-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg"><Send size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ops' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <KPICard title="Projetos Ativos" value={projects.filter(p => !p.archived).length.toString()} icon={Wrench} color="bg-blue-500" trend="Snapshot atual" />
                            <KPICard title="Lead Time Médio" value={`${(opsData.reduce((acc, c) => acc + c.dias, 0)).toFixed(1)} dias`} icon={Timer} color="bg-yellow-500" trend="Cycle Time Total" />
                            <KPICard title="Gargalos Ativos" value={projects.filter(p => {
                                if(p.archived) return false;
                                const diff = Math.abs(new Date().getTime() - new Date(p.statusUpdatedAt || p.startDate).getTime());
                                return (diff / (1000*60*60*24)) >= 3;
                            }).length.toString()} icon={AlertCircle} color="bg-red-500" trend="Estagnados há 3d+" trendUp={false} />
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
                            <SectionTitle title="Lead Time por Fase (Cycle Time)" subtitle="Média de dias de permanência em cada estágio do projeto" />
                            <div className="h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={opsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} label={{ value: 'Dias', position: 'bottom', offset: 0 }} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                        <Bar dataKey="dias" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={30}>
                                            <LabelList dataKey="dias" position="right" fill="#64748b" fontSize={11} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sales' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <KPICard title="Vendas Ganhas" value={wonLeads.length.toString()} icon={CheckCircle} color="bg-emerald-500" trend={`${winRate}% Conversão`} trendUp={true}/>
                            <KPICard title="Ticket Médio" value={`R$ ${avgDealSize.toLocaleString()}`} icon={PieIcon} color="bg-purple-500" />
                            <KPICard title="Pipeline" value={`R$ ${filteredLeads.reduce((acc,l)=>acc+l.value,0).toLocaleString()}`} icon={DollarSign} color="bg-blue-500" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[350px]">
                            <SectionTitle title="Funil de Vendas" subtitle="Oportunidades por estágio" />
                            <div className="h-64 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={funnelData} layout="vertical">
                                        <XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} /><Tooltip />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>{funnelData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'financial' && (
                    <div className="space-y-6">
                        <KPICard title="Meta MRR" value={`R$ ${projectedGoal.toLocaleString()}`} icon={DollarSign} color="bg-emerald-500" trend={`${growthRate}% Crescimento`} />
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 shadow-sm">
                            <SectionTitle title="Projeção Financeira" subtitle="Linha de tendência 6 meses" />
                            <div className="h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={projectionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={(v)=>`R$${v/1000}k`} /><Tooltip />
                                        <Line type="monotone" dataKey="Realizado" stroke="#10b981" strokeWidth={3} dot={{r: 6}} />
                                        <Line type="monotone" dataKey="Projetado" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
