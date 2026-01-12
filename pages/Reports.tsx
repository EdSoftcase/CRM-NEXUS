
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, Area, AreaChart, 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LeadStatus, Project, InvoiceStatus } from '../types';
import { SectionTitle, KPICard, Badge } from '../components/Widgets';
import { 
    TrendingUp, BrainCircuit, Activity, Users, AlertCircle, 
    DollarSign, Sparkles, Send, Wrench, Target, CheckCircle, 
    Clock, BarChart3, Zap, ShieldCheck, PieChart as PieIcon,
    ArrowUpRight, ListTodo, Lightbulb
} from 'lucide-react';
import { analyzeBusinessData } from '../services/geminiService';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export const Reports: React.FC = () => {
    const { leads = [], clients = [], tickets = [], invoices = [], campaigns = [], projects = [] } = useData();
    const { currentUser } = useAuth();
    
    // UI State
    const [activeTab, setActiveTab] = useState<'sales' | 'ops' | 'financial' | 'bi' | 'insights'>('bi');
    
    // AI Chat State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([
        { role: 'ai', text: 'Olá! Sou o Soft BI. Como posso ajudar você a analisar os dados da Soft Case hoje?' }
    ]);

    const chatEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

    // --- DATA PREPARATION ---
    
    const currentMRR = useMemo(() => (clients || []).filter(c => c?.status === 'Active').reduce((acc, c) => acc + (c?.totalSpecialPrice || c?.ltv || 0), 0), [clients]);
    
    const revenueBySegmentData = useMemo(() => {
        const targetCategories = [
            'Estacionamento', 
            'Valets', 
            'Piscina de Bolinha', 
            'Shopping', 
            'Condomínio', 
            'Parque', 
            'Residencial'
        ];
        
        const segments: Record<string, number> = {};
        
        (clients || []).forEach(c => {
            if (!c) return;
            const clientSeg = (c.segment || '').trim();
            const matchedCategory = targetCategories.find(cat => 
                cat.toLowerCase() === clientSeg.toLowerCase() || 
                clientSeg.toLowerCase().includes(cat.toLowerCase())
            );
            
            const finalKey = matchedCategory || 'Outros';
            const value = (c.totalSpecialPrice || c.ltv || 0);
            
            if (value > 0) {
                segments[finalKey] = (segments[finalKey] || 0) + value;
            }
        });

        return Object.entries(segments)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [clients]);

    const radarData = useMemo(() => [
        { subject: 'Vendas', A: Math.min(100, (leads || []).filter(l => l?.status === LeadStatus.CLOSED_WON).length * 15), fullMark: 100 },
        { subject: 'Mkt', A: Math.min(100, (campaigns || []).length * 20), fullMark: 100 },
        { subject: 'Suporte', A: Math.max(20, 100 - ((tickets || []).filter(t => t?.status === 'Aberto').length * 10)), fullMark: 100 },
        { subject: 'Retenção', A: (clients || []).filter(c => c?.status === 'Active').length > 0 ? 85 : 0, fullMark: 100 },
        { subject: 'Projetos', A: (projects || []).length > 0 ? Math.round(projects.reduce((acc, p) => acc + (p?.progress || 0), 0) / projects.length) : 0, fullMark: 100 },
    ], [leads, campaigns, tickets, clients, projects]);

    const pipelineData = useMemo(() => [
        { name: 'Novos', value: (leads || []).filter(l => l?.status === LeadStatus.NEW).length },
        { name: 'Qualif.', value: (leads || []).filter(l => l?.status === LeadStatus.QUALIFIED).length },
        { name: 'Proposta', value: (leads || []).filter(l => l?.status === LeadStatus.PROPOSAL).length },
        { name: 'Negoc.', value: (leads || []).filter(l => l?.status === LeadStatus.NEGOTIATION).length },
        { name: 'Ganhos', value: (leads || []).filter(l => l?.status === LeadStatus.CLOSED_WON).length },
    ], [leads]);

    const opsData = useMemo(() => [
        { name: 'Kitting', value: (projects || []).filter(p => p?.status === 'Kitting').length },
        { name: 'Montagem', value: (projects || []).filter(p => p?.status === 'Assembly').length },
        { name: 'Execução', value: (projects || []).filter(p => p?.status === 'Execution').length },
        { name: 'Finalizado', value: (projects || []).filter(p => p?.status === 'Completed').length },
    ], [projects]);

    const financialComparisonData = useMemo(() => [
        { name: 'Previsto', value: (invoices || []).reduce((acc, i) => acc + (i?.amount || 0), 0) },
        { name: 'Realizado', value: (invoices || []).filter(i => i?.status === InvoiceStatus.PAID).reduce((acc, i) => acc + (i?.amount || 0), 0) },
        { name: 'Atrasado', value: (invoices || []).filter(i => i?.status === InvoiceStatus.OVERDUE).reduce((acc, i) => acc + (i?.amount || 0), 0) },
    ], [invoices]);

    const handleSendQuery = async () => {
        if (!chatQuery.trim()) return;
        const userMsg = chatQuery;
        setChatQuery('');
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsAnalyzing(true);
        
        try {
            const context = { 
                mrr: currentMRR, 
                totalLeads: leads.length, 
                activeProjects: projects.length,
                criticalTickets: tickets.filter(t => t.priority === 'Crítica').length,
                segments: revenueBySegmentData
            };
            const response = await analyzeBusinessData(context, userMsg);
            setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'ai', text: "Desculpe, tive um problema ao processar os dados. Tente novamente." }]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden font-sans">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Central de Relatórios</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Análise estratégica em tempo real da Soft Case Tecnologia.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border shadow-sm">
                        {[
                            { id: 'bi', label: 'B.I.', icon: Target },
                            { id: 'sales', label: 'Vendas', icon: TrendingUp },
                            { id: 'ops', label: 'Produção', icon: Wrench },
                            { id: 'financial', label: 'Financeiro', icon: DollarSign },
                            { id: 'insights', label: 'Insights', icon: Sparkles },
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition ${activeTab === tab.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                <tab.icon size={14}/> <span className="hidden xl:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12">
                {activeTab === 'bi' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                            <SectionTitle title="Radar de Performance" subtitle="Equilíbrio operacional 360°" />
                            <div className="w-full h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                                        <Radar name="Soft Case" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-2 flex flex-col bg-white dark:bg-slate-800 rounded-[2.5rem] border border-indigo-100 dark:border-slate-700 shadow-xl overflow-hidden min-h-[500px]">
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/30 border-b flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><BrainCircuit size={24}/></div>
                                    <div>
                                        <h3 className="font-black text-indigo-900 dark:text-white uppercase tracking-tighter">Soft BI Chat</h3>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Motor de Inteligência Ativo</p>
                                    </div>
                                </div>
                                <Badge color="blue">Online</Badge>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-600 rounded-bl-none'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isAnalyzing && <div className="flex gap-1 p-2"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div></div>}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-4 border-t bg-white dark:bg-slate-800">
                                <div className="relative flex items-center">
                                    <input 
                                        className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-2xl pl-6 pr-14 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                        placeholder="Pergunte sobre faturamento, leads ou performance..."
                                        value={chatQuery}
                                        onChange={e => setChatQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendQuery()}
                                    />
                                    <button onClick={handleSendQuery} className="absolute right-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg"><Send size={18}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-[450px]">
                            <SectionTitle title="Receita por Segmento" subtitle="Distribuição do LTV Mensal" />
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={revenueBySegmentData} 
                                            innerRadius={60} 
                                            outerRadius={100} 
                                            paddingAngle={5} 
                                            dataKey="value"
                                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {revenueBySegmentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString()}`} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-[450px]">
                            <SectionTitle title="Status de Cobrança" subtitle="Realizado vs Pendente vs Atrasado" />
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={financialComparisonData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString()}`} />
                                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                                            {financialComparisonData.map((entry, index) => (
                                                <Cell key={index} fill={index === 1 ? '#10b981' : index === 2 ? '#ef4444' : '#6366f1'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ops' && (
                    <div className="grid grid-cols-1 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-[500px]">
                            <SectionTitle title="Gargalos de Produção" subtitle="Projetos ativos por estágio operacional" />
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={opsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sales' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-[450px]">
                            <SectionTitle title="Funil de Vendas" subtitle="Volume de leads por estágio do CRM" />
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-white flex flex-col justify-center relative overflow-hidden shadow-2xl shadow-indigo-500/30">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={180}/></div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Performance Comercial</h3>
                            <p className="text-indigo-100 text-lg leading-relaxed max-w-md">Branding Soft Case: A taxa de conversão atual entre Proposta e Ganho é de <strong className="text-white">{((leads || []).filter(l=>l?.status === 'Ganho').length / ((leads || []).filter(l=>l?.status === 'Proposta').length || 1) * 100).toFixed(0)}%</strong>.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
