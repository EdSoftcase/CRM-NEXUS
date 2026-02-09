
import React, { useState, useMemo } from 'react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Area, AreaChart, Sector
} from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { LeadStatus } from '../types';
import { SectionTitle, Badge } from '../components/Widgets';
import { 
    TrendingUp, DollarSign, Wrench, Target, Zap, PieChart as PieIcon, RefreshCw,
    Activity, Users, AlertCircle, BarChart3, ArrowUpRight, ListTodo, ShieldCheck
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

// Componente customizado para fatias ativas no Donut (Estilo Imagem Anexo)
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12} fill={fill} />
    </g>
  );
};

export const Reports: React.FC = () => {
    const { leads = [], clients = [], tickets = [], projects = [] } = useData();
    const [activeTab, setActiveTab] = useState<'bi' | 'financial' | 'sales' | 'ops'>('bi');
    const [activeIndex, setActiveIndex] = useState(0);

    // --- DADOS ESTRATÉGICO / BI ---
    const revenueBySegmentData = useMemo(() => {
        const segments: Record<string, number> = {};
        clients.forEach(c => {
            const key = c.segment || 'Outros';
            segments[key] = (segments[key] || 0) + (c.ltv || 0);
        });
        return Object.entries(segments).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [clients]);

    // --- DADOS FINANCEIRO ---
    const financialGrowth = [
        { name: 'Jan', value: 4000 }, { name: 'Fev', value: 3000 },
        { name: 'Mar', value: 5000 }, { name: 'Abr', value: 4500 },
        { name: 'Mai', value: 7000 }, { name: 'Jun', value: 8500 }
    ];

    // --- DADOS VENDAS ---
    const pipelineData = useMemo(() => [
        { name: 'Prospects', value: leads.filter(l => l.status === LeadStatus.NEW).length, color: '#3b82f6' },
        { name: 'Qualificados', value: leads.filter(l => l.status === LeadStatus.QUALIFIED).length, color: '#6366f1' },
        { name: 'Proposta', value: leads.filter(l => l.status === LeadStatus.PROPOSAL).length, color: '#8b5cf6' },
        { name: 'Fechados', value: leads.filter(l => l.status === LeadStatus.CLOSED_WON).length, color: '#10b981' },
    ], [leads]);

    // --- DADOS PRODUÇÃO / OPS ---
    const opsData = useMemo(() => [
        { name: 'Kitting', value: projects.filter(p => p.status === 'Kitting').length },
        { name: 'Montagem', value: projects.filter(p => p.status === 'Assembly').length },
        { name: 'Execução', value: projects.filter(p => p.status === 'Execution').length },
        { name: 'Concluído', value: projects.filter(p => p.status === 'Completed').length },
    ], [projects]);

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-[#f1f5f9] dark:bg-slate-950 transition-colors overflow-hidden font-sans">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none italic">
                        RELATÓRIOS <span className="text-indigo-600 dark:text-indigo-400">GERENCIAIS</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Visão Consolidada Enterprise</p>
                </div>
                
                {/* Menu Superior - Estilo Imagem Anexo */}
                <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-[1.5rem] border shadow-xl">
                    {[
                        { id: 'bi', label: 'Estratégico', icon: Target },
                        { id: 'financial', label: 'Financeiro', icon: DollarSign },
                        { id: 'sales', label: 'Vendas', icon: TrendingUp },
                        { id: 'ops', label: 'Produção', icon: Wrench },
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl scale-[1.05]' : 'text-slate-400 hover:text-indigo-600'}`}
                        >
                            <tab.icon size={14}/> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12">
                {/* ABA ESTRATÉGICO / BI */}
                {activeTab === 'bi' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white dark:border-slate-800 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-[-20px] right-[-20px] opacity-5 text-indigo-500 group-hover:scale-110 transition-transform duration-1000"><PieIcon size={200}/></div>
                            <SectionTitle title="Market Distribution" subtitle="Receita por Vertical" />
                            <div className="flex-1 h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            activeIndex={activeIndex}
                                            activeShape={renderActiveShape}
                                            data={revenueBySegmentData}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={85}
                                            dataKey="value"
                                            onMouseEnter={(_, index) => setActiveIndex(index)}
                                            stroke="none" paddingAngle={8}
                                        >
                                            {revenueBySegmentData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white dark:border-slate-800">
                             <SectionTitle title="Performance Global" subtitle="Indicadores de Saúde da Operação" />
                             <div className="grid grid-cols-2 gap-6 mt-8">
                                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                                    <div className="absolute right-[-10px] top-[-10px] opacity-5 text-indigo-600"><Target size={120}/></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ticket Médio</p>
                                    <h4 className="text-4xl font-black text-indigo-600">R$ 1.420</h4>
                                    <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1"><ArrowUpRight size={14}/> +4.2% este mês</p>
                                </div>
                                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                                    <div className="absolute right-[-10px] top-[-10px] opacity-5 text-red-600"><AlertCircle size={120}/></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Churn Rate</p>
                                    <h4 className="text-4xl font-black text-red-500">2.4%</h4>
                                    <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1">Dentro da meta aceitável</p>
                                </div>
                             </div>
                             <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between text-white">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-500 rounded-2xl"><Zap size={24}/></div>
                                    <div><p className="text-xs font-bold opacity-60">Status da Esteira</p><h5 className="font-black uppercase tracking-tight">Operação em Alta Performance</h5></div>
                                </div>
                                <ArrowUpRight className="text-indigo-400" size={32}/>
                             </div>
                        </div>
                    </div>
                )}

                {/* ABA FINANCEIRO */}
                {activeTab === 'financial' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800 flex items-center gap-6">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-[1.5rem]"><DollarSign size={32}/></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita (MRR)</p><h3 className="text-3xl font-black">R$ 485.400</h3></div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800 flex items-center gap-6">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-[1.5rem]"><Activity size={32}/></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inadimplência</p><h3 className="text-3xl font-black">R$ 12.450</h3></div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800 flex items-center gap-6">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.5rem]"><TrendingUp size={32}/></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crescimento</p><h3 className="text-3xl font-black text-indigo-600">+12.8%</h3></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[4rem] shadow-2xl border border-white dark:border-slate-800">
                             <SectionTitle title="Fluxo de Receita" subtitle="Evolução semestral de novos contratos" />
                             <div className="h-96 mt-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={financialGrowth}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                        <YAxis hide />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    </div>
                )}

                {/* ABA VENDAS */}
                {activeTab === 'sales' && (
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white dark:border-slate-800 animate-fade-in flex flex-col lg:flex-row gap-12">
                        <div className="lg:w-1/3 flex flex-col justify-center">
                            <SectionTitle title="Pipeline Comercial" subtitle="Estágios ativos no funil" />
                            <p className="text-slate-500 text-sm leading-relaxed mt-4">Análise volumétrica de oportunidades por estágio. Otimização contínua de taxas de conversão entre Proposta e Fechamento.</p>
                            <div className="mt-8 space-y-4">
                                {pipelineData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                                            <span className="text-[10px] font-black uppercase text-slate-500">{d.name}</span>
                                        </div>
                                        <span className="font-black text-slate-900 dark:text-white">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 h-[500px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', textTransform: 'uppercase'}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={80}>
                                        {pipelineData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ABA PRODUÇÃO */}
                {activeTab === 'ops' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white dark:border-slate-800">
                             <SectionTitle title="Carga de Produção" subtitle="Projetos ativos por estágio operacional" />
                             <div className="h-80 mt-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={opsData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white/10 text-white flex flex-col justify-between">
                             <div>
                                <SectionTitle title="SLA de Atendimento" subtitle="Média de resolução por nível" />
                                <div className="mt-10 space-y-8">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-black uppercase mb-3">
                                            <span className="flex items-center gap-2"><ShieldCheck className="text-emerald-500" size={14}/> Nível 1 (Crítico)</span>
                                            <span className="text-emerald-500">98% dentro do prazo</span>
                                        </div>
                                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-emerald-500 w-[98%] transition-all duration-1000"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-black uppercase mb-3">
                                            <span className="flex items-center gap-2"><RefreshCw className="text-blue-500" size={14}/> Nível 2 (Médio)</span>
                                            <span className="text-blue-500">85% dentro do prazo</span>
                                        </div>
                                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-blue-500 w-[85%] transition-all duration-1000"></div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                             <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between mt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-500 text-slate-900 rounded-2xl font-black text-xs">AI</div>
                                    <p className="text-xs font-medium text-slate-400 italic">Predição: Aumento de 15% na carga para o próximo ciclo.</p>
                                </div>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
